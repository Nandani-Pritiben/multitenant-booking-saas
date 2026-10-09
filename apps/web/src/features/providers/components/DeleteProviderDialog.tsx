import { useEffect, useRef } from 'react';
import type { Provider } from '../types';

interface DeleteProviderDialogProps {
  provider: Provider;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteProviderDialog({ provider, busy, error, onCancel, onConfirm }: DeleteProviderDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, []);

  return <dialog className="service-dialog delete-dialog" ref={dialogRef} aria-labelledby="delete-provider-title" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
    <div className="service-dialog-heading"><div><p className="eyebrow">REMOVE TEAM MEMBER</p><h2 id="delete-provider-title">Delete provider?</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onCancel} disabled={busy}>×</button></div>
    <p>Are you sure you want to delete <strong>“{provider.name}”</strong>?</p>
    {error && <p className="service-alert" role="alert">{error}</p>}
    <div className="service-dialog-actions"><button type="button" className="button secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" className="button danger" onClick={() => void onConfirm()} disabled={busy}>{busy ? 'Deleting...' : 'Delete'}</button></div>
  </dialog>;
}