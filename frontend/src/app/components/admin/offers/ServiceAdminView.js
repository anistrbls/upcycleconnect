"use client";

import { useState } from "react";
import AdminModal from "../AdminModal";
import { formatDateFR } from "../../../lib/formatters";
import { fieldStyle, labelStyle, pillInputStyle } from "../../../lib/styles";

export default function ServiceAdminView({ services, categories, loading, errorMessage, onReload, onCreate, onUpdate, onDelete, onToggleStatus }) {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [formOpen, setFormOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [formState, setFormState] = useState({
        name: "",
        description: "",
        categoryId: "",
        type: "service",
        price: "0",
        isBookable: true,
        status: "brouillon",
    });
    const [localError, setLocalError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [hoveredServiceId, setHoveredServiceId] = useState(null);

    const hasCategories = categories.length > 0;

    const visibleServices = services.filter((item) => {
        const normalizedQuery = query.trim().toLowerCase();
        const queryMatch = !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery) || item.description.toLowerCase().includes(normalizedQuery);
        const statusMatch = statusFilter === "all" || item.status === statusFilter;
        const categoryMatch = categoryFilter === "all" || String(item.categoryId) === categoryFilter;
        return queryMatch && statusMatch && categoryMatch;
    });

    const resetForm = () => {
        setEditingService(null);
        setFormState({
            name: "",
            description: "",
            categoryId: categories[0] ? String(categories[0].id) : "",
            type: "service",
            price: "0",
            isBookable: true,
            status: "brouillon",
        });
        setLocalError("");
    };

    const handleNew = () => {
        if (!hasCategories) {
            window.alert("Aucune catégorie disponible. Créez une catégorie avant d'ajouter une prestation.");
            return;
        }
        resetForm();
        setFormOpen(true);
    };

    const handleEdit = (item) => {
        setEditingService(item);
        setFormState({
            name: item.name || "",
            description: item.description || "",
            categoryId: String(item.categoryId),
            type: item.type || "service",
            price: String(item.price ?? 0),
            isBookable: item.isBookable !== false,
            status: item.status || "brouillon",
        });
        setLocalError("");
        setFormOpen(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLocalError("");

        if (!formState.name.trim()) {
            setLocalError("Le nom de la prestation est requis.");
            return;
        }

        if (!formState.categoryId) {
            setLocalError("Une catégorie est obligatoire.");
            return;
        }

        const parsedPrice = Number(formState.price);
        if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
            setLocalError("Le prix doit être un nombre positif.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name: formState.name.trim(),
                description: formState.description.trim(),
                categoryId: Number(formState.categoryId),
                type: formState.type,
                price: parsedPrice,
                isBookable: formState.isBookable,
                status: formState.status,
            };

            if (editingService) {
                await onUpdate(editingService.id, payload);
            } else {
                await onCreate(payload);
            }

            setFormOpen(false);
            resetForm();
        } catch (err) {
            setLocalError(String(err?.message || "Une erreur est survenue."));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Supprimer la prestation ${item.name} ?`)) {
            return;
        }

        try {
            await onDelete(item.id);
        } catch (err) {
            window.alert(String(err?.message || "Impossible de supprimer la prestation."));
        }
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Offres & prestations</span>
                    <h1>Prestations</h1>
                </div>
            </div>

            {!hasCategories ? (
                <div className="panel" style={{ marginBottom: "1rem" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        Aucune catégorie n'existe encore. Créez d'abord une catégorie de prestations pour pouvoir ajouter une prestation.
                    </p>
                </div>
            ) : null}

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher une prestation"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        style={{ flex: "1 1 220px", minWidth: 0, ...pillInputStyle }}
                    />
                    <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        style={{ ...pillInputStyle, appearance: "none" }}
                    >
                        <option value="all">Toutes les catégories</option>
                        {categories.map((item) => (
                            <option key={item.id} value={String(item.id)}>{item.name}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        style={{ ...pillInputStyle, appearance: "none" }}
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="actif">actif</option>
                        <option value="inactif">inactif</option>
                        <option value="brouillon">brouillon</option>
                    </select>
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                    <button className="action-cta task-action-btn" type="button" onClick={handleNew}>Ajouter une prestation</button>
                </div>
                {(errorMessage || localError) ? (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage || localError}</p>
                ) : null}
            </div>

            <AdminModal
                open={formOpen}
                title={editingService ? "Modifier une prestation" : "Créer une prestation"}
                onClose={() => {
                    setFormOpen(false);
                    resetForm();
                }}
            >
                <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                        Nom de la prestation
                        <input
                            type="text"
                            placeholder="Ex: Atelier couture"
                            value={formState.name}
                            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                            style={fieldStyle}
                            required
                        />
                    </label>
                    <label style={labelStyle}>
                        Description
                        <textarea
                            placeholder="Description de la prestation"
                            value={formState.description}
                            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                            rows={3}
                            style={{ ...fieldStyle, resize: "vertical" }}
                        />
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.65rem" }}>
                        <label style={labelStyle}>
                            Catégorie
                            <select
                                value={formState.categoryId}
                                onChange={(event) => setFormState((prev) => ({ ...prev, categoryId: event.target.value }))}
                                style={{ ...fieldStyle, appearance: "none" }}
                                required
                            >
                                <option value="">Choisir une catégorie</option>
                                {categories.map((item) => (
                                    <option key={item.id} value={String(item.id)}>{item.name}</option>
                                ))}
                            </select>
                        </label>
                        <label style={labelStyle}>
                            Type
                            <select
                                value={formState.type}
                                onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value }))}
                                style={{ ...fieldStyle, appearance: "none" }}
                            >
                                <option value="service">service</option>
                                <option value="atelier">atelier</option>
                                <option value="formation">formation</option>
                                <option value="evenement">événement</option>
                            </select>
                        </label>
                        <label style={labelStyle}>
                            Prix (€)
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={formState.price}
                                onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
                                style={fieldStyle}
                            />
                        </label>
                        <label style={labelStyle}>
                            Statut
                            <select
                                value={formState.status}
                                onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
                                style={{ ...fieldStyle, appearance: "none" }}
                            >
                                <option value="actif">actif</option>
                                <option value="inactif">inactif</option>
                                <option value="brouillon">brouillon</option>
                            </select>
                        </label>
                    </div>
                    <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={formState.isBookable}
                            onChange={(event) => setFormState((prev) => ({ ...prev, isBookable: event.target.checked }))}
                            style={{ width: "1rem", height: "1rem", accentColor: "#3E686C" }}
                        />
                        Réservable en ligne
                    </label>
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                        <button className="action-cta task-action-btn" type="submit" disabled={isSaving}>
                            {isSaving ? "Enregistrement..." : (editingService ? "Mettre à jour" : "Créer")}
                        </button>
                        <button
                            className="action-cta"
                            type="button"
                            onClick={() => {
                                setFormOpen(false);
                                resetForm();
                            }}
                            style={{ background: "#e8ecee", color: "var(--text-main)" }}
                        >
                            Annuler
                        </button>
                    </div>
                </form>
            </AdminModal>

            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gridAutoRows: "1fr", alignItems: "stretch" }}>
                {loading ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Chargement...</p> : null}
                {!loading && visibleServices.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Aucune prestation trouvée.</p> : null}
                {!loading && visibleServices.map((item) => {
                    const isHovered = hoveredServiceId === item.id;
                    return (
                        <article
                            key={item.id}
                            onMouseEnter={() => setHoveredServiceId(item.id)}
                            onMouseLeave={() => setHoveredServiceId(null)}
                            style={{
                                background: "var(--surface-hover)",
                                borderRadius: "20px",
                                padding: "1.25rem",
                                display: "grid",
                                gap: "0.85rem",
                                height: "100%",
                                minHeight: "340px",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "flex-start" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{item.name}</h3>
                                <span className="db-badge" style={{ background: item.status === "actif" ? "#E5FFBC" : "#E6EDEE", textTransform: "capitalize" }}>
                                    {item.status}
                                </span>
                            </div>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.87rem", lineHeight: 1.5, minHeight: "2.6rem", maxHeight: "2.6rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                {item.description || "-"}
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", fontSize: "0.78rem", alignItems: "center" }}>
                                <span style={{ background: "#cad6d8", color: "#233B3D", borderRadius: "999px", padding: "0.24rem 0.65rem", fontWeight: 600 }}>
                                    {item.categoryName || "Sans catégorie"}
                                </span>
                            </div>
                            <div style={{ display: "grid", gap: "0.6rem", alignContent: "start" }}>
                                {!isHovered ? (
                                    <>
                                        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.96rem", color: "#1f3335", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                            </span>
                                            <span style={{ fontWeight: 700, fontSize: "1rem" }}>{Number(item.price || 0).toFixed(2)} €</span>
                                        </div>
                                        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.95rem", color: "#1f3335", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                            </span>
                                            <span style={{ textTransform: "capitalize" }}>{item.type}</span>
                                        </div>
                                        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.95rem", color: "#2b4548", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                            </span>
                                            <span>{formatDateFR(item.createdAt)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                            </span>
                                            <span style={{ fontSize: "0.92rem", color: "#1f3335" }}>{item.isBookable !== false ? "Réservable en ligne" : "Non réservable"}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                                            </span>
                                            <span style={{ fontSize: "0.92rem", color: "#1f3335", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.categoryName || "Sans catégorie"}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            </span>
                                            <span style={{ fontSize: "0.92rem", color: "#1f3335" }}>Créé le {formatDateFR(item.createdAt)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div style={{ marginTop: "auto", display: "flex", gap: "0.55rem", alignItems: "center", flexWrap: "wrap" }}>
                                <button className="action-cta" type="button" onClick={() => handleEdit(item)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Modifier</button>
                                {onToggleStatus && item.status !== "actif" && (
                                    <button className="action-cta" type="button" onClick={() => onToggleStatus(item.id, "actif")} style={{ background: "#E5FFBC", color: "#233B3D" }}>Activer</button>
                                )}
                                {onToggleStatus && item.status === "actif" && (
                                    <button className="action-cta" type="button" onClick={() => onToggleStatus(item.id, "inactif")} style={{ background: "#EAF0F1", color: "#4F6163" }}>Désactiver</button>
                                )}
                                <button className="action-cta" type="button" onClick={() => handleDelete(item)} style={{ background: "#f4e8e8", color: "#8e2d2d" }}>Supprimer</button>
                            </div>
                        </article>
                    );
                })}
            </div>
        </>
    );
}
