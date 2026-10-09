import { Link } from 'react-router-dom';
import type { Provider } from '../types';

interface ProviderListProps {
  providers: Provider[];
  pendingId: string | null;
  onEdit: (provider: Provider) => void;
  onToggle: (provider: Provider) => void;
  onDelete: (provider: Provider) => void;
}

export function ProviderList({ providers, pendingId, onEdit, onToggle, onDelete }: ProviderListProps) {
  return <>
    <div className="providers-table-wrap"><table className="services-table"><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Phone</th><th scope="col">Status</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{providers.map((provider) => <tr key={provider.id}><td className="service-name-cell">{provider.name}</td><td>{provider.email || '—'}</td><td>{provider.phone || '—'}</td><td><span className={`status-pill ${provider.status}`}>{provider.status}</span></td><td><div className="provider-actions"><button type="button" className="text-button" onClick={() => onEdit(provider)}>Edit</button><Link className="text-button" to={`/dashboard/providers/${provider.id}`}>Schedule</Link><button type="button" className="text-button" onClick={() => onToggle(provider)} disabled={pendingId === provider.id}>{pendingId === provider.id ? 'Saving...' : provider.status === 'active' ? 'Disable' : 'Enable'}</button><button type="button" className="text-button delete-text" onClick={() => onDelete(provider)}>Delete</button></div></td></tr>)}</tbody></table></div>
    <div className="provider-cards">{providers.map((provider) => <article className="provider-card" key={provider.id}><div className="provider-card-heading"><div><h2>{provider.name}</h2><p>{provider.email || 'No email'}</p><p>{provider.phone || 'No phone'}</p></div><span className={`status-pill ${provider.status}`}>{provider.status}</span></div><div className="provider-card-actions"><button type="button" className="text-button" onClick={() => onEdit(provider)}>Edit</button><Link className="text-button" to={`/dashboard/providers/${provider.id}`}>Schedule</Link><button type="button" className="text-button" onClick={() => onToggle(provider)} disabled={pendingId === provider.id}>{provider.status === 'active' ? 'Disable' : 'Enable'}</button><button type="button" className="text-button delete-text" onClick={() => onDelete(provider)}>Delete</button></div></article>)}</div>
  </>;
}