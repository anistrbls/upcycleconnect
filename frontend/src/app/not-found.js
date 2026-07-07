"use client";

import Link from "next/link";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
    const router = useRouter();

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
                maxWidth: "500px",
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
                    <AlertCircle size={40} />
                </div>
                
                <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "var(--text-main)", marginBottom: "1rem" }}>
                    Erreur 404
                </h1>
                
                <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6", marginBottom: "2.5rem" }}>
                    Oups ! La page que vous recherchez semble introuvable. Elle a peut-être été déplacée ou supprimée.
                </p>

                <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
                    <button 
                        onClick={() => router.back()}
                        style={{
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
                            transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                    >
                        <ArrowLeft size={18} /> Retour à la page précédente
                    </button>
                    
                    <Link href="/" style={{
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
                        textDecoration: "none",
                        transition: "opacity 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
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
