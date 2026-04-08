import type { Kennzahlenauswertung, FinanzdatenBwaJahresabschluss } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface KennzahlenauswertungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Kennzahlenauswertung | null;
  onEdit: (record: Kennzahlenauswertung) => void;
  finanzdatenBwaJahresabschlussList: FinanzdatenBwaJahresabschluss[];
}

export function KennzahlenauswertungViewDialog({ open, onClose, record, onEdit, finanzdatenBwaJahresabschlussList }: KennzahlenauswertungViewDialogProps) {
  function getFinanzdatenBwaJahresabschlussDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return finanzdatenBwaJahresabschlussList.find(r => r.record_id === id)?.fields.berichtszeitraum ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kennzahlenauswertung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erstellt von – Nachname</Label>
            <p className="text-sm">{record.fields.erstellt_von_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umsatzrentabilität (%)</Label>
            <p className="text-sm">{record.fields.umsatzrentabilitaet_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zielwert Umsatzrentabilität (%)</Label>
            <p className="text-sm">{record.fields.umsatzrentabilitaet_ziel_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eigenkapitalquote (%)</Label>
            <p className="text-sm">{record.fields.eigenkapitalquote_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zielwert Eigenkapitalquote (%)</Label>
            <p className="text-sm">{record.fields.eigenkapitalquote_ziel_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zielwert Wertschöpfung pro Mitarbeiter (EUR)</Label>
            <p className="text-sm">{record.fields.wertschoepfung_ziel_pro_ma_eur ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Deckungsbeitrag (EUR)</Label>
            <p className="text-sm">{record.fields.deckungsbeitrag_eur ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Deckungsbeitrag pro produktivem Mitarbeiter (EUR)</Label>
            <p className="text-sm">{record.fields.deckungsbeitrag_pro_ma_eur ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umsatz pro Mitarbeiter (EUR)</Label>
            <p className="text-sm">{record.fields.umsatz_pro_mitarbeiter_eur ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Personalkostenquote (%)</Label>
            <p className="text-sm">{record.fields.personalkosten_quote_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtbewertung Rentabilität</Label>
            <Badge variant="secondary">{record.fields.gesamtbewertung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtbewertung Produktivität</Label>
            <Badge variant="secondary">{record.fields.bewertung_produktivitaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stärken des Unternehmens</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.staerken ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schwächen / Risiken</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.schwaechen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Finanzdaten (BWA/Jahresabschluss)</Label>
            <p className="text-sm">{getFinanzdatenBwaJahresabschlussDisplayName(record.fields.finanzdaten_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum der Auswertung</Label>
            <p className="text-sm">{formatDate(record.fields.auswertungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erstellt von – Vorname</Label>
            <p className="text-sm">{record.fields.erstellt_von_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eigenkapitalrentabilität (%)</Label>
            <p className="text-sm">{record.fields.eigenkapitalrentabilitaet_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Handwerkliche Wertschöpfung gesamt (EUR)</Label>
            <p className="text-sm">{record.fields.handwerkliche_wertschoepfung_eur ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wertschöpfung pro produktivem Mitarbeiter (EUR)</Label>
            <p className="text-sm">{record.fields.wertschoepfung_pro_mitarbeiter_eur ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Handlungsempfehlungen Rentabilität</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.handlungsempfehlungen_rentabilitaet ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Handlungsempfehlungen Produktivität</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.handlungsempfehlungen_produktivitaet ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Prioritäre Maßnahmen</Label>
            <p className="text-sm">{Array.isArray(record.fields.massnahmen_prioritaet) ? record.fields.massnahmen_prioritaet.map((v: any) => v?.label ?? v).join(', ') : '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nächste Überprüfung geplant am</Label>
            <p className="text-sm">{formatDate(record.fields.naechste_pruefung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Interne Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.interne_notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}