import { Trophy } from "lucide-react";
import "./BadgeDisplay.css";

function BadgeDisplay({ badges }) {
  return (
    <div className="badges-section card">
      <h3 className="badges-title">
        <Trophy size={18} /> Your Badges
      </h3>
      <div className="badges-grid">
        {badges.map((badge) => (
          <div key={badge.id} className="badge-item" title={badge.description}>
            <span className="badge-icon">{badge.icon}</span>
            <span className="badge-name">{badge.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BadgeDisplay;
