"use client";

import { AlertCircle, Check, Info } from "lucide-react";

const VARIANTS = {
    success: {
        background: "var(--black)",
        iconBg: "var(--green-leaf)",
        Icon: Check,
        iconColor: "var(--black)",
    },
    error: {
        background: "rgba(35, 59, 61, 0.95)",
        iconBg: "rgba(255, 255, 255, 0.12)",
        Icon: AlertCircle,
        iconColor: "#fff",
    },
    info: {
        background: "rgba(35, 59, 61, 0.92)",
        iconBg: "rgba(255, 255, 255, 0.15)",
        Icon: Info,
        iconColor: "rgba(255, 255, 255, 0.9)",
    },
};

export default function AdminToast({ open, message, variant = "success" }) {
    if (!open || !message) return null;

    const v = VARIANTS[variant] || VARIANTS.success;
    const Icon = v.Icon;

    return (
        <>
            <div
                role="status"
                aria-live="polite"
                style={{
                    position: "fixed",
                    bottom: "2rem",
                    right: "2rem",
                    maxWidth: "min(420px, calc(100vw - 2rem))",
                    background: v.background,
                    color: "white",
                    padding: "1rem 1.25rem",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
                    zIndex: 1100,
                    animation: "adminToastSlideUp 0.3s ease-out",
                }}
            >
                <div
                    style={{
                        background: v.iconBg,
                        borderRadius: "50%",
                        padding: "4px",
                        display: "flex",
                        flexShrink: 0,
                        marginTop: "0.1rem",
                    }}
                >
                    <Icon size={16} color={v.iconColor} />
                </div>
                <span style={{ fontWeight: 500, fontSize: "0.92rem", lineHeight: 1.45 }}>{message}</span>
            </div>
            <style jsx global>{`
                @keyframes adminToastSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    );
}
