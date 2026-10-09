import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../app/AuthProvider';
import { businessApi } from '../features/business/api';

// Common IANA timezone list — covers most use cases
const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Colombo',
  'Asia/Karachi',
  'Asia/Dhaka',
  'Asia/Kathmandu',
  'Asia/Kabul',
  'Asia/Dubai',
  'Asia/Muscat',
  'Asia/Riyadh',
  'Asia/Baghdad',
  'Asia/Tehran',
  'Asia/Baku',
  'Asia/Tbilisi',
  'Asia/Yerevan',
  'Asia/Kuwait',
  'Asia/Qatar',
  'Asia/Bahrain',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Ho_Chi_Minh',
  'Asia/Phnom_Penh',
  'Asia/Rangoon',
  'Asia/Manila',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Ulaanbaatar',
  'Asia/Tashkent',
  'Asia/Almaty',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Pacific/Guam',
  'Pacific/Honolulu',
  'Pacific/Tahiti',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Adelaide',
  'Australia/Perth',
  'Australia/Darwin',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Zurich',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Budapest',
  'Europe/Bucharest',
  'Europe/Athens',
  'Europe/Helsinki',
  'Europe/Tallinn',
  'Europe/Riga',
  'Europe/Vilnius',
  'Europe/Kiev',
  'Europe/Minsk',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Accra',
  'Africa/Addis_Ababa',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Toronto',
  'America/Vancouver',
  'America/Halifax',
  'America/Winnipeg',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Caracas',
  'America/Buenos_Aires',
  'America/Sao_Paulo',
  'America/Montevideo',
  'America/Guyana',
  'America/La_Paz',
  'America/Manaus',
  'America/Asuncion',
];

export function PhaseSettingsPage() {
  const { business, setBusiness } = useAuth();
  const [values, setValues] = useState({
    name: '',
    slug: '',
    timezone: 'UTC',
    email: '',
    phone: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (business) {
      setValues({
        name: business.name,
        slug: business.slug,
        // Normalise any previously saved wrong-case value to the closest match
        timezone: TIMEZONES.find(
          (tz) => tz.toLowerCase() === business.timezone.toLowerCase(),
        ) ?? business.timezone,
        email: business.email ?? '',
        phone: business.phone ?? '',
      });
    }
  }, [business]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setBusiness(await businessApi.updateMe(values));
      setMessage('Saved successfully.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save settings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>Business settings</h1>
          <p className="muted">Keep your public business details up to date.</p>
        </div>
      </div>

      <form className="settings-form" onSubmit={submit}>
        {error && <div className="alert" role="alert">{error}</div>}
        {message && <div className="success" role="status">{message}</div>}

        <div className="settings-grid">
          <label>
            Business name
            <input
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              required
            />
          </label>

          <label>
            Slug
            <input
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={values.slug}
              onChange={(e) => setValues({ ...values, slug: e.target.value.toLowerCase() })}
              required
            />
          </label>

          <label>
            Timezone
            <select
              value={values.timezone}
              onChange={(e) => setValues({ ...values, timezone: e.target.value })}
              required
              style={{ minHeight: '44px', border: '1px solid #ccd5ca', background: '#fcfdfb', padding: '10px 12px', font: 'inherit' }}
            >
              {/* If the saved value isn't in our list, show it as a disabled option */}
              {!TIMEZONES.includes(values.timezone) && (
                <option value={values.timezone} disabled>
                  {values.timezone} (invalid — please select one below)
                </option>
              )}
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>

          <label>
            Email
            <input
              type="email"
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
            />
          </label>

          <label>
            Phone
            <input
              type="tel"
              value={values.phone}
              onChange={(e) => setValues({ ...values, phone: e.target.value })}
            />
          </label>
        </div>

        <button className="button primary" disabled={busy}>
          {busy ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </>
  );
}
