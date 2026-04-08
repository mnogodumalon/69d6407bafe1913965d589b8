// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Unternehmensprofil {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmensname?: string;
    rechtsform?: LookupValue;
    branche?: LookupValue;
    geschaeftsjahr?: number;
    geschaeftsjahr_beginn?: string; // Format: YYYY-MM-DD oder ISO String
    geschaeftsjahr_ende?: string; // Format: YYYY-MM-DD oder ISO String
    ansprechpartner_vorname?: string;
    ansprechpartner_nachname?: string;
    ansprechpartner_email?: string;
    ansprechpartner_telefon?: string;
    bemerkungen?: string;
  };
}

export interface FinanzdatenBwaJahresabschluss {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmen_ref?: string; // applookup -> URL zu 'Unternehmensprofil' Record
    dokument_typ?: LookupValue;
    berichtszeitraum?: string;
    dokument_upload?: string;
    umsatzerloese?: number;
    sonstige_betriebliche_ertraege?: number;
    gesamtleistung?: number;
    materialeinsatz?: number;
    personalkosten?: number;
    sonstige_betriebliche_aufwendungen?: number;
    abschreibungen?: number;
    zinsaufwand?: number;
    ebit?: number;
    jahresueberschuss?: number;
    eigenkapital?: number;
    fremdkapital?: number;
    bilanzsumme?: number;
    anmerkungen_finanzen?: string;
  };
}

export interface Mitarbeiterliste {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmen_ma_ref?: string; // applookup -> URL zu 'Unternehmensprofil' Record
    mitarbeiter_vorname?: string;
    mitarbeiter_nachname?: string;
    taetigkeit_kategorie?: LookupValue;
    taetigkeit_beschreibung?: string;
    beschaeftigungsgrad_prozent?: number;
    handwerklicher_anteil_prozent?: number;
    eintrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    ist_aktiv?: boolean;
    anmerkung_mitarbeiter?: string;
  };
}

export interface Kennzahlenauswertung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    erstellt_von_nachname?: string;
    umsatzrentabilitaet_prozent?: number;
    umsatzrentabilitaet_ziel_prozent?: number;
    eigenkapitalquote_prozent?: number;
    eigenkapitalquote_ziel_prozent?: number;
    wertschoepfung_ziel_pro_ma_eur?: number;
    deckungsbeitrag_eur?: number;
    deckungsbeitrag_pro_ma_eur?: number;
    umsatz_pro_mitarbeiter_eur?: number;
    personalkosten_quote_prozent?: number;
    gesamtbewertung?: LookupValue;
    bewertung_produktivitaet?: LookupValue;
    staerken?: string;
    schwaechen?: string;
    finanzdaten_ref?: string; // applookup -> URL zu 'FinanzdatenBwaJahresabschluss' Record
    auswertungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    erstellt_von_vorname?: string;
    eigenkapitalrentabilitaet_prozent?: number;
    handwerkliche_wertschoepfung_eur?: number;
    wertschoepfung_pro_mitarbeiter_eur?: number;
    handlungsempfehlungen_rentabilitaet?: string;
    handlungsempfehlungen_produktivitaet?: string;
    massnahmen_prioritaet?: LookupValue[];
    naechste_pruefung?: string; // Format: YYYY-MM-DD oder ISO String
    interne_notizen?: string;
  };
}

export const APP_IDS = {
  UNTERNEHMENSPROFIL: '69d6405bc830a0b20f21883e',
  FINANZDATEN_BWA_JAHRESABSCHLUSS: '69d640606d3816fbb4c5e5d8',
  MITARBEITERLISTE: '69d640627717dcf976f78a80',
  KENNZAHLENAUSWERTUNG: '69d6406209149eb97d6f3850',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'unternehmensprofil': {
    rechtsform: [{ key: "einzelunternehmen", label: "Einzelunternehmen" }, { key: "gbr", label: "GbR" }, { key: "ohg", label: "OHG" }, { key: "kg", label: "KG" }, { key: "gmbh", label: "GmbH" }, { key: "ug", label: "UG (haftungsbeschränkt)" }, { key: "gmbh_co_kg", label: "GmbH & Co. KG" }, { key: "ag", label: "AG" }, { key: "sonstige", label: "Sonstige" }],
    branche: [{ key: "bauhandwerk", label: "Bauhandwerk" }, { key: "elektrohandwerk", label: "Elektrohandwerk" }, { key: "shk", label: "Sanitär/Heizung/Klima" }, { key: "tischler", label: "Tischler/Schreiner" }, { key: "maler", label: "Maler/Lackierer" }, { key: "kfz", label: "Kfz-Handwerk" }, { key: "metallbau", label: "Metallbau" }, { key: "dachdecker", label: "Dachdeckerei" }, { key: "galabau", label: "Garten- und Landschaftsbau" }, { key: "sonstiges_handwerk", label: "Sonstiges Handwerk" }, { key: "dienstleistung", label: "Dienstleistung" }, { key: "handel", label: "Handel" }, { key: "sonstige_branche", label: "Sonstige" }],
  },
  'finanzdaten_(bwa/jahresabschluss)': {
    dokument_typ: [{ key: "bwa", label: "BWA (Betriebswirtschaftliche Auswertung)" }, { key: "jahresabschluss", label: "Jahresabschluss (HGB)" }],
  },
  'mitarbeiterliste': {
    taetigkeit_kategorie: [{ key: "handwerklich", label: "Handwerklich / Produktiv" }, { key: "kaufmaennisch", label: "Kaufmännisch / Verwaltung" }, { key: "technisch", label: "Technisch / Planung" }, { key: "fuehrungskraft", label: "Führungskraft" }, { key: "azubi", label: "Auszubildender" }, { key: "sonstige_taetigkeit", label: "Sonstige" }],
  },
  'kennzahlenauswertung': {
    gesamtbewertung: [{ key: "sehr_gut", label: "Sehr gut (überdurchschnittlich)" }, { key: "gut", label: "Gut (branchenüblich)" }, { key: "befriedigend", label: "Befriedigend (Verbesserungsbedarf)" }, { key: "kritisch", label: "Kritisch (dringender Handlungsbedarf)" }],
    bewertung_produktivitaet: [{ key: "prod_sehr_gut", label: "Sehr gut (überdurchschnittlich)" }, { key: "prod_gut", label: "Gut (branchenüblich)" }, { key: "prod_befriedigend", label: "Befriedigend (Verbesserungsbedarf)" }, { key: "prod_kritisch", label: "Kritisch (dringender Handlungsbedarf)" }],
    massnahmen_prioritaet: [{ key: "preisgestaltung", label: "Preisgestaltung überprüfen" }, { key: "material_optimieren", label: "Materialeinsatz optimieren" }, { key: "personal_anpassen", label: "Personalstruktur anpassen" }, { key: "produktive_stunden", label: "Produktive Stunden steigern" }, { key: "overhead", label: "Overhead reduzieren" }, { key: "eigenkapital_staerken", label: "Eigenkapital stärken" }, { key: "liquiditaet", label: "Liquidität verbessern" }, { key: "umsatz_steigern", label: "Umsatz steigern" }, { key: "neue_felder", label: "Neue Geschäftsfelder erschließen" }, { key: "controlling", label: "Controlling einführen / verbessern" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'unternehmensprofil': {
    'unternehmensname': 'string/text',
    'rechtsform': 'lookup/select',
    'branche': 'lookup/select',
    'geschaeftsjahr': 'number',
    'geschaeftsjahr_beginn': 'date/date',
    'geschaeftsjahr_ende': 'date/date',
    'ansprechpartner_vorname': 'string/text',
    'ansprechpartner_nachname': 'string/text',
    'ansprechpartner_email': 'string/email',
    'ansprechpartner_telefon': 'string/tel',
    'bemerkungen': 'string/textarea',
  },
  'finanzdaten_(bwa/jahresabschluss)': {
    'unternehmen_ref': 'applookup/select',
    'dokument_typ': 'lookup/radio',
    'berichtszeitraum': 'string/text',
    'dokument_upload': 'file',
    'umsatzerloese': 'number',
    'sonstige_betriebliche_ertraege': 'number',
    'gesamtleistung': 'number',
    'materialeinsatz': 'number',
    'personalkosten': 'number',
    'sonstige_betriebliche_aufwendungen': 'number',
    'abschreibungen': 'number',
    'zinsaufwand': 'number',
    'ebit': 'number',
    'jahresueberschuss': 'number',
    'eigenkapital': 'number',
    'fremdkapital': 'number',
    'bilanzsumme': 'number',
    'anmerkungen_finanzen': 'string/textarea',
  },
  'mitarbeiterliste': {
    'unternehmen_ma_ref': 'applookup/select',
    'mitarbeiter_vorname': 'string/text',
    'mitarbeiter_nachname': 'string/text',
    'taetigkeit_kategorie': 'lookup/select',
    'taetigkeit_beschreibung': 'string/text',
    'beschaeftigungsgrad_prozent': 'number',
    'handwerklicher_anteil_prozent': 'number',
    'eintrittsdatum': 'date/date',
    'ist_aktiv': 'bool',
    'anmerkung_mitarbeiter': 'string/textarea',
  },
  'kennzahlenauswertung': {
    'erstellt_von_nachname': 'string/text',
    'umsatzrentabilitaet_prozent': 'number',
    'umsatzrentabilitaet_ziel_prozent': 'number',
    'eigenkapitalquote_prozent': 'number',
    'eigenkapitalquote_ziel_prozent': 'number',
    'wertschoepfung_ziel_pro_ma_eur': 'number',
    'deckungsbeitrag_eur': 'number',
    'deckungsbeitrag_pro_ma_eur': 'number',
    'umsatz_pro_mitarbeiter_eur': 'number',
    'personalkosten_quote_prozent': 'number',
    'gesamtbewertung': 'lookup/radio',
    'bewertung_produktivitaet': 'lookup/radio',
    'staerken': 'string/textarea',
    'schwaechen': 'string/textarea',
    'finanzdaten_ref': 'applookup/select',
    'auswertungsdatum': 'date/date',
    'erstellt_von_vorname': 'string/text',
    'eigenkapitalrentabilitaet_prozent': 'number',
    'handwerkliche_wertschoepfung_eur': 'number',
    'wertschoepfung_pro_mitarbeiter_eur': 'number',
    'handlungsempfehlungen_rentabilitaet': 'string/textarea',
    'handlungsempfehlungen_produktivitaet': 'string/textarea',
    'massnahmen_prioritaet': 'multiplelookup/checkbox',
    'naechste_pruefung': 'date/date',
    'interne_notizen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateUnternehmensprofil = StripLookup<Unternehmensprofil['fields']>;
export type CreateFinanzdatenBwaJahresabschluss = StripLookup<FinanzdatenBwaJahresabschluss['fields']>;
export type CreateMitarbeiterliste = StripLookup<Mitarbeiterliste['fields']>;
export type CreateKennzahlenauswertung = StripLookup<Kennzahlenauswertung['fields']>;