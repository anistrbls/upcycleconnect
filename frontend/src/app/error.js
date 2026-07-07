"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";

export default function Error({ error, reset }) {
    useEffect(() => {
        // Log the error to an error reporting service if available
        console.error("UpcycleConnect Global Error:", error);
    }, [error]);

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--background)",
            padding: "2rem",
            textAlign: "center"
        }}>
            <div style={{
                background: "white",
                padding: "3rem",
                borderRadius: "24px",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.05)",
                maxWidth: "550px",
                width: "100%"
            }}>
                <div style={{
                    width: "80px",
                    height: "80px",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "var(--state-critical)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem"
                }}>
                    <AlertOctagon size={40} />
                </div>
                
                <h1 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text-main)", marginBottom: "1rem" }}>
                    Un problème est survenu
                </h1>
                
                <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6", marginBottom: "2rem" }}>
                    Désolé, une erreur inattendue s'est produite lors du chargement de cette page. Notre équipe technique a été alertée.
                </p>

                {process.env.NODE_ENV === "development" && (
                    <div style={{
                        background: "var(--surface-sunken)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "12px",
                        padding: "1rem",
                        textAlign: "left",
                        marginBottom: "2rem",
                        overflowX: "auto"
                    }}>
                        <p style={{ margin: 0, fontWeight: "600", fontSize: "0.85rem", color: "var(--state-critical)", marginBottom: "0.5rem" }}>
                            {error.name}: {error.message}
                        </p>
                        <pre style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
                            {error.stack}
                        </pre>
                    </div>
                )}

                <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
                    <button 
                        onClick={() => reset()}
                        style={{
                            width: "100%",
                            padding: "0.85rem",
                            borderRadius: "14px",
                            border: "none",
                            background: "var(--primary-color)",
                            color: "white",
                            fontWeight: "600",
                            fontSize: "0.95rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            transition: "opacity 0.2s"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                        <RotateCcw size={18} /> Réessayer de charger
                    </button>
                    
                    <Link href="/" style={{
                        width: "100%",
                        padding: "0.85rem",
                        borderRadius: "14px",
                        border: "1px solid var(--border-color)",
                        background: "white",
                        color: "var(--text-main)",
                        fontWeight: "600",
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        textDecoration: "none",
                        transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                    >
                        <Home size={18} /> Retour à l'accueil
                    </Link>
                </div>
            </div>
            
            <div style={{ marginTop: "2rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                UpcycleConnect © {new Date().getFullYear()}
            </div>
        </div>
    );
}
