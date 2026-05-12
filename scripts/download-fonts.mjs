#!/usr/bin/env node
// Downloads Manrope TTF font files used by the proposal PDF generator.
// Runs as a postinstall hook so both local dev and Vercel's build have fonts.

import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(__filename));
const FONT_DIR = join(ROOT, 'server', 'assets', 'fonts');

// Hosted TTFs from Google's gstatic CDN (each is a different weight of Manrope).
const FONTS = [
  ['Manrope-Regular.ttf',    'https://fonts.gstatic.com/s/manrope/v20/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk79FO_F.ttf'],
  ['Manrope-Medium.ttf',     'https://fonts.gstatic.com/s/manrope/v20/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk7PFO_F.ttf'],
  ['Manrope-SemiBold.ttf',   'https://fonts.gstatic.com/s/manrope/v20/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk4jE-_F.ttf'],
  ['Manrope-Bold.ttf',       'https://fonts.gstatic.com/s/manrope/v20/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk4aE-_F.ttf'],
  ['Manrope-ExtraBold.ttf',  'https://fonts.gstatic.com/s/manrope/v20/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk59E-_F.ttf'],
];

const MIN_BYTES = 10_000;

async function downloadOne(name, url) {
  const dest = join(FONT_DIR, name);
  if (existsSync(dest) && statSync(dest).size > MIN_BYTES) {
    return { name, skipped: true };
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) {
    throw new Error(`${name}: downloaded only ${buf.length} bytes, looks wrong`);
  }
  writeFileSync(dest, buf);
  return { name, bytes: buf.length };
}

async function main() {
  if (!existsSync(FONT_DIR)) mkdirSync(FONT_DIR, { recursive: true });
  for (const [name, url] of FONTS) {
    try {
      const r = await downloadOne(name, url);
      if (r.skipped) console.log(`[fonts] ${name} already present, skipping`);
      else console.log(`[fonts] ${name} ${r.bytes} bytes`);
    } catch (err) {
      console.error(`[fonts] FAILED ${name}: ${err.message}`);
      // Don't fail the build — proposal PDF will fall back to Helvetica if a font is missing.
    }
  }
}

main();
