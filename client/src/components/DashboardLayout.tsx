import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Building2,
  FileText,
  Filter,
  KanbanSquare,
  Mail,
  Menu,
  Megaphone,
  PackageOpen,
  Send,
  X,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Oppdagelse', icon: Building2 },
  { to: '/automation', label: 'Automatisering', icon: Activity },
  { to: '/crm', label: 'CRM', icon: KanbanSquare },
  { to: '/tilbud', label: 'Tilbud', icon: FileText },
  { to: '/email-filter', label: 'Bransjefilter', icon: Filter },
  { to: '/offers', label: 'Tilbud', icon: PackageOpen },
  { to: '/email-outreach', label: 'E-postutsendelse', icon: Send },
  { to: '/outreach-stats', label: 'Utsendingsstatistikk', icon: Mail },
  { to: '/analytics', label: 'Analyse', icon: BarChart3 },
  { to: '/wiki', label: 'Veiledning', icon: BookOpen },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform bg-card border-r transition-transform md:relative md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Megaphone className="h-5 w-5 text-primary" />
            <span>BedriftsDB</span>
          </Link>
          <button className="md:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:hidden">
          <button onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">BedriftsDB</span>
          <span />
        </header>
        <main className="flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
