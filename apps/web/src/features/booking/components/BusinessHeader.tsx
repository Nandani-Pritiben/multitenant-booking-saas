import type { PublicBusiness } from '../types';

export function BusinessHeader({ business }: { business: PublicBusiness }) {
  return <header className="booking-business"><p className="eyebrow">BOOK AN APPOINTMENT</p><h1>{business.name}</h1><p className="booking-timezone">Times shown in {business.timezone}</p></header>;
}