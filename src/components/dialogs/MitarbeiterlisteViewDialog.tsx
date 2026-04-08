import type { Mitarbeiterliste, Unternehmensprofil } from '@/types/app';
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

interface MitarbeiterlisteViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Mitarbeiterliste | null;
  onEdit: (record: Mitarbeiterliste) => void;
  unternehmensprofilList: Unternehmensprofil[];
}

export function MitarbeiterlisteViewDialog({ open, onClose, record, onEdit, unternehmensprofilList }: MitarbeiterlisteViewDialogProps) {
  function getUnternehmensprofilDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return unternehmensprofilList.find(r => r.record_id === id)?.fields.unternehmensname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mitarbeiterliste anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unternehmen</Label>
            <p className="text-sm">{getUnternehmensprofilDisplayName(record.fields.unternehmen_ma_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname Mitarbeiter</Label>
            <p className="text-sm">{record.fields.mitarbeiter_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname Mitarbeiter</Label>
            <p className="text-sm">{record.fields.mitarbeiter_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tätigkeitskategorie</Label>
            <Badge variant="secondary">{record.fields.taetigkeit_kategorie?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tätigkeitsbeschreibung</Label>
            <p className="text-sm">{record.fields.taetigkeit_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschäftigungsgrad (% – 100 = Vollzeit)</Label>
            <p className="text-sm">{record.fields.beschaeftigungsgrad_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anteil handwerkliche Tätigkeit (%)</Label>
            <p className="text-sm">{record.fields.handwerklicher_anteil_prozent ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eintrittsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.eintrittsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mitarbeiter aktiv</Label>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              record.fields.ist_aktiv ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {record.fields.ist_aktiv ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anmerkung zum Mitarbeiter</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.anmerkung_mitarbeiter ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}