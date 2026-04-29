import { Navigate, Route, Routes } from 'react-router-dom';
import { useMe } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AuthPage } from '@/pages/Auth';
import { DiscoveryPage } from '@/pages/Discovery';
import { AutomationPage } from '@/pages/Automation';
import { AnalyticsPage } from '@/pages/Analytics';
import { EmailFilterPage } from '@/pages/EmailFilter';
import { OffersPage } from '@/pages/Offers';
import { EmailOutreachPage } from '@/pages/EmailOutreach';
import { OutreachStatsPage } from '@/pages/OutreachStats';
import { CrmPage } from '@/pages/Crm';
import { WikiPage } from '@/pages/Wiki';

export default function App() {
  const me = useMe();

  if (me.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!me.data) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<DiscoveryPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/email-filter" element={<EmailFilterPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/email-outreach" element={<EmailOutreachPage />} />
        <Route path="/outreach-stats" element={<OutreachStatsPage />} />
        <Route path="/crm" element={<CrmPage />} />
        <Route path="/wiki" element={<WikiPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}
