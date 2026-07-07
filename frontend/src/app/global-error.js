"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }) {
    useEffect(() => {
        console.error("UpcycleConnect Critical Global Error:", error);
    }, [error]);

    return (
        <html lang="fr">
            <body>
                <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#f8fafc",
                    padding: "2rem",
                    textAlign: "center",
                    fontFamily: "system-ui, -apple-system, sans-serif"
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
                            color: "#ef4444",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 1.5rem"
                        }}>
                            <AlertOctagon size={40} />
                        </div>
                        
                        <h1 style={{ fontSize: "1.8rem", fontWeight: "800", color: "#0f172a", marginBottom: "1rem" }}>
                            Erreur Critique
                        </h1>
                        
                        <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: "1.6", marginBottom: "2rem" }}>
                            Une erreur système majeure s'est produite, empêchant le chargement de l'application. Notre équipe a été alertée.
                        </p>

                        <button 
                            onClick={() => reset()}
                            style={{
                                width: "100%",
                                padding: "0.85rem",
                                borderRadius: "14px",
                                border: "none",
                                background: "#0f172a",
                                color: "white",
                                fontWeight: "600",
                                fontSize: "0.95rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.5rem"
                            }}
                        >
                            <RotateCcw size={18} /> Recharger la page
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
