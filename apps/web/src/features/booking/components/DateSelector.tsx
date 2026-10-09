interface DateSelectorProps {
  value: string;
  minimum: string;
  onChange: (date: string) => void;
}

export function DateSelector({ value, minimum, onChange }: DateSelectorProps) {
  return <label className="booking-date-field">Appointment date<input type="date" min={minimum} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}