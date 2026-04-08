import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Unternehmensprofil, FinanzdatenBwaJahresabschluss, Mitarbeiterliste, Kennzahlenauswertung } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { UnternehmensprofilDialog } from '@/components/dialogs/UnternehmensprofilDialog';
import { UnternehmensprofilViewDialog } from '@/components/dialogs/UnternehmensprofilViewDialog';
import { FinanzdatenBwaJahresabschlussDialog } from '@/components/dialogs/FinanzdatenBwaJahresabschlussDialog';
import { FinanzdatenBwaJahresabschlussViewDialog } from '@/components/dialogs/FinanzdatenBwaJahresabschlussViewDialog';
import { MitarbeiterlisteDialog } from '@/components/dialogs/MitarbeiterlisteDialog';
import { MitarbeiterlisteViewDialog } from '@/components/dialogs/MitarbeiterlisteViewDialog';
import { KennzahlenauswertungDialog } from '@/components/dialogs/KennzahlenauswertungDialog';
import { KennzahlenauswertungViewDialog } from '@/components/dialogs/KennzahlenauswertungViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const UNTERNEHMENSPROFIL_FIELDS = [
  { key: 'unternehmensname', label: 'Unternehmensname', type: 'string/text' },
  { key: 'rechtsform', label: 'Rechtsform', type: 'lookup/select', options: [{ key: 'einzelunternehmen', label: 'Einzelunternehmen' }, { key: 'gbr', label: 'GbR' }, { key: 'ohg', label: 'OHG' }, { key: 'kg', label: 'KG' }, { key: 'gmbh', label: 'GmbH' }, { key: 'ug', label: 'UG (haftungsbeschränkt)' }, { key: 'gmbh_co_kg', label: 'GmbH & Co. KG' }, { key: 'ag', label: 'AG' }, { key: 'sonstige', label: 'Sonstige' }] },
  { key: 'branche', label: 'Branche', type: 'lookup/select', options: [{ key: 'bauhandwerk', label: 'Bauhandwerk' }, { key: 'elektrohandwerk', label: 'Elektrohandwerk' }, { key: 'shk', label: 'Sanitär/Heizung/Klima' }, { key: 'tischler', label: 'Tischler/Schreiner' }, { key: 'maler', label: 'Maler/Lackierer' }, { key: 'kfz', label: 'Kfz-Handwerk' }, { key: 'metallbau', label: 'Metallbau' }, { key: 'dachdecker', label: 'Dachdeckerei' }, { key: 'galabau', label: 'Garten- und Landschaftsbau' }, { key: 'sonstiges_handwerk', label: 'Sonstiges Handwerk' }, { key: 'dienstleistung', label: 'Dienstleistung' }, { key: 'handel', label: 'Handel' }, { key: 'sonstige_branche', label: 'Sonstige' }] },
  { key: 'geschaeftsjahr', label: 'Geschäftsjahr (Jahr)', type: 'number' },
  { key: 'geschaeftsjahr_beginn', label: 'Beginn des Geschäftsjahres', type: 'date/date' },
  { key: 'geschaeftsjahr_ende', label: 'Ende des Geschäftsjahres', type: 'date/date' },
  { key: 'ansprechpartner_vorname', label: 'Vorname Ansprechpartner', type: 'string/text' },
  { key: 'ansprechpartner_nachname', label: 'Nachname Ansprechpartner', type: 'string/text' },
  { key: 'ansprechpartner_email', label: 'E-Mail Ansprechpartner', type: 'string/email' },
  { key: 'ansprechpartner_telefon', label: 'Telefon Ansprechpartner', type: 'string/tel' },
  { key: 'bemerkungen', label: 'Bemerkungen zum Unternehmen', type: 'string/textarea' },
];
const FINANZDATENBWAJAHRESABSCHLUSS_FIELDS = [
  { key: 'unternehmen_ref', label: 'Unternehmen', type: 'applookup/select', targetEntity: 'unternehmensprofil', targetAppId: 'UNTERNEHMENSPROFIL', displayField: 'unternehmensname' },
  { key: 'dokument_typ', label: 'Dokumententyp', type: 'lookup/radio', options: [{ key: 'bwa', label: 'BWA (Betriebswirtschaftliche Auswertung)' }, { key: 'jahresabschluss', label: 'Jahresabschluss (HGB)' }] },
  { key: 'berichtszeitraum', label: 'Berichtszeitraum (z.B. Jan–Dez 2024)', type: 'string/text' },
  { key: 'dokument_upload', label: 'Dokument hochladen (optional)', type: 'file' },
  { key: 'umsatzerloese', label: 'Umsatzerlöse (EUR)', type: 'number' },
  { key: 'sonstige_betriebliche_ertraege', label: 'Sonstige betriebliche Erträge (EUR)', type: 'number' },
  { key: 'gesamtleistung', label: 'Gesamtleistung (EUR)', type: 'number' },
  { key: 'materialeinsatz', label: 'Materialeinsatz / Wareneinsatz (EUR)', type: 'number' },
  { key: 'personalkosten', label: 'Personalkosten gesamt (EUR)', type: 'number' },
  { key: 'sonstige_betriebliche_aufwendungen', label: 'Sonstige betriebliche Aufwendungen (EUR)', type: 'number' },
  { key: 'abschreibungen', label: 'Abschreibungen (EUR)', type: 'number' },
  { key: 'zinsaufwand', label: 'Zinsaufwand (EUR)', type: 'number' },
  { key: 'ebit', label: 'Betriebsergebnis / EBIT (EUR)', type: 'number' },
  { key: 'jahresueberschuss', label: 'Jahresüberschuss / Jahresfehlbetrag (EUR)', type: 'number' },
  { key: 'eigenkapital', label: 'Eigenkapital (EUR)', type: 'number' },
  { key: 'fremdkapital', label: 'Fremdkapital gesamt (EUR)', type: 'number' },
  { key: 'bilanzsumme', label: 'Bilanzsumme / Gesamtkapital (EUR)', type: 'number' },
  { key: 'anmerkungen_finanzen', label: 'Anmerkungen zu den Finanzdaten', type: 'string/textarea' },
];
const MITARBEITERLISTE_FIELDS = [
  { key: 'unternehmen_ma_ref', label: 'Unternehmen', type: 'applookup/select', targetEntity: 'unternehmensprofil', targetAppId: 'UNTERNEHMENSPROFIL', displayField: 'unternehmensname' },
  { key: 'mitarbeiter_vorname', label: 'Vorname Mitarbeiter', type: 'string/text' },
  { key: 'mitarbeiter_nachname', label: 'Nachname Mitarbeiter', type: 'string/text' },
  { key: 'taetigkeit_kategorie', label: 'Tätigkeitskategorie', type: 'lookup/select', options: [{ key: 'handwerklich', label: 'Handwerklich / Produktiv' }, { key: 'kaufmaennisch', label: 'Kaufmännisch / Verwaltung' }, { key: 'technisch', label: 'Technisch / Planung' }, { key: 'fuehrungskraft', label: 'Führungskraft' }, { key: 'azubi', label: 'Auszubildender' }, { key: 'sonstige_taetigkeit', label: 'Sonstige' }] },
  { key: 'taetigkeit_beschreibung', label: 'Tätigkeitsbeschreibung', type: 'string/text' },
  { key: 'beschaeftigungsgrad_prozent', label: 'Beschäftigungsgrad (% – 100 = Vollzeit)', type: 'number' },
  { key: 'handwerklicher_anteil_prozent', label: 'Anteil handwerkliche Tätigkeit (%)', type: 'number' },
  { key: 'eintrittsdatum', label: 'Eintrittsdatum', type: 'date/date' },
  { key: 'ist_aktiv', label: 'Mitarbeiter aktiv', type: 'bool' },
  { key: 'anmerkung_mitarbeiter', label: 'Anmerkung zum Mitarbeiter', type: 'string/textarea' },
];
const KENNZAHLENAUSWERTUNG_FIELDS = [
  { key: 'erstellt_von_nachname', label: 'Erstellt von – Nachname', type: 'string/text' },
  { key: 'umsatzrentabilitaet_prozent', label: 'Umsatzrentabilität (%)', type: 'number' },
  { key: 'umsatzrentabilitaet_ziel_prozent', label: 'Zielwert Umsatzrentabilität (%)', type: 'number' },
  { key: 'eigenkapitalquote_prozent', label: 'Eigenkapitalquote (%)', type: 'number' },
  { key: 'eigenkapitalquote_ziel_prozent', label: 'Zielwert Eigenkapitalquote (%)', type: 'number' },
  { key: 'wertschoepfung_ziel_pro_ma_eur', label: 'Zielwert Wertschöpfung pro Mitarbeiter (EUR)', type: 'number' },
  { key: 'deckungsbeitrag_eur', label: 'Deckungsbeitrag (EUR)', type: 'number' },
  { key: 'deckungsbeitrag_pro_ma_eur', label: 'Deckungsbeitrag pro produktivem Mitarbeiter (EUR)', type: 'number' },
  { key: 'umsatz_pro_mitarbeiter_eur', label: 'Umsatz pro Mitarbeiter (EUR)', type: 'number' },
  { key: 'personalkosten_quote_prozent', label: 'Personalkostenquote (%)', type: 'number' },
  { key: 'gesamtbewertung', label: 'Gesamtbewertung Rentabilität', type: 'lookup/radio', options: [{ key: 'sehr_gut', label: 'Sehr gut (überdurchschnittlich)' }, { key: 'gut', label: 'Gut (branchenüblich)' }, { key: 'befriedigend', label: 'Befriedigend (Verbesserungsbedarf)' }, { key: 'kritisch', label: 'Kritisch (dringender Handlungsbedarf)' }] },
  { key: 'bewertung_produktivitaet', label: 'Gesamtbewertung Produktivität', type: 'lookup/radio', options: [{ key: 'prod_sehr_gut', label: 'Sehr gut (überdurchschnittlich)' }, { key: 'prod_gut', label: 'Gut (branchenüblich)' }, { key: 'prod_befriedigend', label: 'Befriedigend (Verbesserungsbedarf)' }, { key: 'prod_kritisch', label: 'Kritisch (dringender Handlungsbedarf)' }] },
  { key: 'staerken', label: 'Stärken des Unternehmens', type: 'string/textarea' },
  { key: 'schwaechen', label: 'Schwächen / Risiken', type: 'string/textarea' },
  { key: 'finanzdaten_ref', label: 'Finanzdaten (BWA/Jahresabschluss)', type: 'applookup/select', targetEntity: 'finanzdaten_(bwa/jahresabschluss)', targetAppId: 'FINANZDATEN_BWA_JAHRESABSCHLUSS', displayField: 'berichtszeitraum' },
  { key: 'auswertungsdatum', label: 'Datum der Auswertung', type: 'date/date' },
  { key: 'erstellt_von_vorname', label: 'Erstellt von – Vorname', type: 'string/text' },
  { key: 'eigenkapitalrentabilitaet_prozent', label: 'Eigenkapitalrentabilität (%)', type: 'number' },
  { key: 'handwerkliche_wertschoepfung_eur', label: 'Handwerkliche Wertschöpfung gesamt (EUR)', type: 'number' },
  { key: 'wertschoepfung_pro_mitarbeiter_eur', label: 'Wertschöpfung pro produktivem Mitarbeiter (EUR)', type: 'number' },
  { key: 'handlungsempfehlungen_rentabilitaet', label: 'Handlungsempfehlungen Rentabilität', type: 'string/textarea' },
  { key: 'handlungsempfehlungen_produktivitaet', label: 'Handlungsempfehlungen Produktivität', type: 'string/textarea' },
  { key: 'massnahmen_prioritaet', label: 'Prioritäre Maßnahmen', type: 'multiplelookup/checkbox', options: [{ key: 'preisgestaltung', label: 'Preisgestaltung überprüfen' }, { key: 'material_optimieren', label: 'Materialeinsatz optimieren' }, { key: 'personal_anpassen', label: 'Personalstruktur anpassen' }, { key: 'produktive_stunden', label: 'Produktive Stunden steigern' }, { key: 'overhead', label: 'Overhead reduzieren' }, { key: 'eigenkapital_staerken', label: 'Eigenkapital stärken' }, { key: 'liquiditaet', label: 'Liquidität verbessern' }, { key: 'umsatz_steigern', label: 'Umsatz steigern' }, { key: 'neue_felder', label: 'Neue Geschäftsfelder erschließen' }, { key: 'controlling', label: 'Controlling einführen / verbessern' }] },
  { key: 'naechste_pruefung', label: 'Nächste Überprüfung geplant am', type: 'date/date' },
  { key: 'interne_notizen', label: 'Interne Notizen', type: 'string/textarea' },
];

const ENTITY_TABS = [
  { key: 'unternehmensprofil', label: 'Unternehmensprofil', pascal: 'Unternehmensprofil' },
  { key: 'finanzdaten_(bwa/jahresabschluss)', label: 'Finanzdaten (BWA/Jahresabschluss)', pascal: 'FinanzdatenBwaJahresabschluss' },
  { key: 'mitarbeiterliste', label: 'Mitarbeiterliste', pascal: 'Mitarbeiterliste' },
  { key: 'kennzahlenauswertung', label: 'Kennzahlenauswertung', pascal: 'Kennzahlenauswertung' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('unternehmensprofil');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'unternehmensprofil': new Set(),
    'finanzdaten_(bwa/jahresabschluss)': new Set(),
    'mitarbeiterliste': new Set(),
    'kennzahlenauswertung': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'unternehmensprofil': {},
    'finanzdaten_(bwa/jahresabschluss)': {},
    'mitarbeiterliste': {},
    'kennzahlenauswertung': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'unternehmensprofil': return (data as any).unternehmensprofil as Unternehmensprofil[] ?? [];
      case 'finanzdaten_(bwa/jahresabschluss)': return (data as any).finanzdatenBwaJahresabschluss as FinanzdatenBwaJahresabschluss[] ?? [];
      case 'mitarbeiterliste': return (data as any).mitarbeiterliste as Mitarbeiterliste[] ?? [];
      case 'kennzahlenauswertung': return (data as any).kennzahlenauswertung as Kennzahlenauswertung[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'finanzdaten_(bwa/jahresabschluss)':
        lists.unternehmensprofilList = (data as any).unternehmensprofil ?? [];
        break;
      case 'mitarbeiterliste':
        lists.unternehmensprofilList = (data as any).unternehmensprofil ?? [];
        break;
      case 'kennzahlenauswertung':
        lists['finanzdatenBwaJahresabschlussList'] = (data as any).finanzdatenBwaJahresabschluss ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'finanzdaten_(bwa/jahresabschluss)' && fieldKey === 'unternehmen_ref') {
      const match = (lists.unternehmensprofilList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.unternehmensname ?? '—';
    }
    if (entity === 'mitarbeiterliste' && fieldKey === 'unternehmen_ma_ref') {
      const match = (lists.unternehmensprofilList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.unternehmensname ?? '—';
    }
    if (entity === 'kennzahlenauswertung' && fieldKey === 'finanzdaten_ref') {
      const match = (lists['finanzdatenBwaJahresabschlussList'] ?? []).find((r: any) => r.record_id === id);
      return match?.fields.berichtszeitraum ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'unternehmensprofil': return UNTERNEHMENSPROFIL_FIELDS;
      case 'finanzdaten_(bwa/jahresabschluss)': return FINANZDATENBWAJAHRESABSCHLUSS_FIELDS;
      case 'mitarbeiterliste': return MITARBEITERLISTE_FIELDS;
      case 'kennzahlenauswertung': return KENNZAHLENAUSWERTUNG_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'unternehmensprofil': return {
        create: (fields: any) => LivingAppsService.createUnternehmensprofilEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateUnternehmensprofilEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteUnternehmensprofilEntry(id),
      };
      case 'finanzdaten_(bwa/jahresabschluss)': return {
        create: (fields: any) => LivingAppsService.createFinanzdatenBwaJahresabschlus(fields),
        update: (id: string, fields: any) => LivingAppsService.updateFinanzdatenBwaJahresabschlus(id, fields),
        remove: (id: string) => LivingAppsService.deleteFinanzdatenBwaJahresabschlus(id),
      };
      case 'mitarbeiterliste': return {
        create: (fields: any) => LivingAppsService.createMitarbeiterlisteEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateMitarbeiterlisteEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteMitarbeiterlisteEntry(id),
      };
      case 'kennzahlenauswertung': return {
        create: (fields: any) => LivingAppsService.createKennzahlenauswertungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateKennzahlenauswertungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteKennzahlenauswertungEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'unternehmensprofil' || dialogState?.entity === 'unternehmensprofil') && (
        <UnternehmensprofilDialog
          open={createEntity === 'unternehmensprofil' || dialogState?.entity === 'unternehmensprofil'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'unternehmensprofil' ? handleUpdate : (fields: any) => handleCreate('unternehmensprofil', fields)}
          defaultValues={dialogState?.entity === 'unternehmensprofil' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Unternehmensprofil']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmensprofil']}
        />
      )}
      {(createEntity === 'finanzdaten_(bwa/jahresabschluss)' || dialogState?.entity === 'finanzdaten_(bwa/jahresabschluss)') && (
        <FinanzdatenBwaJahresabschlussDialog
          open={createEntity === 'finanzdaten_(bwa/jahresabschluss)' || dialogState?.entity === 'finanzdaten_(bwa/jahresabschluss)'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'finanzdaten_(bwa/jahresabschluss)' ? handleUpdate : (fields: any) => handleCreate('finanzdaten_(bwa/jahresabschluss)', fields)}
          defaultValues={dialogState?.entity === 'finanzdaten_(bwa/jahresabschluss)' ? dialogState.record?.fields : undefined}
          unternehmensprofilList={(data as any).unternehmensprofil ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['FinanzdatenBwaJahresabschluss']}
          enablePhotoLocation={AI_PHOTO_LOCATION['FinanzdatenBwaJahresabschluss']}
        />
      )}
      {(createEntity === 'mitarbeiterliste' || dialogState?.entity === 'mitarbeiterliste') && (
        <MitarbeiterlisteDialog
          open={createEntity === 'mitarbeiterliste' || dialogState?.entity === 'mitarbeiterliste'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'mitarbeiterliste' ? handleUpdate : (fields: any) => handleCreate('mitarbeiterliste', fields)}
          defaultValues={dialogState?.entity === 'mitarbeiterliste' ? dialogState.record?.fields : undefined}
          unternehmensprofilList={(data as any).unternehmensprofil ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Mitarbeiterliste']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeiterliste']}
        />
      )}
      {(createEntity === 'kennzahlenauswertung' || dialogState?.entity === 'kennzahlenauswertung') && (
        <KennzahlenauswertungDialog
          open={createEntity === 'kennzahlenauswertung' || dialogState?.entity === 'kennzahlenauswertung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'kennzahlenauswertung' ? handleUpdate : (fields: any) => handleCreate('kennzahlenauswertung', fields)}
          defaultValues={dialogState?.entity === 'kennzahlenauswertung' ? dialogState.record?.fields : undefined}
          finanzdatenBwaJahresabschlussList={(data as any).finanzdatenBwaJahresabschluss ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Kennzahlenauswertung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Kennzahlenauswertung']}
        />
      )}
      {viewState?.entity === 'unternehmensprofil' && (
        <UnternehmensprofilViewDialog
          open={viewState?.entity === 'unternehmensprofil'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'unternehmensprofil', record: r }); }}
        />
      )}
      {viewState?.entity === 'finanzdaten_(bwa/jahresabschluss)' && (
        <FinanzdatenBwaJahresabschlussViewDialog
          open={viewState?.entity === 'finanzdaten_(bwa/jahresabschluss)'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'finanzdaten_(bwa/jahresabschluss)', record: r }); }}
          unternehmensprofilList={(data as any).unternehmensprofil ?? []}
        />
      )}
      {viewState?.entity === 'mitarbeiterliste' && (
        <MitarbeiterlisteViewDialog
          open={viewState?.entity === 'mitarbeiterliste'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'mitarbeiterliste', record: r }); }}
          unternehmensprofilList={(data as any).unternehmensprofil ?? []}
        />
      )}
      {viewState?.entity === 'kennzahlenauswertung' && (
        <KennzahlenauswertungViewDialog
          open={viewState?.entity === 'kennzahlenauswertung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'kennzahlenauswertung', record: r }); }}
          finanzdatenBwaJahresabschlussList={(data as any).finanzdatenBwaJahresabschluss ?? []}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}