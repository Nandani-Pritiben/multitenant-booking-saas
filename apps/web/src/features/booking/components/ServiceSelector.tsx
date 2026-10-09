import type { PublicService } from '../types';

interface ServiceSelectorProps {
  services: PublicService[];
  selectedId: string;
  onSelect: (service: PublicService) => void;
}

function formatPrice(service: PublicService) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: service.currency }).format(Number(service.price));
}

export function ServiceSelector({ services, selectedId, onSelect }: ServiceSelectorProps) {
  return <div className="booking-options">{services.map((service) => <button type="button" key={service.id} className={`booking-option${selectedId === service.id ? ' selected' : ''}`} aria-pressed={selectedId === service.id} onClick={() => onSelect(service)}><span className="booking-option-main"><strong>{service.name}</strong><span>{service.description || 'Service'}</span></span><span className="booking-option-meta"><span>{service.duration_minutes} min</span><strong>{formatPrice(service)}</strong></span></button>)}</div>;
}