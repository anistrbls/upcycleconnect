export default function ModulePlaceholder({ moduleLabel, subLabel }) {
    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Module principal</span>
                    <h1>{moduleLabel}</h1>
                </div>
            </div>

            <div className="panel" style={{ maxWidth: "920px" }}>
                <div className="section-header">
                    <span className="section-title">{subLabel}</span>
                    <span className="db-badge">Structure prête</span>
                </div>
                <p style={{ fontSize: "0.92rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Cette section est prête pour intégrer les écrans métier. La sidebar reste la navigation principale,
                    et la navbar du haut pilote les sous-pages contextuelles du module actif.
                </p>
            </div>
        </>
    );
}
