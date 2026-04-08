import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichFinanzdatenBwaJahresabschluss, enrichMitarbeiterliste, enrichKennzahlenauswertung } from '@/lib/enrich';
import type { EnrichedFinanzdatenBwaJahresabschluss, EnrichedMitarbeiterliste, EnrichedKennzahlenauswertung } from '@/types/enriched';
import type { Unternehmensprofil, FinanzdatenBwaJahresabschluss, Mitarbeiterliste, Kennzahlenauswertung } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconBuilding, IconPlus, IconPencil, IconTrash,
  IconUsers, IconChartBar, IconFileText, IconTrendingUp,
  IconTrendingDown, IconAlertTriangle, IconCircleCheck,
  IconChevronRight, IconCalendar,
} from '@tabler/icons-react';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { UnternehmensprofilDialog } from '@/components/dialogs/UnternehmensprofilDialog';
import { FinanzdatenBwaJahresabschlussDialog } from '@/components/dialogs/FinanzdatenBwaJahresabschlussDialog';
import { MitarbeiterlisteDialog } from '@/components/dialogs/MitarbeiterlisteDialog';
import { KennzahlenauswertungDialog } from '@/components/dialogs/KennzahlenauswertungDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const APPGROUP_ID = '69d6407bafe1913965d589b8';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    unternehmensprofil, finanzdatenBwaJahresabschluss, mitarbeiterliste, kennzahlenauswertung,
    unternehmensprofilMap, finanzdatenBwaJahresabschlussMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedFinanzdatenBwaJahresabschluss = enrichFinanzdatenBwaJahresabschluss(finanzdatenBwaJahresabschluss, { unternehmensprofilMap });
  const enrichedMitarbeiterliste = enrichMitarbeiterliste(mitarbeiterliste, { unternehmensprofilMap });
  const enrichedKennzahlenauswertung = enrichKennzahlenauswertung(kennzahlenauswertung, { finanzdatenBwaJahresabschlussMap });

  const [selectedUnternehmenId, setSelectedUnternehmenId] = useState<string | null>(null);

  // Dialog states
  const [unternehmensprofilDialogOpen, setUnternehmensprofilDialogOpen] = useState(false);
  const [editUnternehmen, setEditUnternehmen] = useState<Unternehmensprofil | null>(null);
  const [deleteUnternehmen, setDeleteUnternehmen] = useState<Unternehmensprofil | null>(null);

  const [finanzdatenDialogOpen, setFinanzdatenDialogOpen] = useState(false);
  const [editFinanzdaten, setEditFinanzdaten] = useState<FinanzdatenBwaJahresabschluss | null>(null);
  const [deleteFinanzdaten, setDeleteFinanzdaten] = useState<FinanzdatenBwaJahresabschluss | null>(null);

  const [mitarbeiterDialogOpen, setMitarbeiterDialogOpen] = useState(false);
  const [editMitarbeiter, setEditMitarbeiter] = useState<Mitarbeiterliste | null>(null);
  const [deleteMitarbeiter, setDeleteMitarbeiter] = useState<Mitarbeiterliste | null>(null);

  const [kennzahlenDialogOpen, setKennzahlenDialogOpen] = useState(false);
  const [editKennzahlen, setEditKennzahlen] = useState<Kennzahlenauswertung | null>(null);
  const [deleteKennzahlen, setDeleteKennzahlen] = useState<Kennzahlenauswertung | null>(null);

  const selectedUnternehmen = useMemo(
    () => unternehmensprofil.find(u => u.record_id === selectedUnternehmenId) ?? (unternehmensprofil.length > 0 ? unternehmensprofil[0] : null),
    [unternehmensprofil, selectedUnternehmenId]
  );

  const activeId = selectedUnternehmen?.record_id ?? null;

  const unternehmenFinanzdaten = useMemo(
    () => enrichedFinanzdatenBwaJahresabschluss.filter(f => {
      const id = extractRecordId(f.fields.unternehmen_ref);
      return id === activeId;
    }),
    [enrichedFinanzdatenBwaJahresabschluss, activeId]
  );

  const unternehmenMitarbeiter = useMemo(
    () => enrichedMitarbeiterliste.filter(m => {
      const id = extractRecordId(m.fields.unternehmen_ma_ref);
      return id === activeId;
    }),
    [enrichedMitarbeiterliste, activeId]
  );

  const unternehmenKennzahlen = useMemo(
    () => enrichedKennzahlenauswertung.filter(k => {
      const fId = extractRecordId(k.fields.finanzdaten_ref);
      return unternehmenFinanzdaten.some(f => f.record_id === fId);
    }),
    [enrichedKennzahlenauswertung, unternehmenFinanzdaten]
  );

  const letzteKennzahlen = useMemo(
    () => unternehmenKennzahlen.sort((a, b) => (b.fields.auswertungsdatum ?? '').localeCompare(a.fields.auswertungsdatum ?? ''))[0] ?? null,
    [unternehmenKennzahlen]
  );

  const aktiveMitarbeiter = useMemo(
    () => unternehmenMitarbeiter.filter(m => m.fields.ist_aktiv !== false),
    [unternehmenMitarbeiter]
  );

  const chartData = useMemo(() => {
    return unternehmenFinanzdaten
      .filter(f => f.fields.umsatzerloese != null)
      .sort((a, b) => (a.fields.berichtszeitraum ?? '').localeCompare(b.fields.berichtszeitraum ?? ''))
      .slice(-6)
      .map(f => ({
        name: f.fields.berichtszeitraum ?? '—',
        Umsatz: f.fields.umsatzerloese ?? 0,
        EBIT: f.fields.ebit ?? 0,
        Personalkosten: f.fields.personalkosten ?? 0,
      }));
  }, [unternehmenFinanzdaten]);

  const kostenPieData = useMemo(() => {
    const latest = unternehmenFinanzdaten
      .filter(f => f.fields.umsatzerloese != null && f.fields.ebit != null)
      .sort((a, b) => (b.fields.berichtszeitraum ?? '').localeCompare(a.fields.berichtszeitraum ?? ''))[0];
    if (!latest) return [];
    const umsatz = latest.fields.umsatzerloese ?? 0;
    const ebit = latest.fields.ebit ?? 0;
    const personalkosten = latest.fields.personalkosten ?? 0;
    const gesamtkosten = umsatz - ebit;
    const sonstigeKosten = Math.max(0, gesamtkosten - personalkosten);
    const data = [];
    if (personalkosten > 0) data.push({ name: 'Personalkosten', value: personalkosten });
    if (sonstigeKosten > 0) data.push({ name: 'Sonstige Kosten', value: sonstigeKosten });
    return data;
  }, [unternehmenFinanzdaten]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  function getBewertungColor(key: string | undefined) {
    if (!key) return 'text-muted-foreground';
    if (key === 'sehr_gut' || key === 'prod_sehr_gut') return 'text-green-600';
    if (key === 'gut' || key === 'prod_gut') return 'text-blue-600';
    if (key === 'befriedigend' || key === 'prod_befriedigend') return 'text-amber-600';
    return 'text-destructive';
  }

  function getBewertungBg(key: string | undefined) {
    if (!key) return 'bg-muted';
    if (key === 'sehr_gut' || key === 'prod_sehr_gut') return 'bg-green-50 border-green-200';
    if (key === 'gut' || key === 'prod_gut') return 'bg-blue-50 border-blue-200';
    if (key === 'befriedigend' || key === 'prod_befriedigend') return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  }

  function getBewertungIcon(key: string | undefined) {
    if (!key) return null;
    if (key === 'sehr_gut' || key === 'gut' || key === 'prod_sehr_gut' || key === 'prod_gut')
      return <IconCircleCheck size={16} className="shrink-0" />;
    if (key === 'befriedigend' || key === 'prod_befriedigend')
      return <IconTrendingDown size={16} className="shrink-0" />;
    return <IconAlertTriangle size={16} className="shrink-0" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Unternehmensanalyse</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{unternehmensprofil.length} Unternehmen · {mitarbeiterliste.length} Mitarbeiter</p>
        </div>
        <Button size="sm" onClick={() => { setEditUnternehmen(null); setUnternehmensprofilDialogOpen(true); }}>
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Unternehmen anlegen
        </Button>
      </div>

      {unternehmensprofil.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-2xl border-2 border-dashed border-border">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <IconBuilding size={28} className="text-muted-foreground" stroke={1.5} />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-foreground mb-1">Noch kein Unternehmen</h3>
            <p className="text-sm text-muted-foreground">Lege dein erstes Unternehmen an, um loszulegen.</p>
          </div>
          <Button onClick={() => { setEditUnternehmen(null); setUnternehmensprofilDialogOpen(true); }}>
            <IconPlus size={16} className="mr-1.5" />Unternehmen anlegen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: Unternehmensauswahl */}
          <div className="lg:col-span-1 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-3">Unternehmen</p>
            {unternehmensprofil.map(u => (
              <button
                key={u.record_id}
                onClick={() => setSelectedUnternehmenId(u.record_id)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all group ${
                  u.record_id === (selectedUnternehmen?.record_id)
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card border-border hover:border-primary/40 hover:bg-accent/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className={`font-medium text-sm truncate ${u.record_id === selectedUnternehmen?.record_id ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {u.fields.unternehmensname ?? '—'}
                    </p>
                    <p className={`text-xs truncate mt-0.5 ${u.record_id === selectedUnternehmen?.record_id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {u.fields.branche?.label ?? u.fields.rechtsform?.label ?? ''}
                    </p>
                  </div>
                  <IconChevronRight size={14} className={`shrink-0 ${u.record_id === selectedUnternehmen?.record_id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />
                </div>
              </button>
            ))}
          </div>

          {/* Hauptbereich */}
          {selectedUnternehmen ? (
            <div className="lg:col-span-3 space-y-6 min-w-0">
              {/* Unternehmens-Header */}
              <div className="rounded-2xl border border-border bg-card p-5 overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-foreground truncate">
                      {selectedUnternehmen.fields.unternehmensname ?? '—'}
                    </h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedUnternehmen.fields.rechtsform && (
                        <Badge variant="secondary">{selectedUnternehmen.fields.rechtsform.label}</Badge>
                      )}
                      {selectedUnternehmen.fields.branche && (
                        <Badge variant="outline">{selectedUnternehmen.fields.branche.label}</Badge>
                      )}
                      {selectedUnternehmen.fields.geschaeftsjahr && (
                        <Badge variant="outline">GJ {selectedUnternehmen.fields.geschaeftsjahr}</Badge>
                      )}
                    </div>
                    {(selectedUnternehmen.fields.ansprechpartner_vorname || selectedUnternehmen.fields.ansprechpartner_nachname) && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Ansprechpartner: {[selectedUnternehmen.fields.ansprechpartner_vorname, selectedUnternehmen.fields.ansprechpartner_nachname].filter(Boolean).join(' ')}
                        {selectedUnternehmen.fields.ansprechpartner_email && ` · ${selectedUnternehmen.fields.ansprechpartner_email}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => { setEditUnternehmen(selectedUnternehmen); setUnternehmensprofilDialogOpen(true); }}>
                      <IconPencil size={14} className="mr-1 shrink-0" />Bearbeiten
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteUnternehmen(selectedUnternehmen)}>
                      <IconTrash size={14} className="shrink-0" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* KPI-Karten */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  title="Finanzdokumente"
                  value={String(unternehmenFinanzdaten.length)}
                  description="BWA / Jahresabschluss"
                  icon={<IconFileText size={18} className="text-muted-foreground" />}
                />
                <StatCard
                  title="Mitarbeiter"
                  value={String(aktiveMitarbeiter.length)}
                  description={`${unternehmenMitarbeiter.length} gesamt`}
                  icon={<IconUsers size={18} className="text-muted-foreground" />}
                />
                <StatCard
                  title="Auswertungen"
                  value={String(unternehmenKennzahlen.length)}
                  description="Kennzahlenberichte"
                  icon={<IconChartBar size={18} className="text-muted-foreground" />}
                />
                <StatCard
                  title="Letzte Prüfung"
                  value={letzteKennzahlen?.fields.naechste_pruefung ? formatDate(letzteKennzahlen.fields.naechste_pruefung) : '—'}
                  description="Nächste Prüfung"
                  icon={<IconCalendar size={18} className="text-muted-foreground" />}
                />
              </div>

              {/* Letzte Kennzahlen-Bewertung */}
              {letzteKennzahlen && (
                <div className={`rounded-2xl border p-5 overflow-hidden ${getBewertungBg(letzteKennzahlen.fields.gesamtbewertung?.key)}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Letzte Gesamtbewertung</p>
                      <div className={`flex items-center gap-1.5 font-semibold text-lg ${getBewertungColor(letzteKennzahlen.fields.gesamtbewertung?.key)}`}>
                        {getBewertungIcon(letzteKennzahlen.fields.gesamtbewertung?.key)}
                        {letzteKennzahlen.fields.gesamtbewertung?.label ?? '—'}
                      </div>
                      {letzteKennzahlen.fields.auswertungsdatum && (
                        <p className="text-xs text-muted-foreground mt-0.5">vom {formatDate(letzteKennzahlen.fields.auswertungsdatum)}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => { setEditKennzahlen(letzteKennzahlen); setKennzahlenDialogOpen(true); }}>
                        <IconPencil size={14} className="mr-1 shrink-0" />Bearbeiten
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <KennzahlRow label="Umsatzrentabilität" value={letzteKennzahlen.fields.umsatzrentabilitaet_prozent} ziel={letzteKennzahlen.fields.umsatzrentabilitaet_ziel_prozent} unit="%" />
                    <KennzahlRow label="Eigenkapitalquote" value={letzteKennzahlen.fields.eigenkapitalquote_prozent} ziel={letzteKennzahlen.fields.eigenkapitalquote_ziel_prozent} unit="%" />
                    <KennzahlRow label="Personalkostenquote" value={letzteKennzahlen.fields.personalkosten_quote_prozent} unit="%" invertiert />
                    <KennzahlRow label="Umsatz je MA" value={letzteKennzahlen.fields.umsatz_pro_mitarbeiter_eur} unit="€" currency />
                  </div>
                  {(letzteKennzahlen.fields.staerken || letzteKennzahlen.fields.schwaechen) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
                      {letzteKennzahlen.fields.staerken && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1"><IconTrendingUp size={12} />Stärken</p>
                          <p className="text-sm text-foreground line-clamp-3">{letzteKennzahlen.fields.staerken}</p>
                        </div>
                      )}
                      {letzteKennzahlen.fields.schwaechen && (
                        <div>
                          <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><IconTrendingDown size={12} />Schwächen</p>
                          <p className="text-sm text-foreground line-clamp-3">{letzteKennzahlen.fields.schwaechen}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Chart: Umsatzentwicklung */}
              {chartData.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-foreground">Finanzkennzahlen im Verlauf</p>
                  </div>
                  <div className="overflow-x-auto">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                        <XAxis dataKey="name" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                        <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                          formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        />
                        <Bar dataKey="Umsatz" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="EBIT" fill="var(--chart-2, #22c55e)" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`ebit-${index}`} fill={entry.EBIT < 0 ? '#ef4444' : 'var(--chart-2, #22c55e)'} />
                          ))}
                        </Bar>
                        <Bar dataKey="Personalkosten" fill="var(--chart-3, #f59e0b)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Kostenaufteilung Tortendiagramm */}
              {kostenPieData.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5 overflow-hidden">
                  <p className="font-semibold text-foreground mb-4">Kostenaufteilung</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={kostenPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {kostenPieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? 'var(--primary)' : 'var(--chart-3, #f59e0b)'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        formatter={(value: number) => [formatCurrency(value)]}
                      />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Finanzdaten-Liste */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <p className="font-semibold text-foreground">Finanzdokumente</p>
                  <Button size="sm" variant="outline" onClick={() => { setEditFinanzdaten(null); setFinanzdatenDialogOpen(true); }}>
                    <IconPlus size={14} className="mr-1 shrink-0" />Hinzufügen
                  </Button>
                </div>
                {unternehmenFinanzdaten.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
                    <IconFileText size={32} stroke={1.5} />
                    <p className="text-sm">Noch keine Finanzdokumente</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {unternehmenFinanzdaten.map(f => (
                      <div key={f.record_id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {f.fields.berichtszeitraum ?? '—'}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-0.5">
                            {f.fields.dokument_typ && <span className="text-xs text-muted-foreground">{f.fields.dokument_typ.label}</span>}
                            {f.fields.umsatzerloese != null && <span className="text-xs text-muted-foreground">Umsatz: {formatCurrency(f.fields.umsatzerloese)}</span>}
                            {f.fields.ebit != null && <span className={`text-xs font-medium ${f.fields.ebit < 0 ? 'text-destructive' : 'text-green-600'}`}>EBIT: {formatCurrency(f.fields.ebit)}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => { setEditFinanzdaten(f); setFinanzdatenDialogOpen(true); }}>
                            <IconPencil size={14} className="shrink-0" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteFinanzdaten(f)}>
                            <IconTrash size={14} className="shrink-0" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mitarbeiterliste */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <p className="font-semibold text-foreground">Mitarbeiter</p>
                  <Button size="sm" variant="outline" onClick={() => { setEditMitarbeiter(null); setMitarbeiterDialogOpen(true); }}>
                    <IconPlus size={14} className="mr-1 shrink-0" />Hinzufügen
                  </Button>
                </div>
                {unternehmenMitarbeiter.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
                    <IconUsers size={32} stroke={1.5} />
                    <p className="text-sm">Noch keine Mitarbeiter</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {unternehmenMitarbeiter.map(m => (
                      <div key={m.record_id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {(m.fields.mitarbeiter_vorname?.[0] ?? '') + (m.fields.mitarbeiter_nachname?.[0] ?? '')}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {[m.fields.mitarbeiter_vorname, m.fields.mitarbeiter_nachname].filter(Boolean).join(' ') || '—'}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-0.5">
                              {m.fields.taetigkeit_kategorie && <span className="text-xs text-muted-foreground">{m.fields.taetigkeit_kategorie.label}</span>}
                              {m.fields.beschaeftigungsgrad_prozent != null && <span className="text-xs text-muted-foreground">{m.fields.beschaeftigungsgrad_prozent}%</span>}
                              {m.fields.ist_aktiv === false && <Badge variant="secondary" className="text-xs py-0">Inaktiv</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => { setEditMitarbeiter(m); setMitarbeiterDialogOpen(true); }}>
                            <IconPencil size={14} className="shrink-0" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteMitarbeiter(m)}>
                            <IconTrash size={14} className="shrink-0" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Kennzahlenauswertungen */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <p className="font-semibold text-foreground">Kennzahlenauswertungen</p>
                  <Button size="sm" variant="outline" onClick={() => { setEditKennzahlen(null); setKennzahlenDialogOpen(true); }}>
                    <IconPlus size={14} className="mr-1 shrink-0" />Hinzufügen
                  </Button>
                </div>
                {unternehmenKennzahlen.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground">
                    <IconChartBar size={32} stroke={1.5} />
                    <p className="text-sm">Noch keine Auswertungen</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {unternehmenKennzahlen.map(k => (
                      <div key={k.record_id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm text-foreground">
                              {k.fields.auswertungsdatum ? formatDate(k.fields.auswertungsdatum) : '—'}
                            </p>
                            {k.fields.gesamtbewertung && (
                              <Badge variant="outline" className={`text-xs ${getBewertungColor(k.fields.gesamtbewertung.key)}`}>
                                {k.fields.gesamtbewertung.label}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-0.5">
                            {k.fields.umsatzrentabilitaet_prozent != null && (
                              <span className="text-xs text-muted-foreground">Rentabilität: {k.fields.umsatzrentabilitaet_prozent}%</span>
                            )}
                            {k.fields.eigenkapitalquote_prozent != null && (
                              <span className="text-xs text-muted-foreground">EK-Quote: {k.fields.eigenkapitalquote_prozent}%</span>
                            )}
                            {k.finanzdaten_refName && (
                              <span className="text-xs text-muted-foreground">Basis: {k.finanzdaten_refName}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => { setEditKennzahlen(k); setKennzahlenDialogOpen(true); }}>
                            <IconPencil size={14} className="shrink-0" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteKennzahlen(k)}>
                            <IconTrash size={14} className="shrink-0" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Dialogs */}
      <UnternehmensprofilDialog
        open={unternehmensprofilDialogOpen}
        onClose={() => { setUnternehmensprofilDialogOpen(false); setEditUnternehmen(null); }}
        onSubmit={async (fields) => {
          if (editUnternehmen) {
            await LivingAppsService.updateUnternehmensprofilEntry(editUnternehmen.record_id, fields);
          } else {
            await LivingAppsService.createUnternehmensprofilEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editUnternehmen?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Unternehmensprofil']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmensprofil']}
      />

      <FinanzdatenBwaJahresabschlussDialog
        open={finanzdatenDialogOpen}
        onClose={() => { setFinanzdatenDialogOpen(false); setEditFinanzdaten(null); }}
        onSubmit={async (fields) => {
          if (editFinanzdaten) {
            await LivingAppsService.updateFinanzdatenBwaJahresabschlus(editFinanzdaten.record_id, fields);
          } else {
            const fieldsWithRef = activeId
              ? { ...fields, unternehmen_ref: createRecordUrl(APP_IDS.UNTERNEHMENSPROFIL, activeId) }
              : fields;
            await LivingAppsService.createFinanzdatenBwaJahresabschlus(fieldsWithRef);
          }
          fetchAll();
        }}
        defaultValues={editFinanzdaten
          ? editFinanzdaten.fields
          : activeId
            ? { unternehmen_ref: createRecordUrl(APP_IDS.UNTERNEHMENSPROFIL, activeId) }
            : undefined}
        unternehmensprofilList={unternehmensprofil}
        enablePhotoScan={AI_PHOTO_SCAN['FinanzdatenBwaJahresabschluss']}
        enablePhotoLocation={AI_PHOTO_LOCATION['FinanzdatenBwaJahresabschluss']}
      />

      <MitarbeiterlisteDialog
        open={mitarbeiterDialogOpen}
        onClose={() => { setMitarbeiterDialogOpen(false); setEditMitarbeiter(null); }}
        onSubmit={async (fields) => {
          if (editMitarbeiter) {
            await LivingAppsService.updateMitarbeiterlisteEntry(editMitarbeiter.record_id, fields);
          } else {
            const fieldsWithRef = activeId
              ? { ...fields, unternehmen_ma_ref: createRecordUrl(APP_IDS.UNTERNEHMENSPROFIL, activeId) }
              : fields;
            await LivingAppsService.createMitarbeiterlisteEntry(fieldsWithRef);
          }
          fetchAll();
        }}
        defaultValues={editMitarbeiter
          ? editMitarbeiter.fields
          : activeId
            ? { unternehmen_ma_ref: createRecordUrl(APP_IDS.UNTERNEHMENSPROFIL, activeId) }
            : undefined}
        unternehmensprofilList={unternehmensprofil}
        enablePhotoScan={AI_PHOTO_SCAN['Mitarbeiterliste']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeiterliste']}
      />

      <KennzahlenauswertungDialog
        open={kennzahlenDialogOpen}
        onClose={() => { setKennzahlenDialogOpen(false); setEditKennzahlen(null); }}
        onSubmit={async (fields) => {
          if (editKennzahlen) {
            await LivingAppsService.updateKennzahlenauswertungEntry(editKennzahlen.record_id, fields);
          } else {
            await LivingAppsService.createKennzahlenauswertungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editKennzahlen?.fields}
        finanzdatenBwaJahresabschlussList={finanzdatenBwaJahresabschluss}
        enablePhotoScan={AI_PHOTO_SCAN['Kennzahlenauswertung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kennzahlenauswertung']}
      />

      <ConfirmDialog
        open={!!deleteUnternehmen}
        title="Unternehmen löschen"
        description={`Möchtest du "${deleteUnternehmen?.fields.unternehmensname ?? 'dieses Unternehmen'}" wirklich löschen? Alle zugehörigen Daten bleiben erhalten.`}
        onConfirm={async () => {
          if (deleteUnternehmen) {
            await LivingAppsService.deleteUnternehmensprofilEntry(deleteUnternehmen.record_id);
            setSelectedUnternehmenId(null);
            fetchAll();
          }
          setDeleteUnternehmen(null);
        }}
        onClose={() => setDeleteUnternehmen(null)}
      />

      <ConfirmDialog
        open={!!deleteFinanzdaten}
        title="Finanzdokument löschen"
        description={`Möchtest du den Bericht "${deleteFinanzdaten?.fields.berichtszeitraum ?? '—'}" wirklich löschen?`}
        onConfirm={async () => {
          if (deleteFinanzdaten) {
            await LivingAppsService.deleteFinanzdatenBwaJahresabschlus(deleteFinanzdaten.record_id);
            fetchAll();
          }
          setDeleteFinanzdaten(null);
        }}
        onClose={() => setDeleteFinanzdaten(null)}
      />

      <ConfirmDialog
        open={!!deleteMitarbeiter}
        title="Mitarbeiter löschen"
        description={`Möchtest du "${[deleteMitarbeiter?.fields.mitarbeiter_vorname, deleteMitarbeiter?.fields.mitarbeiter_nachname].filter(Boolean).join(' ') || 'diesen Mitarbeiter'}" wirklich löschen?`}
        onConfirm={async () => {
          if (deleteMitarbeiter) {
            await LivingAppsService.deleteMitarbeiterlisteEntry(deleteMitarbeiter.record_id);
            fetchAll();
          }
          setDeleteMitarbeiter(null);
        }}
        onClose={() => setDeleteMitarbeiter(null)}
      />

      <ConfirmDialog
        open={!!deleteKennzahlen}
        title="Kennzahlenauswertung löschen"
        description="Möchtest du diese Auswertung wirklich löschen?"
        onConfirm={async () => {
          if (deleteKennzahlen) {
            await LivingAppsService.deleteKennzahlenauswertungEntry(deleteKennzahlen.record_id);
            fetchAll();
          }
          setDeleteKennzahlen(null);
        }}
        onClose={() => setDeleteKennzahlen(null)}
      />
    </div>
  );
}

function KennzahlRow({
  label, value, ziel, unit, currency, invertiert
}: {
  label: string;
  value: number | undefined;
  ziel?: number | undefined;
  unit: string;
  currency?: boolean;
  invertiert?: boolean;
}) {
  if (value == null) return null;
  const isGood = ziel != null
    ? (invertiert ? value <= ziel : value >= ziel)
    : value > 0;
  const percentage = ziel != null ? Math.min(100, Math.round((value / ziel) * 100)) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-sm font-semibold ${isGood ? 'text-green-700' : 'text-amber-700'}`}>
          {currency ? formatCurrency(value) : `${value}${unit}`}
          {ziel != null && <span className="text-xs font-normal text-muted-foreground ml-1">/ Ziel: {currency ? formatCurrency(ziel) : `${ziel}${unit}`}</span>}
        </span>
      </div>
      {percentage != null && (
        <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isGood ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
