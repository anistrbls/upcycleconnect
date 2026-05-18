"use client";

import { useState } from "react";
import AdminModal from "./AdminModal";

export default function AdminConfirmModal({
    open,
    title,
    message,
    confirmLabel = "Confirmer",
    cancelLabel = "Annuler",
    onConfirm,
    onClose,
    tone = "danger",
}) {
    const [isLoading, setIsLoading] = useState(false);

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm?.();
            onClose?.();
        } finally {
            setIsLoading(false);
        }
    };

    const confirmBg = tone === "danger" ? "var(--state-critical)" : "var(--forest-deep)";
    const confirmColor = tone === "danger" ? "#fff" : "#fff";

    return (
        <AdminModal open={open} title={title} onClose={isLoading ? undefined : onClose}>
            <p style={{ margin: "0 0 1.25rem", color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: 1.55 }}>
                {message}
            </p>
            <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                <button
                    type="button"
                    className="action-cta task-action-btn"
                    disabled={isLoading}
                    onClick={handleConfirm}
                    style={{
                        background: confirmBg,
                        color: confirmColor,
                        opacity: isLoading ? 0.75 : 1,
                    }}
                >
                    {isLoading ? "Traitement…" : confirmLabel}
                </button>
                <button
                    type="button"
                    className="action-cta"
                    disabled={isLoading}
                    onClick={onClose}
                    style={{ background: "#e8ecee", color: "var(--text-main)" }}
                >
                    {cancelLabel}
                </button>
            </div>
        </AdminModal>
    );
}
