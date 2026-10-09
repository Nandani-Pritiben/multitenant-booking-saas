interface UsageBarProps {
  label:    string;
  count:    number;
  max:      number | null;
}

export function UsageBar({ label, count, max }: UsageBarProps) {
  if (max === null) {
    return (
      <div className="usage-bar-row">
        <span className="usage-label">{label}</span>
        <span className="usage-value unlimited">{count} <span className="usage-unlimited">/ Unlimited</span></span>
      </div>
    );
  }

  const pct = Math.min((count / max) * 100, 100);
  const atLimit = count >= max;

  return (
    <div className="usage-bar-row">
      <div className="usage-bar-header">
        <span className="usage-label">{label}</span>
        <span className={`usage-value ${atLimit ? 'at-limit' : ''}`}>{count} / {max}</span>
      </div>
      <div className="usage-bar-track" role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={max} aria-label={`${label}: ${count} of ${max}`}>
        <div className={`usage-bar-fill ${atLimit ? 'at-limit' : pct >= 80 ? 'near-limit' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
