"use client";

import { useState } from "react";
import AdminModal from "../AdminModal";
import { formatDateFR } from "../../../lib/formatters";
import { fieldStyle, labelStyle, pillInputStyle } from "../../../lib/styles";

// Badges statut réservation
const BOOKING_STATUS_COLORS = {
    pending:   { bg: "#FFF5D6", color: "#7A5E00", label: "En attente" },
    confirmed: { bg: "#E5FFBC", color: "#233B3D", label: "Confirmée" },
    cancelled: { bg: "#FFE8E8", color: "#8B2020", label: "Annulée" },
    completed: { bg: "#EAF0F1", color: "#4F6163", label: "Terminée" },
};

const PAYMENT_STATUS_COLORS = {
    paid:     { bg: "#E5FFBC", color: "#233B3D", label: "Payé" },
    pending:  { bg: "#FFF5D6", color: "#7A5E00", label: "En attente" },
    refunded: { bg: "#EAF0F1", color: "#4F6163", label: "Remboursé" },
};

function Badge({ value, map }) {
    const style = map[value] ?? { bg: "#E5E7EB", color: "#374151" };
    return (
        <span style={{
            background: style.bg,
            color: style.color,
            borderRadius: "999px",
            padding: "0.18rem 0.6rem",
            fontSize: "0.73rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
        }}>
            {style.label ?? value}
        </span>
    );
}

export default function ReservationsAdminView({ bookings, services, loading, errorMessage, onReload, onUpdateStatus }) {
    const [statusFilter, setStatusFilter] = useState("all");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [serviceFilter, setServiceFilter] = useState("all");

    // Modal de changement de statut
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [statusForm, setStatusForm] = useState({ status: "", paymentStatus: "" });
    const [localError, setLocalError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Filtrage côté client (les données sont déjà chargées)
    const visible = bookings.filter((b) => {
        const okStatus  = statusFilter  === "all" || b.status        === statusFilter;
        const okPayment = paymentFilter === "all" || b.paymentStatus === paymentFilter;
        const okService = serviceFilter === "all" || String(b.serviceId) === serviceFilter;
        return okStatus && okPayment && okService;
    });

    const handleOpenStatusModal = (booking) => {
        setSelectedBooking(booking);
        setStatusForm({ status: booking.status, paymentStatus: booking.paymentStatus });
        setLocalError("");
        setStatusModalOpen(true);
    };

    const handleStatusSubmit = async (event) => {
        event.preventDefault();
        setLocalError("");
        setIsSaving(true);
        try {
            await onUpdateStatus(selectedBooking.id, {
                status:        statusForm.status,
                paymentStatus: statusForm.paymentStatus,
            });
            setStatusModalOpen(false);
        } catch (err) {
            setLocalError(String(err?.message || "Une erreur est survenue."));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Offres &amp; prestations</span>
                    <h1>Réservations</h1>
                </div>
            </div>

            {/* Barre de filtres */}
            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ ...pillInputStyle, appearance: "none" }}
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmée</option>
                        <option value="cancelled">Annulée</option>
                        <option value="completed">Terminée</option>
                    </select>
                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        style={{ ...pillInputStyle, appearance: "none" }}
                    >
                        <option value="all">Tous les paiements</option>
                        <option value="paid">Payé</option>
                        <option value="pending">En attente</option>
                        <option value="refunded">Remboursé</option>
                    </select>
                    <select
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        style={{ ...pillInputStyle, appearance: "none" }}
                    >
                        <option value="all">Toutes les prestations</option>
                        {services.map((s) => (
                            <option key={s.id} value={String(s.id)}>{s.name}</option>
                        ))}
                    </select>
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                </div>
                {errorMessage && (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>
                )}
            </div>

            {/* Tableau */}
            {loading ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement…</p>
            ) : visible.length === 0 ? (
                <div className="panel">
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucune réservation correspondante.</p>
                </div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #E2EAEA" }}>
                                {["Utilisateur", "Prestation", "Date résa.", "Statut", "Paiement", "Montant", "Actions"].map((col) => (
                                    <th key={col} style={{
                                        textAlign: "left",
                                        padding: "0.55rem 0.75rem",
                                        color: "var(--text-muted)",
                                        fontWeight: 600,
                                        fontSize: "0.78rem",
                                        whiteSpace: "nowrap",
                                    }}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((b) => (
                                <tr key={b.id} style={{ borderBottom: "1px solid #F0F5F5" }}>
                                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 500 }}>{b.userName}</td>
                                    <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)" }}>{b.serviceName}</td>
                                    <td style={{ padding: "0.6rem 0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                        {formatDateFR(b.bookingDate)}
                                    </td>
                                    <td style={{ padding: "0.6rem 0.75rem" }}>
                                        <Badge value={b.status} map={BOOKING_STATUS_COLORS} />
                                    </td>
                                    <td style={{ padding: "0.6rem 0.75rem" }}>
                                        <Badge value={b.paymentStatus} map={PAYMENT_STATUS_COLORS} />
                                    </td>
                                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 500, whiteSpace: "nowrap" }}>
                                        {Number(b.amount).toFixed(2)} €
                                    </td>
                                    <td style={{ padding: "0.6rem 0.75rem" }}>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenStatusModal(b)}
                                            style={{
                                                border: "none", borderRadius: "999px",
                                                padding: "0.28rem 0.75rem",
                                                fontSize: "0.75rem", fontWeight: 500,
                                                cursor: "pointer", fontFamily: "inherit",
                                                background: "#233B3D", color: "#E5FFBC",
                                            }}
                                        >
                                            Modifier
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal : changer statut */}
            <AdminModal
                open={statusModalOpen}
                title="Modifier le statut de la réservation"
                onClose={() => setStatusModalOpen(false)}
            >
                {selectedBooking && (
                    <form onSubmit={handleStatusSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                        <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
                            {selectedBooking.userName} — {selectedBooking.serviceName}
                        </p>
                        <label style={labelStyle}>
                            Statut de la réservation
                            <select
                                value={statusForm.status}
                                onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value }))}
                                style={{ ...fieldStyle, appearance: "none" }}
                            >
                                <option value="pending">En attente</option>
                                <option value="confirmed">Confirmée</option>
                                <option value="cancelled">Annulée</option>
                                <option value="completed">Terminée</option>
                            </select>
                        </label>
                        <label style={labelStyle}>
                            Statut du paiement
                            <select
                                value={statusForm.paymentStatus}
                                onChange={(e) => setStatusForm((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                                style={{ ...fieldStyle, appearance: "none" }}
                            >
                                <option value="pending">En attente</option>
                                <option value="paid">Payé</option>
                                <option value="refunded">Remboursé</option>
                            </select>
                        </label>
                        {localError && (
                            <p style={{ color: "#a23b3b", fontSize: "0.85rem" }}>{localError}</p>
                        )}
                        <div style={{ display: "flex", gap: "0.6rem" }}>
                            <button className="action-cta task-action-btn" type="submit" disabled={isSaving}>
                                {isSaving ? "Enregistrement..." : "Mettre à jour"}
                            </button>
                            <button
                                className="action-cta"
                                type="button"
                                onClick={() => setStatusModalOpen(false)}
                                style={{ background: "#e8ecee", color: "var(--text-main)" }}
                            >
                                Annuler
                            </button>
                        </div>
                    </form>
                )}
            </AdminModal>
        </>
    );
}
