"use client";

import { useState } from "react";
import ServiceDetailView from "./ServiceDetailView";

export default function CatalogueView({ services, loading, errorMessage, onReload }) {
    const [selectedService, setSelectedService] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    if (selectedService) {
        return (
            <ServiceDetailView 
                service={selectedService} 
                onBack={() => setSelectedService(null)} 
            />
        );
    }

    const categories = Array.from(new Set(services.map(s => s.categoryName).filter(Boolean)));

    const visibleServices = services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (s.shortDescription || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || s.categoryName === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Prestations</span>
                    <h1>Catalogue de Prestations</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher une prestation..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: "1 1 220px", minWidth: 0, border: "1px solid #D7E0E1", borderRadius: "999px", padding: "0.45rem 1rem", fontSize: "0.88rem", outline: "none", color: "var(--text-main)", background: "#fff" }}
                    />
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{ border: "1px solid #D7E0E1", borderRadius: "999px", padding: "0.45rem 2rem 0.45rem 1rem", fontSize: "0.88rem", outline: "none", color: "var(--text-main)", background: "#fff", appearance: "none" }}
                    >
                        <option value="all">Toutes les catégories</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                </div>
                {errorMessage && (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>
                )}
            </div>

            <div style={{ 
                display: "grid", 
                gap: "1.5rem", 
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                animation: "fadeIn 0.5s ease-out"
            }}>
                {loading && [...Array(6)].map((_, i) => (
                    <div key={i} style={{ borderRadius: "28px", height: "380px", background: "var(--surface-hover)", animation: "skeletonPulse 1.4s ease-in-out infinite" }} />
                ))}
                {!loading && visibleServices.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "4rem 2rem", background: "var(--surface-hover)", borderRadius: "24px" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>Aucune prestation disponible pour le moment.</p>
                    </div>
                )}
                {!loading && visibleServices.map((item, index) => (
                    <article
                        key={item.id}
                        onClick={() => setSelectedService(item)}
                        style={{
                            position: "relative",
                            borderRadius: "28px",
                            overflow: "hidden",
                            height: "380px",
                            background: "#111",
                            boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                            cursor: "pointer",
                            transition: "transform 0.3s ease, box-shadow 0.3s ease",
                            animation: `cardAppear 0.45s ease-out both ${index * 0.05}s`
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-6px)";
                            e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.15)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "none";
                            e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.10)";
                        }}
                    >
                        {item.imageUrl ? (
                            <>
                                <img 
                                    src={item.imageUrl} 
                                    alt={item.name} 
                                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} 
                                />
                                <div style={{ 
                                    position: "absolute", 
                                    inset: 0, 
                                    background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, transparent 80%)",
                                    pointerEvents: "none" 
                                }} />
                            </>
                        ) : (
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #2E7D6E 0%, #1a4d44 100%)" }} />
                        )}

                        {/* Badges haut */}
                        <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem", display: "flex", gap: "0.5rem", zIndex: 2 }}>
                            <div style={{ 
                                padding: "0.4rem 1rem", 
                                borderRadius: "20px", 
                                fontSize: "0.75rem", 
                                fontWeight: 700, 
                                background: "rgba(255,255,255,0.15)", 
                                color: "#fff", 
                                backdropFilter: "blur(12px)",
                                border: "1px solid rgba(255,255,255,0.25)"
                            }}>
                                {item.bookingMode === "booking" ? "Réservation" : "Demande"}
                            </div>
                        </div>

                        {/* Contenu bas */}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.5rem", zIndex: 2 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", marginBottom: "0.75rem" }}>
                                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2 }}>{item.name}</h3>
                                <div style={{ 
                                    padding: "0.4rem 1rem", 
                                    borderRadius: "999px", 
                                    background: "#E5FFBC", 
                                    color: "#166534", 
                                    fontSize: "1rem", 
                                    fontWeight: 800,
                                    whiteSpace: "nowrap"
                                }}>
                                    {Number(item.price || 0).toFixed(2)} €
                                </div>
                            </div>
                            
                            <p style={{ 
                                fontSize: "0.85rem", 
                                color: "rgba(255,255,255,0.8)", 
                                margin: "0 0 1rem 0",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                lineHeight: 1.5
                            }}>
                                {item.shortDescription || item.description || "Aucune description"}
                            </p>

                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                                <span style={{ 
                                    padding: "0.3rem 0.8rem", 
                                    borderRadius: "999px", 
                                    background: "rgba(255,255,255,0.1)", 
                                    fontSize: "0.7rem", 
                                    color: "rgba(255,255,255,0.9)", 
                                    fontWeight: 600,
                                    border: "1px solid rgba(255,255,255,0.15)"
                                }}>
                                    {item.categoryName || "Sans catégorie"}
                                </span>
                                {item.durationMinutes > 0 && (
                                    <span style={{ 
                                        padding: "0.3rem 0.8rem", 
                                        borderRadius: "999px", 
                                        background: "rgba(255,255,255,0.1)", 
                                        fontSize: "0.7rem", 
                                        color: "rgba(255,255,255,0.9)", 
                                        fontWeight: 600,
                                        border: "1px solid rgba(255,255,255,0.15)"
                                    }}>
                                        {item.durationMinutes} min
                                    </span>
                                )}
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            <style jsx global>{`
                @keyframes cardAppear {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes skeletonPulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 0.8; }
                }
            `}</style>
        </>
    );
}
