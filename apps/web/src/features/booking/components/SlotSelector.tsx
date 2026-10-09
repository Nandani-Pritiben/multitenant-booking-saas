import type { AvailabilitySlot } from '../types';

interface SlotSelectorProps {
  slots: AvailabilitySlot[];
  selectedStart: string;
  loading: boolean;
  error: string;
  onSelect: (slot: AvailabilitySlot) => void;
}

export function SlotSelector({ slots, selectedStart, loading, error, onSelect }: SlotSelectorProps) {
  if (loading) return <p className="booking-state" role="status">Loading availability...</p>;
  if (error) return <p className="booking-error" role="alert">Failed to load availability. {error}</p>;
  if (slots.length === 0) return <p className="booking-state">No available slots for this date.</p>;
  return <div className="booking-slot-grid">{slots.map((slot) => <button key={`${slot.provider_id}-${slot.start_at}`} type="button" className={`booking-slot${selectedStart === slot.start_at ? ' selected' : ''}`} aria-pressed={selectedStart === slot.start_at} onClick={() => onSelect(slot)}><strong>{slot.start}</strong><small>{slot.provider_name}</small></button>)}</div>;
}