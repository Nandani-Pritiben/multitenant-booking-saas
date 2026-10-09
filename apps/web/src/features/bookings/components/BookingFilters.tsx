import type { ChangeEvent } from 'react';
import type { BookingListQuery, BookingProvider } from '../types';

interface BookingFiltersProps {
  query: BookingListQuery;
  providers: BookingProvider[];
  onChange: (next: BookingListQuery) => void;
  onClear: () => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
];

export function BookingFilters({ query, providers, onChange, onClear }: BookingFiltersProps) {
  function handle(key: keyof BookingListQuery) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange({ ...query, [key]: e.target.value || undefined });
    };
  }

  const hasFilters =
    query.status || query.provider_id || query.start_date || query.end_date || query.search;

  return (
    <div className="booking-filters" role="search" aria-label="Filter bookings">
      <div className="booking-filters-row">
        <label className="filter-label" htmlFor="bf-search">
          <span className="visually-hidden">Search customer</span>
          <input
            id="bf-search"
            type="search"
            className="filter-input"
            placeholder="Search customer..."
            value={query.search ?? ''}
            onChange={handle('search')}
            aria-label="Search by customer name or email"
          />
        </label>

        <label className="filter-label" htmlFor="bf-status">
          <span className="visually-hidden">Filter by status</span>
          <select
            id="bf-status"
            className="filter-select"
            value={query.status ?? ''}
            onChange={handle('status')}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {providers.length > 1 && (
          <label className="filter-label" htmlFor="bf-provider">
            <span className="visually-hidden">Filter by provider</span>
            <select
              id="bf-provider"
              className="filter-select"
              value={query.provider_id ?? ''}
              onChange={handle('provider_id')}
              aria-label="Filter by provider"
            >
              <option value="">All providers</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="filter-label" htmlFor="bf-start">
          <span className="visually-hidden">From date</span>
          <input
            id="bf-start"
            type="date"
            className="filter-input"
            value={query.start_date ?? ''}
            onChange={handle('start_date')}
            aria-label="From date"
          />
        </label>

        <label className="filter-label" htmlFor="bf-end">
          <span className="visually-hidden">To date</span>
          <input
            id="bf-end"
            type="date"
            className="filter-input"
            value={query.end_date ?? ''}
            onChange={handle('end_date')}
            aria-label="To date"
          />
        </label>

        {hasFilters && (
          <button
            type="button"
            className="text-button filter-clear"
            onClick={onClear}
            aria-label="Clear all filters"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
