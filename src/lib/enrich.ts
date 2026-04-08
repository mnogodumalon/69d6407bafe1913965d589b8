import type { EnrichedFinanzdatenBwaJahresabschluss, EnrichedKennzahlenauswertung, EnrichedMitarbeiterliste } from '@/types/enriched';
import type { FinanzdatenBwaJahresabschluss, Kennzahlenauswertung, Mitarbeiterliste, Unternehmensprofil } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface FinanzdatenBwaJahresabschlussMaps {
  unternehmensprofilMap: Map<string, Unternehmensprofil>;
}

export function enrichFinanzdatenBwaJahresabschluss(
  finanzdatenBwaJahresabschluss: FinanzdatenBwaJahresabschluss[],
  maps: FinanzdatenBwaJahresabschlussMaps
): EnrichedFinanzdatenBwaJahresabschluss[] {
  return finanzdatenBwaJahresabschluss.map(r => ({
    ...r,
    unternehmen_refName: resolveDisplay(r.fields.unternehmen_ref, maps.unternehmensprofilMap, 'unternehmensname'),
  }));
}

interface MitarbeiterlisteMaps {
  unternehmensprofilMap: Map<string, Unternehmensprofil>;
}

export function enrichMitarbeiterliste(
  mitarbeiterliste: Mitarbeiterliste[],
  maps: MitarbeiterlisteMaps
): EnrichedMitarbeiterliste[] {
  return mitarbeiterliste.map(r => ({
    ...r,
    unternehmen_ma_refName: resolveDisplay(r.fields.unternehmen_ma_ref, maps.unternehmensprofilMap, 'unternehmensname'),
  }));
}

interface KennzahlenauswertungMaps {
  finanzdatenBwaJahresabschlussMap: Map<string, FinanzdatenBwaJahresabschluss>;
}

export function enrichKennzahlenauswertung(
  kennzahlenauswertung: Kennzahlenauswertung[],
  maps: KennzahlenauswertungMaps
): EnrichedKennzahlenauswertung[] {
  return kennzahlenauswertung.map(r => ({
    ...r,
    finanzdaten_refName: resolveDisplay(r.fields.finanzdaten_ref, maps.finanzdatenBwaJahresabschlussMap, 'berichtszeitraum'),
  }));
}
