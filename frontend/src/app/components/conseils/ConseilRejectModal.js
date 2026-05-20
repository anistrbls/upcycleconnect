"use client";

import AdminModal from "../admin/AdminModal";

export default function ConseilRejectModal({ open, comment, setComment, saving, error, onSubmit, onClose }) {
    return (
        <AdminModal open={open} title="Refuser le conseil" onClose={onClose}>
            <form className="conseil-form" onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>
                    Motif de refus *
                    <textarea
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Expliquez pourquoi ce conseil est refusé…"
                        style={{ padding: "0.7rem 0.85rem", borderRadius: "14px", border: "none", background: "#EAF0F1", fontSize: "0.9rem", outline: "none", resize: "vertical", fontFamily: "inherit" }}
                        required
                    />
                </label>
                {error && <p style={{ color: "#B24A4A", fontSize: "0.82rem", margin: 0 }}>{error}</p>}
                <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button className="action-cta" type="submit" disabled={saving} style={{ background: "#FDE8E8", color: "#B24A4A" }}>
                        {saving ? "Refus en cours…" : "Confirmer le refus"}
                    </button>
                    <button className="action-cta" type="button" onClick={onClose} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                </div>
            </form>
        </AdminModal>
    );
}
