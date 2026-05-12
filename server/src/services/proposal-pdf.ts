import PDFDocument from 'pdfkit';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import type { ProposalData } from '../../../shared/proposal-templates.js';

// ─── Layout constants ───
const A4 = { width: 595.28, height: 841.89 };
const MM = 2.83465;
const MARGIN = 22 * MM;

// ─── Brand palette ───
const C = {
  bg:       '#0a0807',
  card:     '#161311',
  orange:   '#f58327',
  orangeDk: '#d96d18',
  offWhite: '#f8f8f5',
  white:    '#ffffff',
  midGray:  '#8a8580',
  lightGray:'#c9c4be',
  border:   '#2a2522',
  borderLt: '#3a3530',
};

// ─── Font loading ───
const FONT_DIR = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  // dev/dist layouts both resolve to <root>/server/assets/fonts
  for (const candidate of [
    join(here, '..', 'assets', 'fonts'),       // server/src/services → server/assets/fonts
    join(here, '..', '..', 'assets', 'fonts'), // server/dist/services → server/assets/fonts
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return join(here, '..', 'assets', 'fonts');
})();

const FONT_PATHS: Record<string, string> = {
  Manrope:       join(FONT_DIR, 'Manrope-Regular.ttf'),
  ManropeMed:    join(FONT_DIR, 'Manrope-Medium.ttf'),
  ManropeSemi:   join(FONT_DIR, 'Manrope-SemiBold.ttf'),
  ManropeBold:   join(FONT_DIR, 'Manrope-Bold.ttf'),
  ManropeBlack:  join(FONT_DIR, 'Manrope-ExtraBold.ttf'),
};

function registerFonts(doc: PDFKit.PDFDocument) {
  for (const [name, path] of Object.entries(FONT_PATHS)) {
    if (existsSync(path)) {
      try {
        doc.registerFont(name, readFileSync(path));
      } catch {
        // ignore — caller will fall back to Helvetica.
      }
    }
  }
}

function font(doc: PDFKit.PDFDocument, name: keyof typeof FONT_PATHS): PDFKit.PDFDocument {
  if (existsSync(FONT_PATHS[name])) return doc.font(name);
  return doc.font('Helvetica');
}

// ─── Helpers ───
function setFill(doc: PDFKit.PDFDocument, color: string, opacity = 1) {
  doc.fillColor(color, opacity);
  return doc;
}
function setStroke(doc: PDFKit.PDFDocument, color: string, opacity = 1) {
  doc.strokeColor(color, opacity);
  return doc;
}

function drawRadialGlow(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  maxRadius: number,
  color: string,
  maxAlpha = 0.35,
  steps = 60,
) {
  doc.save();
  for (let i = steps; i > 0; i--) {
    const radius = maxRadius * (i / steps);
    const alpha = maxAlpha * Math.pow((steps - i + 1) / steps, 2.5);
    doc.circle(cx, cy, radius).fillOpacity(alpha).fillColor(color).fill();
  }
  doc.fillOpacity(1);
  doc.restore();
}

function drawLogoX(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  const half = size / 2;
  doc.save();
  doc
    .strokeColor(color)
    .lineWidth(size * 0.25)
    .lineCap('butt');
  doc.moveTo(cx - half, cy - half).lineTo(cx + half, cy + half).stroke();
  doc.moveTo(cx - half, cy + half).lineTo(cx + half, cy - half).stroke();
  doc.restore();
}

function drawStar(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  doc.save();
  doc.fillColor(color);
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? size : size * 0.4;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) doc.moveTo(x, y);
    else doc.lineTo(x, y);
  }
  doc.closePath().fill();
  doc.restore();
}

// Parses {orange:...} markup into typed runs.
type Run = { text: string; color: string };
function parseRuns(html: string, baseColor: string): Run[] {
  const runs: Run[] = [];
  let rest = html;
  const re = /\{orange:([^}]+)\}/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rest)) !== null) {
    if (m.index > lastIdx) runs.push({ text: rest.slice(lastIdx, m.index), color: baseColor });
    runs.push({ text: m[1]!, color: C.orange });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < rest.length) runs.push({ text: rest.slice(lastIdx), color: baseColor });
  return runs;
}

// Lays out mixed-color text within [x, x+width] starting at y, returns ending y.
function drawMixedText(
  doc: PDFKit.PDFDocument,
  runs: Run[],
  x: number,
  y: number,
  maxWidth: number,
  fontName: keyof typeof FONT_PATHS,
  fontSize: number,
  lineHeight: number,
): number {
  font(doc, fontName).fontSize(fontSize);
  // Build word stream with colors preserved.
  type Word = { text: string; color: string; space: boolean };
  const words: Word[] = [];
  for (const r of runs) {
    const parts = r.text.split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      if (/^\s+$/.test(p)) {
        const last = words[words.length - 1];
        if (last) last.space = true;
      } else {
        words.push({ text: p, color: r.color, space: false });
      }
    }
  }
  // Lay out lines.
  const lines: Word[][] = [[]];
  let lineWidth = 0;
  const spaceWidth = doc.widthOfString(' ');
  for (const w of words) {
    const ww = doc.widthOfString(w.text);
    const line = lines[lines.length - 1]!;
    const needsSpace = line.length > 0;
    const wWithSpace = (needsSpace ? spaceWidth : 0) + ww;
    if (lineWidth + wWithSpace > maxWidth && line.length > 0) {
      lines.push([w]);
      lineWidth = ww;
    } else {
      line.push(w);
      lineWidth += wWithSpace;
    }
  }
  // Render.
  let curY = y;
  for (const line of lines) {
    let curX = x;
    for (let i = 0; i < line.length; i++) {
      const w = line[i]!;
      if (i > 0) curX += spaceWidth;
      setFill(doc, w.color);
      doc.text(w.text, curX, curY, { lineBreak: false });
      curX += doc.widthOfString(w.text);
    }
    curY += lineHeight;
  }
  return curY;
}

function wrapLines(doc: PDFKit.PDFDocument, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (doc.widthOfString(test) > maxWidth && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Plain wrapped text. Returns ending y. Doesn't trigger PDFKit auto-pagination.
function drawText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontName: keyof typeof FONT_PATHS,
  fontSize: number,
  color: string,
  lineHeight: number,
): number {
  font(doc, fontName).fontSize(fontSize);
  setFill(doc, color);
  const lines = wrapLines(doc, text, maxWidth);
  for (const line of lines) {
    doc.text(line, x, y, { lineBreak: false });
    y += lineHeight;
  }
  return y;
}

// ─── Page backgrounds ───
function paintCoverBackground(doc: PDFKit.PDFDocument, proposalDate: string) {
  doc.save();
  setFill(doc, C.bg).rect(0, 0, A4.width, A4.height).fill();
  drawRadialGlow(doc, A4.width * -0.25, A4.height * 1.2, 240 * MM, C.orange, 0.55);
  drawRadialGlow(doc, A4.width * 1.15, A4.height * 0.9, 150 * MM, C.orange, 0.35);
  // Logo top-left
  drawLogoX(doc, MARGIN + 6 * MM, MARGIN + 6 * MM, 11 * MM, C.orange);
  // Date top-right
  font(doc, 'ManropeMed').fontSize(8);
  setFill(doc, C.midGray).text(
    `TILBUD  ·  ${proposalDate.toUpperCase()}`,
    A4.width - MARGIN - 100 * MM,
    MARGIN + 4 * MM,
    { width: 100 * MM, align: 'right', lineBreak: false },
  );
  // Footer
  font(doc, 'ManropeMed').fontSize(8);
  setFill(doc, C.offWhite).text(
    'FX MEDIA  ·  fx-media.no  ·  info@fx-media.no  ·  +47 401 85 596',
    MARGIN,
    A4.height - 12 * MM - 4,
    { width: A4.width - 2 * MARGIN, lineBreak: false },
  );
  doc.restore();
}

function paintInnerBackground(
  doc: PDFKit.PDFDocument,
  clientName: string,
  pageNum: number,
) {
  doc.save();
  setFill(doc, C.bg).rect(0, 0, A4.width, A4.height).fill();
  drawRadialGlow(doc, A4.width * 1.05, A4.height * 0.05, 100 * MM, C.orange, 0.08);

  // Top strip
  const stripY = MARGIN / 2;
  drawLogoX(doc, MARGIN + 4 * MM, stripY + 3, 7 * MM, C.orange);
  font(doc, 'ManropeBold').fontSize(9);
  setFill(doc, C.offWhite).text('FX MEDIA', MARGIN + 11 * MM, stripY + 1, { lineBreak: false });
  font(doc, 'ManropeMed').fontSize(8);
  setFill(doc, C.midGray).text(
    `${clientName.toUpperCase()} · TILBUD`,
    A4.width - MARGIN - 100 * MM,
    stripY + 2,
    { width: 100 * MM, align: 'right', lineBreak: false },
  );
  // Strip divider
  setStroke(doc, C.border).lineWidth(0.5);
  doc.moveTo(MARGIN, stripY + 4 * MM).lineTo(A4.width - MARGIN, stripY + 4 * MM).stroke();

  // Footer
  font(doc, 'Manrope').fontSize(7.5);
  setFill(doc, C.midGray);
  doc.text(
    'FX MEDIA  ·  fx-media.no  ·  info@fx-media.no  ·  +47 401 85 596',
    MARGIN,
    A4.height - 12 * MM - 4,
    { width: A4.width - 2 * MARGIN, lineBreak: false },
  );
  doc.text(
    String(pageNum),
    A4.width - MARGIN - 30 * MM,
    A4.height - 12 * MM - 4,
    { width: 30 * MM, align: 'right', lineBreak: false },
  );
  doc.restore();
}

// ─── UI primitives ───
function eyebrow(doc: PDFKit.PDFDocument, text: string, x: number, y: number): number {
  font(doc, 'ManropeBold').fontSize(8.5);
  setFill(doc, C.orange);
  doc.text(text, x, y, { lineBreak: false });
  return y + 12;
}

function pillButton(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  opts: {
    width?: number;
    height?: number;
    bg?: string;
    fg?: string;
    fontName?: keyof typeof FONT_PATHS;
    fontSize?: number;
  } = {},
) {
  const width = opts.width ?? 70 * MM;
  const height = opts.height ?? 11 * MM;
  const bg = opts.bg ?? C.orange;
  const fg = opts.fg ?? C.bg;
  const fontName = opts.fontName ?? 'ManropeBold';
  const fontSize = opts.fontSize ?? 10.5;
  doc.save();
  setFill(doc, bg).roundedRect(x, y, width, height, height / 2).fill();
  font(doc, fontName).fontSize(fontSize);
  setFill(doc, fg);
  const tw = doc.widthOfString(text);
  doc.text(text, x + (width - tw) / 2, y + height / 2 - fontSize / 2 - 1, { lineBreak: false });
  doc.restore();
}

function starRow(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  count = 5,
  size = 4 * MM,
  gap = 1.2 * MM,
) {
  for (let i = 0; i < count; i++) {
    drawStar(doc, x + i * (size + gap) + size / 2, y + size / 2, size / 2, C.orange);
  }
}

function divider(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  color = C.border,
) {
  doc.save();
  setStroke(doc, color).lineWidth(0.5);
  doc.moveTo(x, y).lineTo(x + width, y).stroke();
  doc.restore();
}

// ─── Page builders ───
function buildCoverPage(doc: PDFKit.PDFDocument, data: ProposalData) {
  paintCoverBackground(doc, data.proposalDate);
  const contentX = MARGIN;
  const contentW = A4.width - 2 * MARGIN;

  // Vertical layout from a starting y
  let y = MARGIN + 50 * MM;

  y = eyebrow(doc, data.eyebrow, contentX, y);
  y += 4 * MM;

  // Hero headline (mixed white/orange)
  const heroRuns = parseRuns(data.heroHtml, C.offWhite);
  y = drawMixedText(doc, heroRuns, contentX, y, contentW, 'ManropeBlack', 38, 42);
  y += 4 * MM;

  y = drawText(
    doc,
    data.sublead,
    contentX,
    y,
    contentW * 0.85,
    'ManropeMed',
    12,
    C.lightGray,
    18,
  );
  y += 8 * MM;

  // CTA + reviews badge side by side
  const ctaY = y;
  pillButton(doc, 'KOM I GANG  →', contentX, ctaY, {
    width: 55 * MM,
    height: 12 * MM,
    fontSize: 10.5,
  });

  // Reviews badge: outlined box with star row + label
  const badgeX = contentX + 60 * MM;
  const badgeY = ctaY;
  const badgeW = 80 * MM;
  const badgeH = 14 * MM;
  doc.save();
  setStroke(doc, C.borderLt).lineWidth(0.75);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3 * MM).stroke();
  font(doc, 'ManropeBold').fontSize(7);
  setFill(doc, C.offWhite).text('ANMELDELSER FRA EKTE KUNDER', badgeX + 4 * MM, badgeY + 2 * MM, {
    width: badgeW - 8 * MM,
    lineBreak: false,
  });
  starRow(doc, badgeX + 4 * MM, badgeY + 6 * MM, 5, 3 * MM, 0.8 * MM);
  font(doc, 'Manrope').fontSize(7);
  setFill(doc, C.midGray).text(
    '5,0 · Google & Facebook',
    badgeX + 4 * MM + 5 * (3 * MM + 0.8 * MM) + 2 * MM,
    badgeY + 7 * MM,
    { lineBreak: false },
  );
  doc.restore();
  y = ctaY + 18 * MM;

  // Big spacer to push the info row down
  const infoY = A4.height - MARGIN - 70 * MM;

  // Horizontal divider above the info row
  divider(doc, contentX, infoY - 6 * MM, contentW, C.borderLt);

  // Info row: For / Kontakt / Utarbeidet av
  const col = contentW / 3;
  font(doc, 'ManropeBold').fontSize(7.5);
  setFill(doc, C.midGray);
  doc.text('FOR', contentX, infoY, { lineBreak: false });
  doc.text('KONTAKT', contentX + col, infoY, { lineBreak: false });
  doc.text('UTARBEIDET AV', contentX + 2 * col, infoY, { lineBreak: false });
  font(doc, 'ManropeBold').fontSize(13);
  setFill(doc, C.offWhite);
  doc.text(data.clientName, contentX, infoY + 6 * MM, { width: col - 4 * MM, lineBreak: false });
  doc.text(data.clientContact, contentX + col, infoY + 6 * MM, {
    width: col - 4 * MM,
    lineBreak: false,
  });
  doc.text('Xander · FX Media', contentX + 2 * col, infoY + 6 * MM, {
    width: col - 4 * MM,
    lineBreak: false,
  });
}

function buildDeliverablesPage(doc: PDFKit.PDFDocument, data: ProposalData) {
  doc.addPage({ size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  paintInnerBackground(doc, data.clientName, 2);

  const contentX = MARGIN;
  const contentW = A4.width - 2 * MARGIN;
  let y = MARGIN + 18 * MM;

  y = eyebrow(doc, 'HVA ER INKLUDERT', contentX, y);
  y += 4 * MM;

  const heroRuns = parseRuns('Alt du trenger for å {orange:komme i gang}', C.offWhite);
  y = drawMixedText(doc, heroRuns, contentX, y, contentW, 'ManropeBlack', 26, 30);
  y += 4 * MM;

  y = drawText(
    doc,
    data.deliverablesIntro,
    contentX,
    y,
    contentW,
    'ManropeMed',
    10.5,
    C.lightGray,
    16,
  );
  y += 6 * MM;
  divider(doc, contentX, y, contentW, C.border);
  y += 6 * MM;

  // 2x2 grid of outlined cards
  const cardW = (contentW - 4 * MM) / 2;
  const cardH = 65 * MM;
  const gap = 4 * MM;
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = contentX + col * (cardW + gap);
    const cy = y + row * (cardH + gap);
    const d = data.deliverables[i];
    if (!d) continue;
    // Outlined card
    doc.save();
    setStroke(doc, C.borderLt).lineWidth(0.75);
    doc.roundedRect(cx, cy, cardW, cardH, 4 * MM).stroke();
    doc.restore();
    // Numeral
    font(doc, 'ManropeBlack').fontSize(26);
    setFill(doc, C.orange);
    doc.text(d.num, cx + 6 * MM, cy + 5 * MM, { lineBreak: false });
    // Title
    font(doc, 'ManropeBold').fontSize(12);
    setFill(doc, C.offWhite);
    doc.text(d.title, cx + 6 * MM, cy + 17 * MM, { width: cardW - 12 * MM, lineBreak: false });
    // Bullets
    let by = cy + 24 * MM;
    const bw = cardW - 14 * MM;
    const lineH = 12;
    for (const b of d.bullets) {
      // Arrow
      font(doc, 'ManropeBold').fontSize(9);
      setFill(doc, C.orange);
      doc.text('→', cx + 6 * MM, by, { lineBreak: false });
      // Text
      font(doc, 'Manrope').fontSize(9);
      setFill(doc, C.lightGray);
      const lines = wrapLines(doc, b, bw);
      for (const line of lines) {
        doc.text(line, cx + 11 * MM, by, { lineBreak: false });
        by += lineH;
      }
      by += 1.5;
    }
  }
}

function buildPricingPage(doc: PDFKit.PDFDocument, data: ProposalData) {
  doc.addPage({ size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  paintInnerBackground(doc, data.clientName, 3);

  const contentX = MARGIN;
  const contentW = A4.width - 2 * MARGIN;
  let y = MARGIN + 18 * MM;

  y = eyebrow(doc, 'INVESTERING', contentX, y);
  y += 4 * MM;

  const heroRuns = parseRuns('Enkel og {orange:forutsigbar} prising', C.offWhite);
  y = drawMixedText(doc, heroRuns, contentX, y, contentW, 'ManropeBlack', 26, 30);
  y += 4 * MM;

  y = drawText(
    doc,
    data.pricing.intro,
    contentX,
    y,
    contentW,
    'ManropeMed',
    10.5,
    C.lightGray,
    16,
  );
  y += 6 * MM;

  // Two big price cards side by side
  const cardW = (contentW - 4 * MM) / 2;
  const cardH = 60 * MM;

  // Left card (outlined)
  doc.save();
  setStroke(doc, C.borderLt).lineWidth(0.75);
  doc.roundedRect(contentX, y, cardW, cardH, 4 * MM).stroke();
  doc.restore();
  font(doc, 'ManropeBold').fontSize(7.5);
  setFill(doc, C.midGray);
  doc.text(data.pricing.leftCard.label, contentX + 6 * MM, y + 5 * MM, { lineBreak: false });
  font(doc, 'ManropeBlack').fontSize(42);
  setFill(doc, C.offWhite);
  doc.text(data.pricing.leftCard.amount, contentX + 6 * MM, y + 13 * MM, { lineBreak: false });
  font(doc, 'ManropeMed').fontSize(10);
  setFill(doc, C.lightGray);
  doc.text(data.pricing.leftCard.subtitle, contentX + 6 * MM, y + 33 * MM, { lineBreak: false });
  font(doc, 'Manrope').fontSize(8.5);
  setFill(doc, C.midGray);
  drawText(
    doc,
    data.pricing.leftCard.description,
    contentX + 6 * MM,
    y + 40 * MM,
    cardW - 12 * MM,
    'Manrope',
    8.5,
    C.midGray,
    11.5,
  );

  // Right card (orange filled)
  const rx = contentX + cardW + 4 * MM;
  doc.save();
  setFill(doc, C.orange).roundedRect(rx, y, cardW, cardH, 4 * MM).fill();
  doc.restore();
  font(doc, 'ManropeBold').fontSize(7.5);
  setFill(doc, C.bg, 0.7);
  doc.text(data.pricing.rightCard.label, rx + 6 * MM, y + 5 * MM, { lineBreak: false });
  font(doc, 'ManropeBlack').fontSize(42);
  setFill(doc, C.bg);
  doc.text(data.pricing.rightCard.amount, rx + 6 * MM, y + 13 * MM, { lineBreak: false });
  font(doc, 'ManropeMed').fontSize(10);
  setFill(doc, C.bg, 0.8);
  doc.text(data.pricing.rightCard.subtitle, rx + 6 * MM, y + 33 * MM, { lineBreak: false });
  doc.save();
  doc.fillOpacity(0.75);
  drawText(
    doc,
    data.pricing.rightCard.description,
    rx + 6 * MM,
    y + 40 * MM,
    cardW - 12 * MM,
    'Manrope',
    8.5,
    C.bg,
    11.5,
  );
  doc.fillOpacity(1);
  doc.restore();

  y += cardH + 10 * MM;

  // Summary rows
  for (const [label, value] of data.pricing.summaryRows) {
    divider(doc, contentX, y, contentW, C.border);
    y += 4 * MM;
    font(doc, 'ManropeMed').fontSize(10);
    setFill(doc, C.midGray);
    doc.text(label, contentX, y, { lineBreak: false });
    font(doc, 'ManropeBold').fontSize(11);
    setFill(doc, C.offWhite);
    doc.text(value, contentX + contentW - 80 * MM, y, {
      width: 80 * MM,
      align: 'right',
      lineBreak: false,
    });
    y += 8 * MM;
  }
  divider(doc, contentX, y, contentW, C.border);
  y += 4 * MM;

  font(doc, 'Manrope').fontSize(8);
  setFill(doc, C.midGray);
  doc.text('Alle priser er eks. mva. Faktureres månedlig.', contentX, y, {
    width: contentW,
    lineBreak: false,
  });
}

function buildNextStepsPage(doc: PDFKit.PDFDocument, data: ProposalData) {
  doc.addPage({ size: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  paintInnerBackground(doc, data.clientName, 4);

  const contentX = MARGIN;
  const contentW = A4.width - 2 * MARGIN;
  let y = MARGIN + 18 * MM;

  y = eyebrow(doc, 'NESTE STEG', contentX, y);
  y += 4 * MM;

  const heroRuns = parseRuns('Slik {orange:kommer vi i gang}', C.offWhite);
  y = drawMixedText(doc, heroRuns, contentX, y, contentW, 'ManropeBlack', 26, 30);
  y += 4 * MM;

  y = drawText(
    doc,
    data.nextSteps.intro,
    contentX,
    y,
    contentW,
    'ManropeMed',
    10.5,
    C.lightGray,
    16,
  );
  y += 4 * MM;

  // Steps
  for (const step of data.nextSteps.steps) {
    divider(doc, contentX, y, contentW, C.border);
    y += 5 * MM;
    font(doc, 'ManropeBlack').fontSize(22);
    setFill(doc, C.orange);
    doc.text(step.num, contentX, y, { lineBreak: false });

    font(doc, 'ManropeBold').fontSize(12);
    setFill(doc, C.offWhite);
    doc.text(step.title, contentX + 22 * MM, y + 1 * MM, {
      width: contentW - 22 * MM,
      lineBreak: false,
    });

    drawText(
      doc,
      step.desc,
      contentX + 22 * MM,
      y + 9 * MM,
      contentW - 22 * MM,
      'Manrope',
      9.5,
      C.lightGray,
      13,
    );
    y += 18 * MM;
  }
  divider(doc, contentX, y, contentW, C.border);
  y += 12 * MM;

  // Outlined CTA box
  const ctaH = 60 * MM;
  doc.save();
  setStroke(doc, C.borderLt).lineWidth(0.75);
  doc.roundedRect(contentX, y, contentW, ctaH, 5 * MM).stroke();
  doc.restore();

  const ctaInnerY = y + 10 * MM;
  const ctaRuns = parseRuns(data.cta.headlineHtml, C.offWhite);
  // Center the heading. We render it as text using mixed runs, but to keep simple, use continued text.
  font(doc, 'ManropeBlack').fontSize(20);
  // Compute total width for centering
  let totalW = 0;
  for (const r of ctaRuns) totalW += doc.widthOfString(r.text);
  let cx = contentX + (contentW - totalW) / 2;
  for (const r of ctaRuns) {
    setFill(doc, r.color);
    doc.text(r.text, cx, ctaInnerY, { lineBreak: false });
    cx += doc.widthOfString(r.text);
  }

  font(doc, 'ManropeMed').fontSize(10);
  setFill(doc, C.lightGray);
  // Center-aligned single line (subtext is short enough to fit one line)
  const subW = doc.widthOfString(data.cta.subtext);
  doc.text(
    data.cta.subtext,
    contentX + (contentW - subW) / 2,
    ctaInnerY + 12 * MM,
    { lineBreak: false },
  );

  // Two pill buttons
  const btnGap = 4 * MM;
  const btnW = 60 * MM;
  const btnH = 11 * MM;
  const btnY = y + ctaH - btnH - 8 * MM;
  const btnsTotalW = btnW * 2 + btnGap;
  const btnsX = contentX + (contentW - btnsTotalW) / 2;
  pillButton(doc, data.cta.primary, btnsX, btnY, {
    width: btnW,
    height: btnH,
    bg: C.orange,
    fg: C.bg,
  });
  pillButton(doc, data.cta.secondary, btnsX + btnW + btnGap, btnY, {
    width: btnW,
    height: btnH,
    bg: C.card,
    fg: C.offWhite,
    fontName: 'ManropeBold',
  });
  // Border around the dark pill
  doc.save();
  setStroke(doc, C.borderLt).lineWidth(0.5);
  doc.roundedRect(btnsX + btnW + btnGap, btnY, btnW, btnH, btnH / 2).stroke();
  doc.restore();
}

// ─── Public API ───
export async function buildProposalPdf(data: ProposalData): Promise<Buffer> {
  // Bottom margin = 0 so manually-positioned footer text in the page-background
  // painters never trips PDFKit's auto-paginate (which fires when text wraps
  // past the bottom margin, regardless of lineBreak).
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `FX Media – ${data.proposalTitle} – ${data.clientName}`,
      Author: 'FX Media',
    },
  });
  registerFonts(doc);

  buildCoverPage(doc, data);
  buildDeliverablesPage(doc, data);
  buildPricingPage(doc, data);
  buildNextStepsPage(doc, data);

  doc.end();

  // Collect into a buffer.
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    const stream = doc as unknown as Readable;
    stream.on('data', (c: Buffer) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
