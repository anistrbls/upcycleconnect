"use client";

import { useState } from "react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";

export default function ServiceDetailView({ service, onBack }) {
    const [bookingMode, setBookingMode] = useState(false);
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const res = await fetch(apiUrl("/bookings"), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    serviceId: service.id,
                    message: message,
                    bookingType: service.bookingMode || "request",
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur lors de la réservation");

            setSuccessMessage("Votre demande a été envoyée avec succès !");
            setMessage("");
            setTimeout(() => {
                setBookingMode(false);
                setSuccessMessage("");
            }, 3000);
        } catch (err) {
            setErrorMessage(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <button 
                onClick={onBack}
                style={{ 
                    display: "flex", alignItems: "center", gap: "0.5rem", 
                    background: "none", border: "none", color: "var(--text-muted)", 
                    cursor: "pointer", marginBottom: "1.5rem", fontWeight: 600, fontSize: "0.9rem" 
                }}
            >
                ← Retour au catalogue
            </button>

            <div style={{ background: "#fff", borderRadius: "24px", overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.04)" }}>
                {service.imageUrl && (
                    <div style={{ width: "100%", height: "400px", background: "#111" }}>
                        {service.imageUrl.startsWith("data:video") ? (
                            <video src={service.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls />
                        ) : (
                            <img src={service.imageUrl} alt={service.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                    </div>
                )}

                <div style={{ padding: "2.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                        <div>
                            <span style={{ 
                                background: "rgba(46, 125, 110, 0.1)", color: "#2E7D6E", 
                                padding: "0.4rem 1rem", borderRadius: "999px", fontSize: "0.8rem", 
                                fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" 
                            }}>
                                {service.categoryName}
                            </span>
                            <h1 style={{ fontSize: "2.5rem", fontWeight: 800, margin: "1rem 0 0.5rem 0", color: "var(--text-main)" }}>{service.name}</h1>
                            <p style={{ fontSize: "1.1rem", color: "var(--text-muted)", fontWeight: 500 }}>{service.shortDescription}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#2E7D6E" }}>{Number(service.price).toFixed(2)} €</div>
                            {service.durationMinutes > 0 && (
                                <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>Durée : {service.durationMinutes} min</div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "3rem" }}>
                        <div>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Description</h3>
                            <div style={{ color: "var(--text-main)", lineHeight: 1.7, whiteSpace: "pre-wrap", fontSize: "1.05rem" }}>
                                {service.detailedDescription || service.description || "Aucun détail supplémentaire disponible."}
                            </div>
                        </div>

                        <div>
                            <div style={{ background: "var(--surface-hover)", padding: "1.5rem", borderRadius: "20px", border: "1px solid rgba(0,0,0,0.05)" }}>
                                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Infos pratiques</h3>
                                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
                                    <li style={{ display: "flex", gap: "0.75rem", fontSize: "0.9rem", alignItems: "center" }}>
                                        <span style={{ fontWeight: 600 }}>Public :</span>
                                        <span style={{ textTransform: "capitalize" }}>{service.targetAudience}</span>
                                    </li>
                                    <li style={{ display: "flex", gap: "0.75rem", fontSize: "0.9rem", alignItems: "center" }}>
                                        <span style={{ fontWeight: 600 }}>Mode :</span>
                                        <span style={{ textTransform: "capitalize" }}>
                                            {service.bookingMode === "booking" ? "Réservation avec créneau" : "Demande simple"}
                                        </span>
                                    </li>
                                </ul>

                                {!bookingMode && (
                                    <button 
                                        onClick={() => setBookingMode(true)}
                                        style={{ 
                                            width: "100%", marginTop: "1.5rem", background: "#111", 
                                            color: "#fff", border: "none", borderRadius: "14px", 
                                            padding: "1rem", fontWeight: 700, cursor: "pointer", 
                                            transition: "background 0.2s" 
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#333"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "#111"}
                                    >
                                        {service.bookingMode === "booking" ? "Réserver cette prestation" : "Faire une demande"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {bookingMode && (
                        <div style={{ marginTop: "3rem", paddingTop: "3rem", borderTop: "1px solid #eee" }}>
                            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem" }}>
                                {service.bookingMode === "booking" ? "Ma demande de réservation" : "Ma demande de prestation"}
                            </h3>
                            <form onSubmit={handleBookingSubmit} style={{ maxWidth: "600px" }}>
                                <div style={{ marginBottom: "1.5rem" }}>
                                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                                        Message ou précisions pour le professionnel
                                    </label>
                                    <textarea 
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Ex: Je souhaiterais effectuer cette prestation à domicile le week-end..."
                                        style={{ 
                                            width: "100%", padding: "1rem", borderRadius: "14px", 
                                            border: "1px solid #D7E0E1", minHeight: "120px", 
                                            outline: "none", fontSize: "1rem", fontFamily: "inherit" 
                                        }}
                                        required
                                    />
                                </div>

                                {errorMessage && <p style={{ color: "#B24A4A", fontSize: "0.9rem", marginBottom: "1rem", fontWeight: 600 }}>{errorMessage}</p>}
                                {successMessage && <p style={{ color: "#2E7D6E", fontSize: "0.9rem", marginBottom: "1rem", fontWeight: 600 }}>{successMessage}</p>}

                                <div style={{ display: "flex", gap: "1rem" }}>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        style={{ 
                                            background: "#2E7D6E", color: "#fff", border: "none", 
                                            borderRadius: "14px", padding: "1rem 2rem", fontWeight: 700, 
                                            cursor: isSubmitting ? "not-allowed" : "pointer" 
                                        }}
                                    >
                                        {isSubmitting ? "Envoi en cours..." : "Confirmer ma demande"}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setBookingMode(false)}
                                        style={{ background: "#eee", color: "#111", border: "none", borderRadius: "14px", padding: "1rem 2rem", fontWeight: 700, cursor: "pointer" }}
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
