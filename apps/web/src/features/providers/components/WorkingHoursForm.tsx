import { useEffect, useState, type FormEvent } from 'react';
import type { WorkingHour } from '../types';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DayValue {
  enabled: boolean;
  start_time: string;
  end_time: string;
}

interface WorkingHoursFormProps {
  initialHours: WorkingHour[];
  busy: boolean;
  error: string;
  success: string;
  onSave: (hours: Omit<WorkingHour, 'id' | 'provider_id'>[]) => Promise<void>;
}

export function WorkingHoursForm({ initialHours, busy, error, success, onSave }: WorkingHoursFormProps) {
  const [days, setDays] = useState<DayValue[]>([]);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setDays(WEEKDAYS.map((_day, index) => {
      const saved = initialHours.find((hour) => hour.day_of_week === index);
      return saved
        ? { enabled: true, start_time: saved.start_time.slice(0, 5), end_time: saved.end_time.slice(0, 5) }
        : { enabled: false, start_time: '09:00', end_time: '17:00' };
    }));
  }, [initialHours]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    for (const [index, day] of days.entries()) {
      if (day.enabled && day.start_time >= day.end_time) {
        setValidationError(`${WEEKDAYS[index]}: start time must be before end time.`);
        return;
      }
    }
    setValidationError('');
    await onSave(days.flatMap((day, day_of_week) => day.enabled
      ? [{ day_of_week, start_time: day.start_time, end_time: day.end_time }]
      : []));
  }

  return <form className="working-hours-form" onSubmit={(event) => void submit(event)}>
    <div className="working-hours-heading"><div><p className="eyebrow">WEEKLY SCHEDULE</p><h2>Working hours</h2><p className="muted">One interval per day. Disabled days are not saved.</p></div></div>
    {error && <p className="service-alert" role="alert">{error}</p>}
    {validationError && <p className="service-alert" role="alert">{validationError}</p>}
    {success && <p className="service-notice" role="status">{success}</p>}
    <div className="working-days">{days.map((day, index) => <div className={`working-day${day.enabled ? '' : ' off'}`} key={WEEKDAYS[index]}>
      <label className="working-day-toggle"><input type="checkbox" checked={day.enabled} onChange={(event) => setDays((current) => current.map((value, dayIndex) => dayIndex === index ? { ...value, enabled: event.target.checked } : value))} /><span>{WEEKDAYS[index]}</span></label>
      {day.enabled ? <div className="working-times"><label><span className="visually-hidden">{WEEKDAYS[index]} start time</span><input type="time" value={day.start_time} onChange={(event) => setDays((current) => current.map((value, dayIndex) => dayIndex === index ? { ...value, start_time: event.target.value } : value))} required /></label><span aria-hidden="true">to</span><label><span className="visually-hidden">{WEEKDAYS[index]} end time</span><input type="time" value={day.end_time} onChange={(event) => setDays((current) => current.map((value, dayIndex) => dayIndex === index ? { ...value, end_time: event.target.value } : value))} required /></label></div> : <span className="day-disabled-label">Disabled</span>}
    </div>)}</div>
    <button type="submit" className="button primary" disabled={busy || days.length !== 7}>{busy ? 'Saving schedule...' : 'Save working hours'}</button>
  </form>;
}