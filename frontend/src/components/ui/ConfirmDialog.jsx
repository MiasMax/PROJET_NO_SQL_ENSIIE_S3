import React from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  isOpen,
  title = 'Confirmer l’action',
  description = '',
  details = null, // Optional array of { label, value }
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'danger', // 'danger' | 'primary' | 'cobalt'
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const icon =
    tone === 'danger' ? (
      <Trash2 size={18} className="text-[#B91C1C]" />
    ) : tone === 'cobalt' ? (
      <Info size={18} className="text-neo-cobalt" />
    ) : (
      <AlertTriangle size={18} className="text-[#B45309]" />
    );

  const confirmVariant =
    tone === 'danger' ? 'danger' : tone === 'cobalt' ? 'secondary' : 'primary';

  return (
    <Modal isOpen={isOpen} onClose={loading ? undefined : onCancel} size="sm" closeOnBackdrop={!loading}>
      <Modal.Header title={title} icon={icon} hideClose={loading} />
      <Modal.Body className="space-y-4">
        {description && (
          <p className="text-sm text-neo-ink-2 leading-relaxed">{description}</p>
        )}

        {Array.isArray(details) && details.length > 0 && (
          <dl className="bg-neo-muted border-[1.5px] border-neo-border rounded-[6px] p-3.5 space-y-2 text-xs">
            {details.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4">
                <dt className="text-neo-ink-3 font-medium">{row.label}</dt>
                <dd className="text-neo-ink font-semibold text-right truncate">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} size="sm" onClick={onConfirm} disabled={loading}>
          {loading ? 'Traitement...' : confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

