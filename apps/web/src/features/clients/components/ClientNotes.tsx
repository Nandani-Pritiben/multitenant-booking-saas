import { useState } from 'react';
import { clientsApi } from '../api';

interface ClientNotesProps {
  clientId: string;
  initialNotes: string | null;
  onSaved: (notes: string | null) => void;
}

export function ClientNotes({ clientId, initialNotes, onSaved }: ClientNotesProps) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const isDirty = notes !== (initialNotes ?? '');

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await clientsApi.update(clientId, { notes: notes || undefined });
      onSaved(notes || null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save notes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="client-notes">
      <h2 className="booking-detail-section-title">Internal notes</h2>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        Visible only to your team — never shown to clients.
      </p>
      <textarea
        className="client-notes-textarea"
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
        rows={5}
        placeholder="E.g. Prefers morning appointments. Allergic to certain products."
        aria-label="Client notes"
        maxLength={4000}
      />
      {error && <p className="alert" role="alert" style={{ marginTop: 8 }}>{error}</p>}
      {saved && <p className="success" role="status" style={{ marginTop: 8 }}>Notes saved.</p>}
      <button
        type="button"
        className="button primary"
        style={{ marginTop: 10 }}
        disabled={saving || !isDirty}
        onClick={() => void save()}
      >
        {saving ? 'Saving…' : 'Save notes'}
      </button>
    </div>
  );
}
