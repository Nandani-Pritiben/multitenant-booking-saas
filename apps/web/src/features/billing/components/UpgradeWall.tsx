import { Link } from 'react-router-dom';

interface UpgradeWallProps {
  feature: string;
  description?: string;
}

export function UpgradeWall({ feature, description }: UpgradeWallProps) {
  return (
    <div className="upgrade-wall" role="alert" aria-label={`${feature} requires Pro`}>
      <div className="upgrade-wall-inner">
        <span className="upgrade-wall-icon" aria-hidden="true">🔒</span>
        <h2 className="upgrade-wall-title">{feature} is a Pro feature</h2>
        <p className="upgrade-wall-body">
          {description ??
            `${feature} is available on the Pro plan. Activate Demo Pro to unlock this feature and more.`}
        </p>
        <Link to="/dashboard/billing" className="button primary upgrade-wall-btn">
          View plans &amp; activate Pro
        </Link>
      </div>
    </div>
  );
}
