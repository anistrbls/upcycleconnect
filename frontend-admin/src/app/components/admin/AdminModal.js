export default function AdminModal({ open, title, onClose, children }) {
    if (!open) {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(21,26,27,0.38)",
                display: "grid",
                placeItems: "center",
                zIndex: 1000,
                padding: "1rem",
            }}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                style={{
                    width: "min(620px, 100%)",
                    maxHeight: "85vh",
                    overflowY: "auto",
                    background: "#FFFFFF",
                    borderRadius: "28px",
                    padding: "1.35rem",
                    boxShadow: "0 22px 50px rgba(0,0,0,0.16)",
                }}
            >
                <div className="section-header" style={{ marginBottom: "0.6rem" }}>
                    <span className="section-title">{title}</span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer"
                        style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--text-main)",
                            width: "30px",
                            height: "30px",
                            borderRadius: "999px",
                            cursor: "pointer",
                            fontSize: "1.2rem",
                            lineHeight: 1,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
