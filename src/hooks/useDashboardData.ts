import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Unternehmensprofil, FinanzdatenBwaJahresabschluss, Mitarbeiterliste, Kennzahlenauswertung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [unternehmensprofil, setUnternehmensprofil] = useState<Unternehmensprofil[]>([]);
  const [finanzdatenBwaJahresabschluss, setFinanzdatenBwaJahresabschluss] = useState<FinanzdatenBwaJahresabschluss[]>([]);
  const [mitarbeiterliste, setMitarbeiterliste] = useState<Mitarbeiterliste[]>([]);
  const [kennzahlenauswertung, setKennzahlenauswertung] = useState<Kennzahlenauswertung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [unternehmensprofilData, finanzdatenBwaJahresabschlussData, mitarbeiterlisteData, kennzahlenauswertungData] = await Promise.all([
        LivingAppsService.getUnternehmensprofil(),
        LivingAppsService.getFinanzdatenBwaJahresabschluss(),
        LivingAppsService.getMitarbeiterliste(),
        LivingAppsService.getKennzahlenauswertung(),
      ]);
      setUnternehmensprofil(unternehmensprofilData);
      setFinanzdatenBwaJahresabschluss(finanzdatenBwaJahresabschlussData);
      setMitarbeiterliste(mitarbeiterlisteData);
      setKennzahlenauswertung(kennzahlenauswertungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [unternehmensprofilData, finanzdatenBwaJahresabschlussData, mitarbeiterlisteData, kennzahlenauswertungData] = await Promise.all([
          LivingAppsService.getUnternehmensprofil(),
          LivingAppsService.getFinanzdatenBwaJahresabschluss(),
          LivingAppsService.getMitarbeiterliste(),
          LivingAppsService.getKennzahlenauswertung(),
        ]);
        setUnternehmensprofil(unternehmensprofilData);
        setFinanzdatenBwaJahresabschluss(finanzdatenBwaJahresabschlussData);
        setMitarbeiterliste(mitarbeiterlisteData);
        setKennzahlenauswertung(kennzahlenauswertungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const unternehmensprofilMap = useMemo(() => {
    const m = new Map<string, Unternehmensprofil>();
    unternehmensprofil.forEach(r => m.set(r.record_id, r));
    return m;
  }, [unternehmensprofil]);

  const finanzdatenBwaJahresabschlussMap = useMemo(() => {
    const m = new Map<string, FinanzdatenBwaJahresabschluss>();
    finanzdatenBwaJahresabschluss.forEach(r => m.set(r.record_id, r));
    return m;
  }, [finanzdatenBwaJahresabschluss]);

  return { unternehmensprofil, setUnternehmensprofil, finanzdatenBwaJahresabschluss, setFinanzdatenBwaJahresabschluss, mitarbeiterliste, setMitarbeiterliste, kennzahlenauswertung, setKennzahlenauswertung, loading, error, fetchAll, unternehmensprofilMap, finanzdatenBwaJahresabschlussMap };
}