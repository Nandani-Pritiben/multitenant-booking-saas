import { useEffect, useState } from 'react';
import { DeleteServiceDialog } from '../features/services/components/DeleteServiceDialog';
import { ServiceForm } from '../features/services/components/ServiceForm';
import { servicesApi } from '../features/services/api';
import type { Service, ServiceInput } from '../features/services/types';
import '../styles/services.css';

function priceLabel(service: Service) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: service.currency }).format(Number(service.price));
}

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<Service | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    void servicesApi.list().then((items) => {
      if (active) setServices(items);
    }).catch((cause: unknown) => {
      if (active) setLoadError(cause instanceof Error ? cause.message : 'Unable to load services.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [reloadKey]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
    setFormError('');
    setNotice('');
  }

  async function saveService(input: ServiceInput) {
    setSaving(true); setFormError('');
    try {
      if (editing) {
        await servicesApi.update(editing.id, input);
        setNotice('Service updated.');
      } else {
        await servicesApi.create(input);
        setNotice('Service added.');
      }
      setFormOpen(false);
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Unable to save service.');
    } finally { setSaving(false); }
  }

  async function toggleStatus(service: Service) {
    setPendingStatus(service.id); setActionError(''); setNotice('');
    try {
      const status = service.status === 'active' ? 'inactive' : 'active';
      await servicesApi.update(service.id, { status });
      setNotice(`Service ${status === 'active' ? 'activated' : 'deactivated'}.`);
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to update service status.');
    } finally { setPendingStatus(null); }
  }

  async function deleteService() {
    if (!deleteTarget) return;
    setDeleting(true); setDeleteError('');
    try {
      await servicesApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      setNotice('Service deleted.');
      setReloadKey((key) => key + 1);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Unable to delete service.');
    } finally { setDeleting(false); }
  }

  return (
    <section className="services-page" aria-labelledby="services-heading">
      <header className="services-header"><div><p className="eyebrow">OFFERINGS</p><h1 id="services-heading">Services</h1><p className="muted">Manage the services your business offers.</p></div><button type="button" className="button primary add-service-button" onClick={openCreate}>+ Add Service</button></header>
      {notice && <p className="service-notice" role="status">{notice}</p>}
      {actionError && <p className="service-alert" role="alert">{actionError}</p>}
      {loading ? <div className="services-state" role="status">Loading services...</div>
        : loadError ? <div className="services-state error-state"><p role="alert">Could not load services. {loadError}</p><button className="button secondary" onClick={() => setReloadKey((key) => key + 1)}>Retry</button></div>
          : services.length === 0 ? <div className="services-empty"><span className="empty-mark">＋</span><h2>No services yet</h2><p>Add your first service so customers can book with your business.</p><button type="button" className="button primary" onClick={openCreate}>Add Service</button></div>
            : <>
              <div className="services-table-wrap"><table className="services-table"><thead><tr><th scope="col">Name</th><th scope="col">Description</th><th scope="col">Duration</th><th scope="col">Price</th><th scope="col">Status</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{services.map((service) => <tr key={service.id}><td className="service-name-cell">{service.name}</td><td className="service-description-cell">{service.description || '—'}</td><td>{service.duration_minutes} min</td><td>{priceLabel(service)}</td><td><span className={`status-pill ${service.status}`}>{service.status}</span></td><td><div className="service-actions"><button type="button" className="text-button" onClick={() => { setEditing(service); setFormError(''); setNotice(''); setFormOpen(true); }}>Edit</button><button type="button" className="text-button" onClick={() => void toggleStatus(service)} disabled={pendingStatus === service.id}>{pendingStatus === service.id ? 'Saving...' : service.status === 'active' ? 'Deactivate' : 'Activate'}</button><button type="button" className="text-button delete-text" onClick={() => { setDeleteTarget(service); setDeleteError(''); setNotice(''); }}>Delete</button></div></td></tr>)}</tbody></table></div>
              <div className="service-cards">{services.map((service) => <article className="service-card" key={service.id}><div className="service-card-top"><div><h2>{service.name}</h2><p>{service.description || 'No description'}</p></div><span className={`status-pill ${service.status}`}>{service.status}</span></div><div className="service-card-meta"><span>{service.duration_minutes} min</span><strong>{priceLabel(service)}</strong></div><div className="service-card-actions"><button type="button" className="text-button" onClick={() => { setEditing(service); setFormError(''); setFormOpen(true); }}>Edit</button><button type="button" className="text-button" onClick={() => void toggleStatus(service)} disabled={pendingStatus === service.id}>{service.status === 'active' ? 'Deactivate' : 'Activate'}</button><button type="button" className="text-button delete-text" onClick={() => { setDeleteTarget(service); setDeleteError(''); }}>Delete</button></div></article>)}</div>
            </>}
      {formOpen && <ServiceForm service={editing ?? undefined} busy={saving} error={formError} onCancel={() => { if (!saving) setFormOpen(false); }} onSave={saveService} />}
      {deleteTarget && <DeleteServiceDialog service={deleteTarget} busy={deleting} error={deleteError} onCancel={() => { if (!deleting) setDeleteTarget(null); }} onConfirm={deleteService} />}
    </section>
  );
}