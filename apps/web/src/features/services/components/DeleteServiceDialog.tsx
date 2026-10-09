import { useEffect, useRef } from 'react';
import type { Service } from '../types';

interface DeleteServiceDialogProps {
  service: Service;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteServiceDialog({ service, busy, error, onCancel, onConfirm }: DeleteServiceDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, []);

  return (
    <dialog ref={dialogRef} className="service-dialog delete-dialog" aria-labelledby="delete-service-title" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
      <div className="service-dialog-heading"><div><p className="eyebrow">REMOVE SERVICE</p><h2 id="delete-service-title">Delete service?</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onCancel} disabled={busy}>×</button></div>
      <p>Are you sure you want to delete <strong>“{service.name}”</strong>?</p>
      {error && <p className="service-alert" role="alert">{error}</p>}
      <div className="service-dialog-actions"><button type="button" className="button secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" className="button danger" onClick={() => void onConfirm()} disabled={busy}>{busy ? 'Deleting...' : 'Delete'}</button></div>
    </dialog>
  );
}