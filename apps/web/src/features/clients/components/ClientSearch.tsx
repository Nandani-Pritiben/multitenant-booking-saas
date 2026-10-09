import { type ChangeEvent, useEffect, useRef, useState } from 'react';

interface ClientSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ClientSearch({ value, onChange }: ClientSearchProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if parent resets
  useEffect(() => { setLocal(value); }, [value]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 300);
  }

  return (
    <div className="client-search">
      <label htmlFor="client-search" className="visually-hidden">
        Search clients
      </label>
      <input
        id="client-search"
        type="search"
        className="filter-input client-search-input"
        placeholder="Search by name, email or phone…"
        value={local}
        onChange={handleChange}
        aria-label="Search clients by name, email or phone"
      />
    </div>
  );
}
