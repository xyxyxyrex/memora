import './XPBar.css'

function XPBar({ xp, level, xpToNext }) {
    const xpPerLevel = 100
    const current = xpPerLevel - xpToNext
    const percent = (current / xpPerLevel) * 100

    return (
        <div className="xp-bar-section card">
            <div className="xp-bar-header">
                <span className="xp-bar-title">Level Progress</span>
                <span className="xp-bar-info">
                    <strong>{current}</strong> / {xpPerLevel} XP to Level {level + 1}
                </span>
            </div>
            <div className="xp-progress-track">
                <div
                    className="xp-progress-fill"
                    style={{ width: `${percent}%` }}
                >
                    <div className="xp-progress-glow"></div>
                </div>
            </div>
        </div>
    )
}

export default XPBar
