import type { FinanzdatenBwaJahresabschluss, Unternehmensprofil } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';

interface FinanzdatenBwaJahresabschlussViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: FinanzdatenBwaJahresabschluss | null;
  onEdit: (record: FinanzdatenBwaJahresabschluss) => void;
  unternehmensprofilList: Unternehmensprofil[];
}

export function FinanzdatenBwaJahresabschlussViewDialog({ open, onClose, record, onEdit, unternehmensprofilList }: FinanzdatenBwaJahresabschlussViewDialogProps) {
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
          <DialogTitle>Finanzdaten (BWA/Jahresabschluss) anzeigen</DialogTitle>
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
            <p className="text-sm">{getUnternehmensprofilDisplayName(record.fields.unternehmen_ref)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dokumententyp</Label>
            <Badge variant="secondary">{record.fields.dokument_typ?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Berichtszeitraum (z.B. Jan–Dez 2024)</Label>
            <p className="text-sm">{record.fields.berichtszeitraum ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dokument hochladen (optional)</Label>
            {record.fields.dokument_upload ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.dokument_upload} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umsatzerlöse (EUR)</Label>
            <p className="text-sm">{record.fields.umsatzerloese ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonstige betriebliche Erträge (EUR)</Label>
            <p className="text-sm">{record.fields.sonstige_betriebliche_ertraege ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtleistung (EUR)</Label>
            <p className="text-sm">{record.fields.gesamtleistung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Materialeinsatz / Wareneinsatz (EUR)</Label>
            <p className="text-sm">{record.fields.materialeinsatz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Personalkosten gesamt (EUR)</Label>
            <p className="text-sm">{record.fields.personalkosten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonstige betriebliche Aufwendungen (EUR)</Label>
            <p className="text-sm">{record.fields.sonstige_betriebliche_aufwendungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abschreibungen (EUR)</Label>
            <p className="text-sm">{record.fields.abschreibungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zinsaufwand (EUR)</Label>
            <p className="text-sm">{record.fields.zinsaufwand ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Betriebsergebnis / EBIT (EUR)</Label>
            <p className="text-sm">{record.fields.ebit ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Jahresüberschuss / Jahresfehlbetrag (EUR)</Label>
            <p className="text-sm">{record.fields.jahresueberschuss ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eigenkapital (EUR)</Label>
            <p className="text-sm">{record.fields.eigenkapital ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fremdkapital gesamt (EUR)</Label>
            <p className="text-sm">{record.fields.fremdkapital ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bilanzsumme / Gesamtkapital (EUR)</Label>
            <p className="text-sm">{record.fields.bilanzsumme ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anmerkungen zu den Finanzdaten</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.anmerkungen_finanzen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}