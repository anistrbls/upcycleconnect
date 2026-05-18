"use client";

import { formatDateFR } from "../../../lib/formatters";

const STATUS_MAP = {
    pending:   { label: "En attente", color: "#7A5E00", bg: "#FFF5D6" },
    confirmed: { label: "Confirmée", color: "#233B3D", bg: "#E5FFBC" },
    cancelled: { label: "Annulée", color: "#8B2020", bg: "#FFE8E8" },
    completed: { label: "Terminée", color: "#4F6163", bg: "#EAF0F1" },
};

export default function MyBookingsView({ bookings, loading, errorMessage, onReload }) {
    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Prestations</span>
                    <h1>Mes Réservations</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: 0 }}>
                        Suivez l'état de vos demandes de prestations et vos rendez-vous.
                    </p>
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                </div>
                {errorMessage && (
                    <p style={{ marginTop: "1rem", color: "#B24A4A", fontSize: "0.85rem", fontWeight: 600 }}>{errorMessage}</p>
                )}
            </div>

            {loading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Chargement de vos réservations...</div>
            ) : bookings.length === 0 ? (
                <div className="panel" style={{ padding: "4rem 2rem", textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🗓️</div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Aucune réservation pour le moment</h3>
                    <p style={{ color: "var(--text-muted)" }}>Explorez notre catalogue pour trouver la prestation qui vous convient.</p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "1rem" }}>
                    {bookings.map((b) => {
                        const status = STATUS_MAP[b.status] || { label: b.status, color: "#333", bg: "#eee" };
                        return (
                            <div 
                                key={b.id} 
                                style={{ 
                                    background: "#fff", padding: "1.5rem", borderRadius: "20px", 
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    border: "1px solid rgba(0,0,0,0.03)", boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
                                }}
                            >
                                <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                                    <div style={{ 
                                        width: "60px", height: "60px", background: "var(--surface-hover)", 
                                        borderRadius: "14px", display: "flex", alignItems: "center", 
                                        justifyContent: "center", fontSize: "1.5rem" 
                                    }}>
                                        🛠️
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.25rem 0" }}>{b.serviceName}</h4>
                                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                            <span>📅 {formatDateFR(b.bookingDate)}</span>
                                            <span>👤 Salarié : {b.employeeName || "En attente d'assignation"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                                    <div style={{ 
                                        background: status.bg, color: status.color, 
                                        padding: "0.3rem 0.8rem", borderRadius: "999px", 
                                        fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" 
                                    }}>
                                        {status.label}
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{Number(b.amount).toFixed(2)} €</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
