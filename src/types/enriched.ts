import type { FinanzdatenBwaJahresabschluss, Kennzahlenauswertung, Mitarbeiterliste } from './app';

export type EnrichedFinanzdatenBwaJahresabschluss = FinanzdatenBwaJahresabschluss & {
  unternehmen_refName: string;
};

export type EnrichedMitarbeiterliste = Mitarbeiterliste & {
  unternehmen_ma_refName: string;
};

export type EnrichedKennzahlenauswertung = Kennzahlenauswertung & {
  finanzdaten_refName: string;
};
