"use client";

import { useEffect, useState } from "react";
import AdminModal from "../AdminModal";
import { EVENT_STATUSES } from "../../../lib/constants";
import { formatDateFR, toDateTimeInputValue } from "../../../lib/formatters";
import { fieldStyle, labelStyle, pillInputStyle } from "../../../lib/styles";

export default function EventAdminView({ events, categories, loading, errorMessage, onReload, onCreate, onUpdate, onDelete, onOpenEvent, pendingOpenEventId, onConsumedOpenEvent }) {
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [formOpen, setFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [localError, setLocalError] = useState("");
    const [hoveredEventId, setHoveredEventId] = useState(null);
    const [formState, setFormState] = useState({
        name: "",
        description: "",
        categoryId: "",
        dateDebut: "",
        dateFin: "",
        lieu: "",
        capacite: "",
        status: "brouillon",
        intervenant: "",
    });
    const hasCategories = categories.length > 0;

    const visibleEvents = events.filter((item) => {
        const normalizedQuery = query.trim().toLowerCase();
        const queryMatch = !normalizedQuery
            || item.name.toLowerCase().includes(normalizedQuery)
            || item.description.toLowerCase().includes(normalizedQuery)
            || item.lieu.toLowerCase().includes(normalizedQuery)
            || item.intervenant.toLowerCase().includes(normalizedQuery);
        const statusMatch = statusFilter === "all" || item.status === statusFilter;
        const categoryMatch = categoryFilter === "all" || String(item.categoryId) === categoryFilter;
        return queryMatch && statusMatch && categoryMatch;
    });

    const resetForm = () => {
        setEditingEvent(null);
        setFormState({
            name: "",
            description: "",
            categoryId: categories[0] ? String(categories[0].id) : "",
            dateDebut: "",
            dateFin: "",
            lieu: "",
            capacite: "",
            status: "brouillon",
            intervenant: "",
        });
        setLocalError("");
    };

    const handleCreate = () => {
        if (!hasCategories) {
            window.alert("Aucune categorie disponible. Creez d'abord une categorie avant d'ajouter un evenement.");
            return;
        }
        resetForm();
        setFormOpen(true);
    };

    const handleEdit = (item) => {
        setEditingEvent(item);
        setFormState({
            name: item.name || "",
            description: item.description || "",
            categoryId: String(item.categoryId || ""),
            dateDebut: toDateTimeInputValue(item.dateDebut),
            dateFin: toDateTimeInputValue(item.dateFin),
            lieu: item.lieu || "",
            capacite: item.capacite == null ? "" : String(item.capacite),
            status: item.status || "brouillon",
            intervenant: item.intervenant || "",
        });
        setLocalError("");
        setFormOpen(true);
    };

    useEffect(() => {
        if (!pendingOpenEventId) {
            return;
        }

        const target = events.find((item) => item.id === pendingOpenEventId);
        if (target) {
            setEditingEvent(target);
            setFormState({
                name: target.name || "",
                description: target.description || "",
                categoryId: String(target.categoryId || ""),
                dateDebut: toDateTimeInputValue(target.dateDebut),
                dateFin: toDateTimeInputValue(target.dateFin),
                lieu: target.lieu || "",
                capacite: target.capacite == null ? "" : String(target.capacite),
                status: target.status || "brouillon",
                intervenant: target.intervenant || "",
            });
            setLocalError("");
            setFormOpen(true);
        }

        onConsumedOpenEvent();
    }, [pendingOpenEventId, events, onConsumedOpenEvent]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLocalError("");

        if (!formState.name.trim()) {
            setLocalError("Le nom de l'événement est requis.");
            return;
        }

        if (!formState.categoryId) {
            setLocalError("Une categorie est obligatoire.");
            return;
        }

        if (!formState.dateDebut || !formState.dateFin) {
            setLocalError("Les dates de début et de fin sont obligatoires.");
            return;
        }

        const startDate = new Date(formState.dateDebut);
        const endDate = new Date(formState.dateFin);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            setLocalError("Format de date invalide.");
            return;
        }
        if (endDate < startDate) {
            setLocalError("La date de fin ne peut pas être avant la date de début.");
            return;
        }

        const capacity = formState.capacite.trim() === "" ? null : Number(formState.capacite);
        if (capacity != null && (Number.isNaN(capacity) || capacity < 0)) {
            setLocalError("La capacité doit être un nombre positif.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name: formState.name.trim(),
                description: formState.description.trim(),
                categoryId: Number(formState.categoryId),
                type: "evenement",
                dateDebut: startDate.toISOString(),
                dateFin: endDate.toISOString(),
                lieu: formState.lieu.trim(),
                capacite: capacity,
                status: formState.status,
                intervenant: formState.intervenant.trim(),
            };

            if (editingEvent) {
                await onUpdate(editingEvent.id, payload);
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
        if (!window.confirm(`Supprimer l'événement ${item.name} ?`)) {
            return;
        }
        try {
            await onDelete(item.id);
        } catch (err) {
            window.alert(String(err?.message || "Impossible de supprimer l'événement."));
        }
    };

    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Événements</span>
                    <h1>Tous les événements</h1>
                </div>
            </div>

            {!hasCategories ? (
                <div className="panel" style={{ marginBottom: "1rem" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        Aucune categorie n'existe encore. Creez d'abord une categorie d'evenements pour pouvoir ajouter un evenement.
                    </p>
                </div>
            ) : null}

            <div className="panel" style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Rechercher un événement"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        style={{ flex: "1 1 220px", minWidth: 0, ...pillInputStyle }}
                    />
                    <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={{ ...pillInputStyle, appearance: "none" }}>
                        <option value="all">Toutes les categories</option>
                        {categories.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ ...pillInputStyle, appearance: "none" }}>
                        <option value="all">Tous les statuts</option>
                        {EVENT_STATUSES.map((statusName) => <option key={statusName} value={statusName}>{statusName}</option>)}
                    </select>
                    <button className="action-cta task-action-btn" type="button" onClick={onReload}>Actualiser</button>
                    <button className="action-cta task-action-btn" type="button" onClick={handleCreate}>Ajouter un événement</button>
                </div>
                {(errorMessage || localError) ? (
                    <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage || localError}</p>
                ) : null}
            </div>

            <AdminModal
                open={formOpen}
                title={editingEvent ? "Modifier un événement" : "Créer un événement"}
                onClose={() => {
                    setFormOpen(false);
                    resetForm();
                }}
            >
                <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
                    <label style={labelStyle}>Nom<input type="text" value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} style={fieldStyle} required /></label>
                    <label style={labelStyle}>Description<textarea rows={3} value={formState.description} onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))} style={{ ...fieldStyle, resize: "vertical" }} /></label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.65rem" }}>
                        <label style={labelStyle}>Categorie<select value={formState.categoryId} onChange={(event) => setFormState((prev) => ({ ...prev, categoryId: event.target.value }))} style={{ ...fieldStyle, appearance: "none" }} required><option value="">Choisir une categorie</option>{categories.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select></label>
                        <label style={labelStyle}>Statut<select value={formState.status} onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))} style={{ ...fieldStyle, appearance: "none" }}>{EVENT_STATUSES.map((statusName) => <option key={statusName} value={statusName}>{statusName}</option>)}</select></label>
                        <label style={labelStyle}>Date début<input type="datetime-local" value={formState.dateDebut} onChange={(event) => setFormState((prev) => ({ ...prev, dateDebut: event.target.value }))} style={fieldStyle} required /></label>
                        <label style={labelStyle}>Date fin<input type="datetime-local" value={formState.dateFin} onChange={(event) => setFormState((prev) => ({ ...prev, dateFin: event.target.value }))} style={fieldStyle} required /></label>
                        <label style={labelStyle}>Lieu<input type="text" value={formState.lieu} onChange={(event) => setFormState((prev) => ({ ...prev, lieu: event.target.value }))} style={fieldStyle} /></label>
                        <label style={labelStyle}>Intervenant<input type="text" value={formState.intervenant} onChange={(event) => setFormState((prev) => ({ ...prev, intervenant: event.target.value }))} style={fieldStyle} /></label>
                        <label style={labelStyle}>Capacité<input type="number" min="0" value={formState.capacite} onChange={(event) => setFormState((prev) => ({ ...prev, capacite: event.target.value }))} style={fieldStyle} /></label>
                    </div>
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                        <button className="action-cta task-action-btn" type="submit" disabled={isSaving}>{isSaving ? "Enregistrement..." : (editingEvent ? "Mettre à jour" : "Créer")}</button>
                        <button className="action-cta" type="button" onClick={() => { setFormOpen(false); resetForm(); }} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Annuler</button>
                    </div>
                </form>
            </AdminModal>

            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gridAutoRows: "1fr", alignItems: "stretch" }}>
                {loading ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Chargement...</p> : null}
                {!loading && visibleEvents.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1 / -1" }}>Aucun événement trouvé.</p> : null}
                {!loading && visibleEvents.map((item) => {
                    const start = new Date(item.dateDebut);
                    const end = new Date(item.dateFin);
                    const isHovered = hoveredEventId === item.id;
                    return (
                        <article
                            key={item.id}
                            onMouseEnter={() => setHoveredEventId(item.id)}
                            onMouseLeave={() => setHoveredEventId(null)}
                            style={{
                                background: "var(--surface-hover)",
                                borderRadius: "20px",
                                padding: "1.25rem",
                                display: "grid",
                                gap: "0.85rem",
                                height: "100%",
                                minHeight: "360px",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", alignItems: "flex-start" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{item.name}</h3>
                                <span className="db-badge" style={{ background: item.status === "valide" ? "#E5FFBC" : "#E6EDEE", textTransform: "capitalize" }}>
                                    {item.status}
                                </span>
                            </div>

                            <p
                                style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.87rem",
                                    lineHeight: 1.5,
                                    minHeight: "2.7rem",
                                    maxHeight: "2.7rem",
                                    overflow: "hidden",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                }}
                            >
                                {item.description || "-"}
                            </p>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", fontSize: "0.78rem", alignItems: "center" }}>
                                <span style={{ background: "#cad6d8", color: "#233B3D", borderRadius: "999px", padding: "0.24rem 0.65rem", fontWeight: 600 }}>
                                    {item.categoryName || "Sans catégorie"}
                                </span>
                            </div>

                            <div style={{ display: "grid", gap: "0.6rem", minHeight: "172px", alignContent: "start" }}>
                                {!isHovered ? (
                                    <>
                                        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.96rem", color: "#1f3335", letterSpacing: "0.01em", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M8 2v4M16 2v4M3 10h18M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
                                                </svg>
                                            </span>
                                            <span>{start.toLocaleDateString("fr-FR")}</span>
                                        </div>
                                        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.95rem", color: "#1f3335", letterSpacing: "0.01em", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20" />
                                                </svg>
                                            </span>
                                            <span>{start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} - {end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                                        </div>
                                        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", fontSize: "0.95rem", color: "#2b4548", display: "flex", alignItems: "center", gap: "0.58rem", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 22s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
                                                </svg>
                                            </span>
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.lieu || "-"}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
                                                </svg>
                                            </span>
                                            <span style={{ fontSize: "0.92rem", color: "#1f3335", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.intervenant || "-"}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                    <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
                                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                </svg>
                                            </span>
                                            <span style={{ fontSize: "0.92rem", color: "#1f3335", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.capacite == null ? "-" : `${item.capacite} places`}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "#ffffff", borderRadius: "14px", padding: "0.72rem 0.8rem", border: "1px solid rgba(47, 79, 83, 0.08)", minHeight: "52px" }}>
                                            <span style={{ minWidth: "1.8rem", height: "1.8rem", borderRadius: "999px", background: "#111111", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M8 2v4M16 2v4M3 10h18M4 6h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
                                                </svg>
                                            </span>
                                            <span style={{ fontSize: "0.92rem", color: "#1f3335" }}>{formatDateFR(item.createdAt)}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{ marginTop: "auto", display: "flex", gap: "0.55rem", alignItems: "center", flexWrap: "wrap" }}>
                                <button className="action-cta" type="button" onClick={() => handleEdit(item)} style={{ background: "#e8ecee", color: "var(--text-main)" }}>Modifier</button>
                                <button className="action-cta" type="button" onClick={() => handleDelete(item)} style={{ background: "#f4e8e8", color: "#8e2d2d" }}>Supprimer</button>
                                <button className="action-cta" type="button" onClick={() => onOpenEvent(item)} style={{ background: "#e5ffbc", color: "#233B3D" }}>Ouvrir</button>
                            </div>
                        </article>
                    );
                })}
            </div>
        </>
    );
}
