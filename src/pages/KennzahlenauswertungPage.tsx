import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Kennzahlenauswertung, FinanzdatenBwaJahresabschluss } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { KennzahlenauswertungDialog } from '@/components/dialogs/KennzahlenauswertungDialog';
import { KennzahlenauswertungViewDialog } from '@/components/dialogs/KennzahlenauswertungViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

export default function KennzahlenauswertungPage() {
  const [records, setRecords] = useState<Kennzahlenauswertung[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Kennzahlenauswertung | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Kennzahlenauswertung | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Kennzahlenauswertung | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [finanzdatenBwaJahresabschlussList, setFinanzdatenBwaJahresabschlussList] = useState<FinanzdatenBwaJahresabschluss[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, finanzdatenBwaJahresabschlussData] = await Promise.all([
        LivingAppsService.getKennzahlenauswertung(),
        LivingAppsService.getFinanzdatenBwaJahresabschluss(),
      ]);
      setRecords(mainData);
      setFinanzdatenBwaJahresabschlussList(finanzdatenBwaJahresabschlussData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Kennzahlenauswertung['fields']) {
    await LivingAppsService.createKennzahlenauswertungEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Kennzahlenauswertung['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateKennzahlenauswertungEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteKennzahlenauswertungEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getFinanzdatenBwaJahresabschlussDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return finanzdatenBwaJahresabschlussList.find(r => r.record_id === id)?.fields.berichtszeitraum ?? '—';
  }

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.some(item => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
      if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
      return String(v).toLowerCase().includes(s);
    });
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Kennzahlenauswertung"
      subtitle={`${records.length} Kennzahlenauswertung im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kennzahlenauswertung suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('erstellt_von_nachname')}>
                <span className="inline-flex items-center gap-1">
                  Erstellt von – Nachname
                  {sortKey === 'erstellt_von_nachname' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umsatzrentabilitaet_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Umsatzrentabilität (%)
                  {sortKey === 'umsatzrentabilitaet_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umsatzrentabilitaet_ziel_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Zielwert Umsatzrentabilität (%)
                  {sortKey === 'umsatzrentabilitaet_ziel_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('eigenkapitalquote_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Eigenkapitalquote (%)
                  {sortKey === 'eigenkapitalquote_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('eigenkapitalquote_ziel_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Zielwert Eigenkapitalquote (%)
                  {sortKey === 'eigenkapitalquote_ziel_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('wertschoepfung_ziel_pro_ma_eur')}>
                <span className="inline-flex items-center gap-1">
                  Zielwert Wertschöpfung pro Mitarbeiter (EUR)
                  {sortKey === 'wertschoepfung_ziel_pro_ma_eur' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('deckungsbeitrag_eur')}>
                <span className="inline-flex items-center gap-1">
                  Deckungsbeitrag (EUR)
                  {sortKey === 'deckungsbeitrag_eur' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('deckungsbeitrag_pro_ma_eur')}>
                <span className="inline-flex items-center gap-1">
                  Deckungsbeitrag pro produktivem Mitarbeiter (EUR)
                  {sortKey === 'deckungsbeitrag_pro_ma_eur' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umsatz_pro_mitarbeiter_eur')}>
                <span className="inline-flex items-center gap-1">
                  Umsatz pro Mitarbeiter (EUR)
                  {sortKey === 'umsatz_pro_mitarbeiter_eur' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('personalkosten_quote_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Personalkostenquote (%)
                  {sortKey === 'personalkosten_quote_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gesamtbewertung')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtbewertung Rentabilität
                  {sortKey === 'gesamtbewertung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bewertung_produktivitaet')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtbewertung Produktivität
                  {sortKey === 'bewertung_produktivitaet' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('staerken')}>
                <span className="inline-flex items-center gap-1">
                  Stärken des Unternehmens
                  {sortKey === 'staerken' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('schwaechen')}>
                <span className="inline-flex items-center gap-1">
                  Schwächen / Risiken
                  {sortKey === 'schwaechen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('finanzdaten_ref')}>
                <span className="inline-flex items-center gap-1">
                  Finanzdaten (BWA/Jahresabschluss)
                  {sortKey === 'finanzdaten_ref' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('auswertungsdatum')}>
                <span className="inline-flex items-center gap-1">
                  Datum der Auswertung
                  {sortKey === 'auswertungsdatum' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('erstellt_von_vorname')}>
                <span className="inline-flex items-center gap-1">
                  Erstellt von – Vorname
                  {sortKey === 'erstellt_von_vorname' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('eigenkapitalrentabilitaet_prozent')}>
                <span className="inline-flex items-center gap-1">
                  Eigenkapitalrentabilität (%)
                  {sortKey === 'eigenkapitalrentabilitaet_prozent' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('handwerkliche_wertschoepfung_eur')}>
                <span className="inline-flex items-center gap-1">
                  Handwerkliche Wertschöpfung gesamt (EUR)
                  {sortKey === 'handwerkliche_wertschoepfung_eur' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('wertschoepfung_pro_mitarbeiter_eur')}>
                <span className="inline-flex items-center gap-1">
                  Wertschöpfung pro produktivem Mitarbeiter (EUR)
                  {sortKey === 'wertschoepfung_pro_mitarbeiter_eur' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('handlungsempfehlungen_rentabilitaet')}>
                <span className="inline-flex items-center gap-1">
                  Handlungsempfehlungen Rentabilität
                  {sortKey === 'handlungsempfehlungen_rentabilitaet' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('handlungsempfehlungen_produktivitaet')}>
                <span className="inline-flex items-center gap-1">
                  Handlungsempfehlungen Produktivität
                  {sortKey === 'handlungsempfehlungen_produktivitaet' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('massnahmen_prioritaet')}>
                <span className="inline-flex items-center gap-1">
                  Prioritäre Maßnahmen
                  {sortKey === 'massnahmen_prioritaet' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('naechste_pruefung')}>
                <span className="inline-flex items-center gap-1">
                  Nächste Überprüfung geplant am
                  {sortKey === 'naechste_pruefung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('interne_notizen')}>
                <span className="inline-flex items-center gap-1">
                  Interne Notizen
                  {sortKey === 'interne_notizen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewingRecord(record); }}>
                <TableCell className="font-medium">{record.fields.erstellt_von_nachname ?? '—'}</TableCell>
                <TableCell>{record.fields.umsatzrentabilitaet_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.umsatzrentabilitaet_ziel_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.eigenkapitalquote_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.eigenkapitalquote_ziel_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.wertschoepfung_ziel_pro_ma_eur ?? '—'}</TableCell>
                <TableCell>{record.fields.deckungsbeitrag_eur ?? '—'}</TableCell>
                <TableCell>{record.fields.deckungsbeitrag_pro_ma_eur ?? '—'}</TableCell>
                <TableCell>{record.fields.umsatz_pro_mitarbeiter_eur ?? '—'}</TableCell>
                <TableCell>{record.fields.personalkosten_quote_prozent ?? '—'}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.gesamtbewertung?.label ?? '—'}</span></TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.bewertung_produktivitaet?.label ?? '—'}</span></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.staerken ?? '—'}</span></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.schwaechen ?? '—'}</span></TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getFinanzdatenBwaJahresabschlussDisplayName(record.fields.finanzdaten_ref)}</span></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.auswertungsdatum)}</TableCell>
                <TableCell>{record.fields.erstellt_von_vorname ?? '—'}</TableCell>
                <TableCell>{record.fields.eigenkapitalrentabilitaet_prozent ?? '—'}</TableCell>
                <TableCell>{record.fields.handwerkliche_wertschoepfung_eur ?? '—'}</TableCell>
                <TableCell>{record.fields.wertschoepfung_pro_mitarbeiter_eur ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.handlungsempfehlungen_rentabilitaet ?? '—'}</span></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.handlungsempfehlungen_produktivitaet ?? '—'}</span></TableCell>
                <TableCell>{Array.isArray(record.fields.massnahmen_prioritaet) ? record.fields.massnahmen_prioritaet.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.naechste_pruefung)}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.interne_notizen ?? '—'}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={26} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Kennzahlenauswertung. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <KennzahlenauswertungDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        finanzdatenBwaJahresabschlussList={finanzdatenBwaJahresabschlussList}
        enablePhotoScan={AI_PHOTO_SCAN['Kennzahlenauswertung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kennzahlenauswertung']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Kennzahlenauswertung löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      <KennzahlenauswertungViewDialog
        open={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(r) => { setViewingRecord(null); setEditingRecord(r); }}
        finanzdatenBwaJahresabschlussList={finanzdatenBwaJahresabschlussList}
      />
    </PageShell>
  );
}