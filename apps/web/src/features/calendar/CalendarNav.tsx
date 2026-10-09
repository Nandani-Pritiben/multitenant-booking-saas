import type { CalendarView } from './calendarUtils';
import { periodLabel } from './calendarUtils';

interface CalendarNavProps {
  view: CalendarView;
  date: string;
  timezone: string;
  today: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: CalendarView) => void;
}

export function CalendarNav({
  view,
  date,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: CalendarNavProps) {
  return (
    <div className="cal-nav" role="toolbar" aria-label="Calendar navigation">
      <div className="cal-nav-left">
        <button type="button" className="button secondary cal-nav-btn" onClick={onToday}>
          Today
        </button>
        <button
          type="button"
          className="cal-arrow"
          onClick={onPrev}
          aria-label="Previous period"
        >
          ‹
        </button>
        <button
          type="button"
          className="cal-arrow"
          onClick={onNext}
          aria-label="Next period"
        >
          ›
        </button>
        <span className="cal-period-label" aria-live="polite" aria-atomic="true">
          {periodLabel(view, date)}
        </span>
      </div>

      <div className="cal-view-switch" role="group" aria-label="Calendar view">
        {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
          <button
            key={v}
            type="button"
            className={`cal-view-btn${view === v ? ' active' : ''}`}
            onClick={() => onViewChange(v)}
            aria-pressed={view === v}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
