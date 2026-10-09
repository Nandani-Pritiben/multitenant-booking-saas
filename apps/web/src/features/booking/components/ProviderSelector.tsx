import type { PublicProvider } from '../types';

interface ProviderSelectorProps {
  providers: PublicProvider[];
  selectedId: string;
  onSelect: (providerId: string) => void;
}

export function ProviderSelector({ providers, selectedId, onSelect }: ProviderSelectorProps) {
  return <div className="provider-choice-list"><label className={`provider-choice${selectedId === '' ? ' selected' : ''}`}><input type="radio" name="booking-provider" checked={selectedId === ''} onChange={() => onSelect('')} /><span><strong>Any provider</strong><small>Show times across the team</small></span></label>{providers.map((provider) => <label className={`provider-choice${selectedId === provider.id ? ' selected' : ''}`} key={provider.id}><input type="radio" name="booking-provider" checked={selectedId === provider.id} onChange={() => onSelect(provider.id)} /><span><strong>{provider.name}</strong><small>Choose this provider</small></span></label>)}</div>;
}