"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { DISTINCT } from "../../lib/constants";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = "info") => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            removeToast(id);
        }, 5000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const toast = {
        success: (msg) => addToast(msg, "success"),
        error: (msg) => addToast(msg, "error"),
        info: (msg) => addToast(msg, "info"),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div style={{
                position: "fixed",
                bottom: "20px",
                right: "20px",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                pointerEvents: "none"
            }}>
                {toasts.map((t) => (
                    <div key={t.id} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        background: "white",
                        padding: "16px",
                        borderRadius: "12px",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                        pointerEvents: "auto",
                        minWidth: "300px",
                        maxWidth: "400px",
                        animation: "slideIn 0.3s ease-out forwards",
                        borderLeft: `4px solid ${t.type === "success" ? DISTINCT.emerald : t.type === "error" ? DISTINCT.red : DISTINCT.blue}`
                    }}>
                        <style>{`
                            @keyframes slideIn {
                                from { transform: translateX(100%); opacity: 0; }
                                to { transform: translateX(0); opacity: 1; }
                            }
                        `}</style>
                        <div style={{
                            color: t.type === "success" ? DISTINCT.emerald : t.type === "error" ? DISTINCT.red : DISTINCT.blue,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            {t.type === "success" && <CheckCircle size={20} />}
                            {t.type === "error" && <AlertCircle size={20} />}
                            {t.type === "info" && <Info size={20} />}
                        </div>
                        <div style={{ flex: 1, fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "500" }}>
                            {t.message}
                        </div>
                        <button 
                            onClick={() => removeToast(t.id)}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "50%",
                                transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
