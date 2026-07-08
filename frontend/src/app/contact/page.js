
"use client";
import "../landing.css";
import { useState } from "react";
import { Leaf, ArrowUpRight, Mail, MapPin, Phone, Loader2, CheckCircle2 } from "lucide-react";
import { apiUrl } from "../lib/api";

export default function ContactPage() {
    const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", subject: "Rejoindre la plateforme", message: "" });
    const [status, setStatus] = useState("idle"); // idle, loading, success, error
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Manual validation to prevent browser-specific native errors (like "The string did not match the expected pattern")
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.message) {
            setStatus("error");
            setErrorMsg("Veuillez remplir tous les champs.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setStatus("error");
            setErrorMsg("Format d'email invalide.");
            return;
        }

        setStatus("loading");
        
        try {
            const res = await fetch(apiUrl("/contact"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Erreur serveur");
            }
            
            setStatus("success");
            setFormData({ firstName: "", lastName: "", email: "", subject: "Rejoindre la plateforme", message: "" });
        } catch (err) {
            setStatus("error");
            setErrorMsg(err.message);
        }
    };

    return (
        <div className="landing-horizon">
            {/* Navbar */}
            <nav className="nav-horizon">
                <div className="nav-inner">
                    <div className="logo-brand">
                        <Leaf size={24} color="#233B3D" />
                        <span className="brand-text">UpcycleConnect</span>
                    </div>
                    <div className="nav-links">
                        <a href="/#about" className="nav-pill">À propos</a>
                        <a href="/#services" className="nav-pill" data-i18n-skip="true">Services</a>
                        <a href="/contact" className="nav-pill active">Contact</a>
                    </div>
                    <div className="nav-actions">
                        <a href="/login" className="btn-dark-pill">
                            Accéder à l'app <ArrowUpRight size={16} />
                        </a>
                    </div>
                </div>
            </nav>

            <main className="main-container" style={{ minHeight: "80vh", paddingTop: "4rem", paddingBottom: "4rem" }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem" }}>
                    <div style={{ textAlign: "center", marginBottom: "4rem" }}>
                        <span className="pill-badge">Contactez-nous</span>
                        <h1 className="hero-title" style={{ color: "var(--text-main)", marginTop: "1.5rem", fontSize: "clamp(2.5rem, 4vw, 3.5rem)" }}>
                            Prêt à transformer votre impact ?
                        </h1>
                        <p className="hero-subtitle" style={{ color: "var(--text-muted)", margin: "1rem auto 0", maxWidth: "600px" }}>
                            Que vous soyez un artisan cherchant à se développer ou une association voulant simplifier ses collectes, notre équipe est là pour vous accompagner.
                        </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "4rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", background: "var(--pill-bg)", padding: "2rem", borderRadius: "24px" }}>
                                <div style={{ width: "50px", height: "50px", background: "#11181C", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Mail size={24} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>Email</h3>
                                    <p style={{ color: "var(--text-muted)" }}>hello@upcycleconnect.com</p>
                                </div>
                            </div>
                            
                            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", background: "var(--pill-bg)", padding: "2rem", borderRadius: "24px" }}>
                                <div style={{ width: "50px", height: "50px", background: "#11181C", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Phone size={24} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>Téléphone</h3>
                                    <p style={{ color: "var(--text-muted)" }}>+33 1 23 45 67 89</p>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", background: "var(--pill-bg)", padding: "2rem", borderRadius: "24px" }}>
                                <div style={{ width: "50px", height: "50px", background: "#11181C", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <MapPin size={24} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>Atelier principal</h3>
                                    <p style={{ color: "var(--text-muted)" }}>15 Rue de la Transition<br/>75011 Paris</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: "white", border: "1px solid var(--border-color)", borderRadius: "32px", padding: "3rem", boxShadow: "0 10px 40px rgba(0,0,0,0.03)" }}>
                            {status === "success" ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem", textAlign: "center", color: "var(--brand-dark)" }}>
                                    <CheckCircle2 size={48} color="var(--brand-teal)" />
                                    <h2>Message envoyé !</h2>
                                    <p style={{ color: "var(--text-muted)" }}>Nous vous répondrons dans les plus brefs délais.</p>
                                    <button onClick={() => setStatus("idle")} className="btn-dark-pill" style={{ marginTop: "1rem" }}>
                                        Nouveau message
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                    {status === "error" && (
                                        <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: "12px", fontSize: "0.9rem" }}>
                                            {errorMsg}
                                        </div>
                                    )}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <label style={{ fontSize: "0.9rem", fontWeight: "500" }}>Prénom</label>
                                            <input type="text" placeholder="Jean" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} style={{ padding: "0.8rem 1rem", borderRadius: "12px", border: "1px solid var(--border-color)", outline: "none" }} />
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <label style={{ fontSize: "0.9rem", fontWeight: "500" }}>Nom</label>
                                            <input type="text" placeholder="Dupont" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} style={{ padding: "0.8rem 1rem", borderRadius: "12px", border: "1px solid var(--border-color)", outline: "none" }} />
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <label style={{ fontSize: "0.9rem", fontWeight: "500" }}>Email professionnel</label>
                                        <input type="text" placeholder="jean@atelier.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={{ padding: "0.8rem 1rem", borderRadius: "12px", border: "1px solid var(--border-color)", outline: "none" }} />
                                    </div>
                                    
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <label style={{ fontSize: "0.9rem", fontWeight: "500" }}>Sujet</label>
                                        <select value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} style={{ padding: "0.8rem 1rem", borderRadius: "12px", border: "1px solid var(--border-color)", outline: "none", background: "white" }}>
                                            <option>Rejoindre la plateforme</option>
                                            <option>Question technique</option>
                                            <option>Partenariat</option>
                                            <option>Autre</option>
                                        </select>
                                    </div>
                                    
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <label style={{ fontSize: "0.9rem", fontWeight: "500" }}>Message</label>
                                        <textarea rows="5" placeholder="Comment pouvons-nous vous aider ?" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} style={{ padding: "0.8rem 1rem", borderRadius: "12px", border: "1px solid var(--border-color)", outline: "none", resize: "none" }}></textarea>
                                    </div>
                                    
                                    <button type="submit" disabled={status === "loading"} className="btn-dark-pill-large" style={{ width: "100%", marginTop: "1rem", border: "none", textAlign: "center", cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? 0.7 : 1 }}>
                                        {status === "loading" ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}><Loader2 className="lucide-spin" size={20} /> Envoi...</span> : "Envoyer le message"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer Premium Minimal */}
            <footer className="footer-horizon" style={{ marginTop: "0" }}>
                <div className="footer-inner">
                    <div className="footer-grid" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                        <div className="footer-brand">
                            <div className="footer-logo">
                                <Leaf size={28} color="white" />
                                <span>UpcycleConnect</span>
                            </div>
                            <p>Le premier écosystème numérique dédié à l'upcycling professionnel.</p>
                        </div>
                    </div>
                    
                    <div className="footer-bottom">
                        <p>&copy; 2026 UpcycleConnect. Tous droits réservés.</p>
                        <div className="footer-bottom-links">
                            <a href="#">Mentions légales</a>
                            <a href="#">Confidentialité</a>
                        </div>
                    </div>
                </div>
            </footer>

            
        </div>
    );
}
