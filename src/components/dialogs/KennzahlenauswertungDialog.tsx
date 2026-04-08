import { useState, useEffect, useRef, useCallback } from 'react';
import type { Kennzahlenauswertung, FinanzdatenBwaJahresabschluss } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconCircleCheck, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface KennzahlenauswertungDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Kennzahlenauswertung['fields']) => Promise<void>;
  defaultValues?: Kennzahlenauswertung['fields'];
  finanzdatenBwaJahresabschlussList: FinanzdatenBwaJahresabschluss[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function KennzahlenauswertungDialog({ open, onClose, onSubmit, defaultValues, finanzdatenBwaJahresabschlussList, enablePhotoScan = true, enablePhotoLocation = true }: KennzahlenauswertungDialogProps) {
  const [fields, setFields] = useState<Partial<Kennzahlenauswertung['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'kennzahlenauswertung');
      await onSubmit(clean as Kennzahlenauswertung['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    setScanSuccess(false);
    try {
      const [uri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
      if (file.type.startsWith('image/')) setPreview(uri);
      const gps = enablePhotoLocation ? meta?.gps ?? null : null;
      const parts: string[] = [];
      let geoAddr = '';
      if (gps) {
        geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
        parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
        if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
      }
      if (meta?.dateTime) {
        parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="finanzdaten_ref" entity="Finanzdaten (BWA/Jahresabschluss)">\n${JSON.stringify(finanzdatenBwaJahresabschlussList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "erstellt_von_nachname": string | null, // Erstellt von – Nachname\n  "umsatzrentabilitaet_prozent": number | null, // Umsatzrentabilität (%)\n  "umsatzrentabilitaet_ziel_prozent": number | null, // Zielwert Umsatzrentabilität (%)\n  "eigenkapitalquote_prozent": number | null, // Eigenkapitalquote (%)\n  "eigenkapitalquote_ziel_prozent": number | null, // Zielwert Eigenkapitalquote (%)\n  "wertschoepfung_ziel_pro_ma_eur": number | null, // Zielwert Wertschöpfung pro Mitarbeiter (EUR)\n  "deckungsbeitrag_eur": number | null, // Deckungsbeitrag (EUR)\n  "deckungsbeitrag_pro_ma_eur": number | null, // Deckungsbeitrag pro produktivem Mitarbeiter (EUR)\n  "umsatz_pro_mitarbeiter_eur": number | null, // Umsatz pro Mitarbeiter (EUR)\n  "personalkosten_quote_prozent": number | null, // Personalkostenquote (%)\n  "gesamtbewertung": LookupValue | null, // Gesamtbewertung Rentabilität (select one key: "sehr_gut" | "gut" | "befriedigend" | "kritisch") mapping: sehr_gut=Sehr gut (überdurchschnittlich), gut=Gut (branchenüblich), befriedigend=Befriedigend (Verbesserungsbedarf), kritisch=Kritisch (dringender Handlungsbedarf)\n  "bewertung_produktivitaet": LookupValue | null, // Gesamtbewertung Produktivität (select one key: "prod_sehr_gut" | "prod_gut" | "prod_befriedigend" | "prod_kritisch") mapping: prod_sehr_gut=Sehr gut (überdurchschnittlich), prod_gut=Gut (branchenüblich), prod_befriedigend=Befriedigend (Verbesserungsbedarf), prod_kritisch=Kritisch (dringender Handlungsbedarf)\n  "staerken": string | null, // Stärken des Unternehmens\n  "schwaechen": string | null, // Schwächen / Risiken\n  "finanzdaten_ref": string | null, // Display name from Finanzdaten (BWA/Jahresabschluss) (see <available-records>)\n  "auswertungsdatum": string | null, // YYYY-MM-DD\n  "erstellt_von_vorname": string | null, // Erstellt von – Vorname\n  "eigenkapitalrentabilitaet_prozent": number | null, // Eigenkapitalrentabilität (%)\n  "handwerkliche_wertschoepfung_eur": number | null, // Handwerkliche Wertschöpfung gesamt (EUR)\n  "wertschoepfung_pro_mitarbeiter_eur": number | null, // Wertschöpfung pro produktivem Mitarbeiter (EUR)\n  "handlungsempfehlungen_rentabilitaet": string | null, // Handlungsempfehlungen Rentabilität\n  "handlungsempfehlungen_produktivitaet": string | null, // Handlungsempfehlungen Produktivität\n  "massnahmen_prioritaet": LookupValue[] | null, // Prioritäre Maßnahmen (select one or more keys: "preisgestaltung" | "material_optimieren" | "personal_anpassen" | "produktive_stunden" | "overhead" | "eigenkapital_staerken" | "liquiditaet" | "umsatz_steigern" | "neue_felder" | "controlling") mapping: preisgestaltung=Preisgestaltung überprüfen, material_optimieren=Materialeinsatz optimieren, personal_anpassen=Personalstruktur anpassen, produktive_stunden=Produktive Stunden steigern, overhead=Overhead reduzieren, eigenkapital_staerken=Eigenkapital stärken, liquiditaet=Liquidität verbessern, umsatz_steigern=Umsatz steigern, neue_felder=Neue Geschäftsfelder erschließen, controlling=Controlling einführen / verbessern\n  "naechste_pruefung": string | null, // YYYY-MM-DD\n  "interne_notizen": string | null, // Interne Notizen\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["finanzdaten_ref"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const finanzdaten_refName = raw['finanzdaten_ref'] as string | null;
        if (finanzdaten_refName) {
          const finanzdaten_refMatch = finanzdatenBwaJahresabschlussList.find(r => matchName(finanzdaten_refName!, [String(r.fields.berichtszeitraum ?? '')]));
          if (finanzdaten_refMatch) merged['finanzdaten_ref'] = createRecordUrl(APP_IDS.FINANZDATEN_BWA_JAHRESABSCHLUSS, finanzdaten_refMatch.record_id);
        }
        return merged as Partial<Kennzahlenauswertung['fields']>;
      });
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handlePhotoScan(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handlePhotoScan(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Kennzahlenauswertung bearbeiten' : 'Kennzahlenauswertung hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht deine Fotos / Dokumente und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="erstellt_von_nachname">Erstellt von – Nachname</Label>
            <Input
              id="erstellt_von_nachname"
              value={fields.erstellt_von_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, erstellt_von_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="umsatzrentabilitaet_prozent">Umsatzrentabilität (%)</Label>
            <Input
              id="umsatzrentabilitaet_prozent"
              type="number"
              value={fields.umsatzrentabilitaet_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, umsatzrentabilitaet_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="umsatzrentabilitaet_ziel_prozent">Zielwert Umsatzrentabilität (%)</Label>
            <Input
              id="umsatzrentabilitaet_ziel_prozent"
              type="number"
              value={fields.umsatzrentabilitaet_ziel_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, umsatzrentabilitaet_ziel_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eigenkapitalquote_prozent">Eigenkapitalquote (%)</Label>
            <Input
              id="eigenkapitalquote_prozent"
              type="number"
              value={fields.eigenkapitalquote_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, eigenkapitalquote_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eigenkapitalquote_ziel_prozent">Zielwert Eigenkapitalquote (%)</Label>
            <Input
              id="eigenkapitalquote_ziel_prozent"
              type="number"
              value={fields.eigenkapitalquote_ziel_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, eigenkapitalquote_ziel_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wertschoepfung_ziel_pro_ma_eur">Zielwert Wertschöpfung pro Mitarbeiter (EUR)</Label>
            <Input
              id="wertschoepfung_ziel_pro_ma_eur"
              type="number"
              value={fields.wertschoepfung_ziel_pro_ma_eur ?? ''}
              onChange={e => setFields(f => ({ ...f, wertschoepfung_ziel_pro_ma_eur: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deckungsbeitrag_eur">Deckungsbeitrag (EUR)</Label>
            <Input
              id="deckungsbeitrag_eur"
              type="number"
              value={fields.deckungsbeitrag_eur ?? ''}
              onChange={e => setFields(f => ({ ...f, deckungsbeitrag_eur: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deckungsbeitrag_pro_ma_eur">Deckungsbeitrag pro produktivem Mitarbeiter (EUR)</Label>
            <Input
              id="deckungsbeitrag_pro_ma_eur"
              type="number"
              value={fields.deckungsbeitrag_pro_ma_eur ?? ''}
              onChange={e => setFields(f => ({ ...f, deckungsbeitrag_pro_ma_eur: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="umsatz_pro_mitarbeiter_eur">Umsatz pro Mitarbeiter (EUR)</Label>
            <Input
              id="umsatz_pro_mitarbeiter_eur"
              type="number"
              value={fields.umsatz_pro_mitarbeiter_eur ?? ''}
              onChange={e => setFields(f => ({ ...f, umsatz_pro_mitarbeiter_eur: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="personalkosten_quote_prozent">Personalkostenquote (%)</Label>
            <Input
              id="personalkosten_quote_prozent"
              type="number"
              value={fields.personalkosten_quote_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, personalkosten_quote_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtbewertung">Gesamtbewertung Rentabilität</Label>
            <Select
              value={lookupKey(fields.gesamtbewertung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, gesamtbewertung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="gesamtbewertung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="sehr_gut">Sehr gut (überdurchschnittlich)</SelectItem>
                <SelectItem value="gut">Gut (branchenüblich)</SelectItem>
                <SelectItem value="befriedigend">Befriedigend (Verbesserungsbedarf)</SelectItem>
                <SelectItem value="kritisch">Kritisch (dringender Handlungsbedarf)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bewertung_produktivitaet">Gesamtbewertung Produktivität</Label>
            <Select
              value={lookupKey(fields.bewertung_produktivitaet) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, bewertung_produktivitaet: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="bewertung_produktivitaet"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="prod_sehr_gut">Sehr gut (überdurchschnittlich)</SelectItem>
                <SelectItem value="prod_gut">Gut (branchenüblich)</SelectItem>
                <SelectItem value="prod_befriedigend">Befriedigend (Verbesserungsbedarf)</SelectItem>
                <SelectItem value="prod_kritisch">Kritisch (dringender Handlungsbedarf)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="staerken">Stärken des Unternehmens</Label>
            <Textarea
              id="staerken"
              value={fields.staerken ?? ''}
              onChange={e => setFields(f => ({ ...f, staerken: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schwaechen">Schwächen / Risiken</Label>
            <Textarea
              id="schwaechen"
              value={fields.schwaechen ?? ''}
              onChange={e => setFields(f => ({ ...f, schwaechen: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finanzdaten_ref">Finanzdaten (BWA/Jahresabschluss)</Label>
            <Select
              value={extractRecordId(fields.finanzdaten_ref) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, finanzdaten_ref: v === 'none' ? undefined : createRecordUrl(APP_IDS.FINANZDATEN_BWA_JAHRESABSCHLUSS, v) }))}
            >
              <SelectTrigger id="finanzdaten_ref"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {finanzdatenBwaJahresabschlussList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.berichtszeitraum ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="auswertungsdatum">Datum der Auswertung</Label>
            <Input
              id="auswertungsdatum"
              type="date"
              value={fields.auswertungsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, auswertungsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="erstellt_von_vorname">Erstellt von – Vorname</Label>
            <Input
              id="erstellt_von_vorname"
              value={fields.erstellt_von_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, erstellt_von_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eigenkapitalrentabilitaet_prozent">Eigenkapitalrentabilität (%)</Label>
            <Input
              id="eigenkapitalrentabilitaet_prozent"
              type="number"
              value={fields.eigenkapitalrentabilitaet_prozent ?? ''}
              onChange={e => setFields(f => ({ ...f, eigenkapitalrentabilitaet_prozent: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="handwerkliche_wertschoepfung_eur">Handwerkliche Wertschöpfung gesamt (EUR)</Label>
            <Input
              id="handwerkliche_wertschoepfung_eur"
              type="number"
              value={fields.handwerkliche_wertschoepfung_eur ?? ''}
              onChange={e => setFields(f => ({ ...f, handwerkliche_wertschoepfung_eur: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wertschoepfung_pro_mitarbeiter_eur">Wertschöpfung pro produktivem Mitarbeiter (EUR)</Label>
            <Input
              id="wertschoepfung_pro_mitarbeiter_eur"
              type="number"
              value={fields.wertschoepfung_pro_mitarbeiter_eur ?? ''}
              onChange={e => setFields(f => ({ ...f, wertschoepfung_pro_mitarbeiter_eur: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="handlungsempfehlungen_rentabilitaet">Handlungsempfehlungen Rentabilität</Label>
            <Textarea
              id="handlungsempfehlungen_rentabilitaet"
              value={fields.handlungsempfehlungen_rentabilitaet ?? ''}
              onChange={e => setFields(f => ({ ...f, handlungsempfehlungen_rentabilitaet: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="handlungsempfehlungen_produktivitaet">Handlungsempfehlungen Produktivität</Label>
            <Textarea
              id="handlungsempfehlungen_produktivitaet"
              value={fields.handlungsempfehlungen_produktivitaet ?? ''}
              onChange={e => setFields(f => ({ ...f, handlungsempfehlungen_produktivitaet: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="massnahmen_prioritaet">Prioritäre Maßnahmen</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="massnahmen_prioritaet_preisgestaltung"
                  checked={lookupKeys(fields.massnahmen_prioritaet).includes('preisgestaltung')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.massnahmen_prioritaet);
                      const next = checked ? [...current, 'preisgestaltung'] : current.filter(k => k !== 'preisgestaltung');
                      return { ...f, massnahmen_prioritaet: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="massnahmen_prioritaet_preisgestaltung" className="font-normal">Preisgestaltung überprüfen</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="massnahmen_prioritaet_material_optimieren"
                  checked={lookupKeys(fields.massnahmen_prioritaet).includes('material_optimieren')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.massnahmen_prioritaet);
                      const next = checked ? [...current, 'material_optimieren'] : current.filter(k => k !== 'material_optimieren');
                      return { ...f, massnahmen_prioritaet: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="massnahmen_prioritaet_material_optimieren" className="font-normal">Materialeinsatz optimieren</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="massnahmen_prioritaet_personal_anpassen"
                  checked={lookupKeys(fields.massnahmen_prioritaet).includes('personal_anpassen')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.massnahmen_prioritaet);
                      const next = checked ? [...current, 'personal_anpassen'] : current.filter(k => k !== 'personal_anpassen');
                      return { ...f, massnahmen_prioritaet: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="massnahmen_prioritaet_personal_anpassen" className="font-normal">Personalstruktur anpassen</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="massnahmen_prioritaet_produktive_stunden"
                  checked={lookupKeys(fields.massnahmen_prioritaet).includes('produktive_stunden')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.massnahmen_prioritaet);
                      const next = checked ? [...current, 'produktive_stunden'] : current.filter(k => k !== 'produktive_stunden');
                      return { ...f, massnahmen_prioritaet: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="massnahmen_prioritaet_produktive_stunden" className="font-normal">Produktive Stunden steigern</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="massnahmen_prioritaet_overhead"
                  checked={lookupKeys(fields.massnahmen_prioritaet).includes('overhead')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.massnahmen_prioritaet);
                      const next = checked ? [...current, 'overhead'] : current.filter(k => k !== 'overhead');
                      return { ...f, massnahmen_prioritaet: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="massnahmen_prioritaet_overhead" className="font-normal">Overhead reduzieren</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="massnahmen_prioritaet_eigenkapital_staerken"
                  checked={lookupKeys(fields.massnahmen_prioritaet).includes('eigenkapital_staerken')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.massnahmen_prioritaet);
                      const next = checked ? [...current, 'eigenkapital_staerken'] : current.filter(k => k !== 'eigenkapital_staerken');
                      return { ...f, massnahmen_prioritaet: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="massnahmen_prioritaet_eigenkapital_staerken" className="font-normal">Eigenkapital stärken</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="massnahmen_prioritaet_liquiditaet"
                  checked={lookupKeys(fields.massnahmen_prioritaet).includes('liquiditaet')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.massnahmen_prioritaet);
                      const next = checked ? [...current, 'liquiditaet'] : current.filter(k => k !== 'liquiditaet');
                      return { ...f, massnahmen_prioritaet: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="massnahmen_prioritaet_liquiditaet" className="font-normal">Liquidität verbessern</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="massnahmen_prioritaet_umsatz_steigern"
                  checked={lookupKeys(fields.massnahmen_prioritaet).includes('umsatz_steigern')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.massnahmen_prioritaet);
                      const next = checked ? [...current, 'umsatz_steigern'] : current.filter(k => k !== 'umsatz_steigern');
                      return { ...f, massnahmen_prioritaet: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="massnahmen_prioritaet_umsatz_steigern" className="font-normal">Umsatz steigern</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="massnahmen_prioritaet_neue_felder"
                  checked={lookupKeys(fields.massnahmen_prioritaet).includes('neue_felder')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.massnahmen_prioritaet);
                      const next = checked ? [...current, 'neue_felder'] : current.filter(k => k !== 'neue_felder');
                      return { ...f, massnahmen_prioritaet: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="massnahmen_prioritaet_neue_felder" className="font-normal">Neue Geschäftsfelder erschließen</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="massnahmen_prioritaet_controlling"
                  checked={lookupKeys(fields.massnahmen_prioritaet).includes('controlling')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.massnahmen_prioritaet);
                      const next = checked ? [...current, 'controlling'] : current.filter(k => k !== 'controlling');
                      return { ...f, massnahmen_prioritaet: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="massnahmen_prioritaet_controlling" className="font-normal">Controlling einführen / verbessern</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="naechste_pruefung">Nächste Überprüfung geplant am</Label>
            <Input
              id="naechste_pruefung"
              type="date"
              value={fields.naechste_pruefung ?? ''}
              onChange={e => setFields(f => ({ ...f, naechste_pruefung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interne_notizen">Interne Notizen</Label>
            <Textarea
              id="interne_notizen"
              value={fields.interne_notizen ?? ''}
              onChange={e => setFields(f => ({ ...f, interne_notizen: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}