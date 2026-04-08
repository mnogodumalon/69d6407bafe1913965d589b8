import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import UnternehmensprofilPage from '@/pages/UnternehmensprofilPage';
import FinanzdatenBwaJahresabschlussPage from '@/pages/FinanzdatenBwaJahresabschlussPage';
import MitarbeiterlistePage from '@/pages/MitarbeiterlistePage';
import KennzahlenauswertungPage from '@/pages/KennzahlenauswertungPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="unternehmensprofil" element={<UnternehmensprofilPage />} />
              <Route path="finanzdaten-(bwa/jahresabschluss)" element={<FinanzdatenBwaJahresabschlussPage />} />
              <Route path="mitarbeiterliste" element={<MitarbeiterlistePage />} />
              <Route path="kennzahlenauswertung" element={<KennzahlenauswertungPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
