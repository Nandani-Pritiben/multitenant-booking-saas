import type { BookingStatus } from '../types';

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return (
    <span className={`booking-status-badge booking-status-${status}`} aria-label={`Status: ${STATUS_LABELS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
