import { useEffect, useState } from 'react';
import { useAuth } from '../app/AuthProvider';
import { bookingsApi } from '../features/bookings/api';
import type { DashboardBooking } from '../features/bookings/types';
import { CalendarNav } from '../features/calendar/CalendarNav';
import { DayView } from '../features/calendar/DayView';
import { WeekView } from '../features/calendar/WeekView';
import { MonthView } from '../features/calendar/MonthView';
import { UpgradeWall } from '../features/billing/components/UpgradeWall';
import type { CalendarView } from '../features/calendar/calendarUtils';
import { todayInTz, navigateDate, fetchRange, weekStart, monthStart } from '../features/calendar/calendarUtils';
import '../styles/calendar.css';

export function CalendarPage() {
  const { business, plan } = useAuth();
  const timezone = business?.timezone ?? 'UTC';

  const [view, setView]       = useState<CalendarView>('week');
  const [date, setDate]       = useState<string>(() => todayInTz(timezone));
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const today = todayInTz(timezone);

  useEffect(() => {
    if (plan !== 'pro') return;
    let active = true;
    const { startDate, endDate } = fetchRange(view, date);
    setLoading(true);
    setError('');
    void bookingsApi
      .list({ start_date: startDate, end_date: endDate })
      .then((items) => { if (active) setBookings(items); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load bookings.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [plan, view, date, timezone]);

  // Gate: show upgrade wall for free plan users
  if (plan !== 'pro') return <UpgradeWall feature="Calendar" />;

  return (
    <section className="calendar-page" aria-labelledby="calendar-heading">
      <header className="page-heading">
        <div>
          <p className="eyebrow">CALENDAR</p>
          <h1 id="calendar-heading">Calendar</h1>
        </div>
      </header>

      <CalendarNav
        view={view} date={date} timezone={timezone} today={today}
        onPrev={() => setDate((d) => navigateDate(view, d, -1))}
        onNext={() => setDate((d) => navigateDate(view, d, 1))}
        onToday={() => setDate(todayInTz(timezone))}
        onViewChange={(v) => {
          setView(v);
          if (v === 'week') setDate((d) => weekStart(d));
          if (v === 'month') setDate((d) => monthStart(d));
        }}
      />

      {error && <div className="alert" role="alert">{error}</div>}
      {loading && <div className="cal-loading" role="status" aria-live="polite">Loading…</div>}

      {!loading && !error && (
        <div className="cal-body">
          {view === 'day' && <DayView date={date} bookings={bookings} timezone={timezone} />}
          {view === 'week' && (
            <WeekView date={date} bookings={bookings} timezone={timezone} today={today}
              onDayClick={(d) => { setDate(d); setView('day'); }} />
          )}
          {view === 'month' && (
            <MonthView date={date} bookings={bookings} timezone={timezone} today={today}
              onDayClick={(d) => { setDate(d); setView('day'); }} />
          )}
        </div>
      )}
    </section>
  );
}
