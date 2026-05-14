"use client";

// REDESIGN: formulaire pleine-page style "Déposer une annonce", navigation par subpage
import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminModal from "../admin/AdminModal";
import EventDetailView from "../shared/events/EventDetailView";
import { EVENT_STATUSES, EVENT_TYPES } from "../../lib/constants";
import { TOKEN_KEY } from "../../lib/api";
import { toDateTimeInputValue } from "../../lib/formatters";
import {
    MAX_VIDEO_DURATION_SEC,
    MAX_VIDEO_FILE_BYTES,
    getVideoDurationFromFile,
    previewLooksLikeVideo,
} from "../../lib/mediaUploadLimits";

const TYPE_LABELS = { atelier: "Atelier", formation: "Formation", evenement: "Événement", conference: "Conférence" };
const TYPE_COLORS = {
    atelier:    { bg: "#EAF4FF", color: "#2563EB" },
    formation:  { bg: "#F0FFF4", color: "#166534" },
    evenement:  { bg: "#FFF7ED", color: "#92400E" },
    conference: { bg: "#FAF5FF", color: "#6B21A8" },
};
const STATUS_COLORS = {
    brouillon: { bg: "#E6EDEE", color: "#444" },
    planifie:  { bg: "#EAF4FF", color: "#2563EB" },
    valide:    { bg: "#E5FFBC", color: "#166534" },
    annule:    { bg: "#FDE8E8", color: "#B24A4A" },
    termine:   { bg: "#F0F0F0", color: "#555" },
};
const VALIDATION_COLORS = {
    pending:  { bg: "#FFF3E0", color: "#A56A2A" },
    approved: { bg: "#E5FFBC", color: "#3A6A2A" },
    rejected: { bg: "#FDE8E8", color: "#B24A4A" },
};
const VALIDATION_LABELS = { pending: "En attente", approved: "Validé", rejected: "Refusé" };
const TYPE_EMOJI = { atelier: "🛠️", formation: "📚", conference: "🎤", evenement: "🎉" };
const SALARIE_STATUSES = ["brouillon", "planifie"];
const EMPTY_FORM = {
    name: "", description: "", type: "formation",
    dateDebut: "", duree: "60",
    adresse: "", codePostal: "", ville: "", pays: "France",
    capaciteMax: "",
    status: "brouillon", imageUrl: "",
    pricingType: "gratuit", price: "",
};

const S = {
    container: { width: "100%", padding: "1rem 2rem 3rem 0", animation: "fadeIn 0.5s ease-out" },
    grid: { display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem", alignItems: "start" },
    card: { background: "var(--surface-hover)", borderRadius: "28px", padding: "2rem" },
    sectionTitle: { fontSize: "1rem", fontWeight: 700, margin: "0 0 1.25rem 0", display: "flex", alignItems: "center", gap: "0.5rem" },
    label: { display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 500, color: "var(--text-muted)" },
    input: { padding: "0.75rem 1rem", borderRadius: "14px", border: "none", background: "#fff", fontSize: "0.92rem", outline: "none", width: "100%", boxSizing: "border-box" },
    select: { padding: "0.75rem 1rem", borderRadius: "14px", border: "none", background: "#fff", fontSize: "0.92rem", outline: "none", width: "100%", appearance: "none", cursor: "pointer" },
    textarea: { padding: "0.75rem 1rem", borderRadius: "14px", border: "none", background: "#fff", fontSize: "0.92rem", outline: "none", width: "100%", resize: "vertical", minHeight: "100px", boxSizing: "border-box" },
    btnPrimary: { padding: "0.75rem 1.5rem", borderRadius: "20px", border: "none", background: "var(--black)", color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", width: "100%" },
    btnSecondary: { padding: "0.6rem 1.25rem", borderRadius: "20px", border: "none", background: "#e8ecee", color: "var(--text-main)", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer" },
    errorBox: { padding: "0.75rem 1rem", borderRadius: "14px", background: "#FDE8E8", color: "#B24A4A", fontSize: "0.83rem", marginTop: "0.75rem" },
    photoBox: { border: "2px dashed #d0d8da", borderRadius: "20px", padding: "2.5rem 1rem", textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,0.75)", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" },
};

const IconTrash = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
);
const IconUsers = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const IconCamera = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);
const IconChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

function EventForm({ editingEvent, formState, setFormState, onSubmit, onCancel, isSaving, localError, categories }) {
    const fileRef = useRef();
    const [adresseSuggestions, setAdresseSuggestions] = useState([]);
    const [adresseLoading, setAdresseLoading] = useState(false);

    const set = (key) => (e) => setFormState(p => ({ ...p, [key]: e.target.value }));

    const searchAddress = async (query) => {
        if (!query || query.length < 3) { setAdresseSuggestions([]); return; }
        setAdresseLoading(true);
        try {
            const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
            if (res.ok) {
                const data = await res.json();
                setAdresseSuggestions(data.features || []);
            }
        } catch { /* silencieux */ }
        finally { setAdresseLoading(false); }
    };

    const handleAdresseChange = (e) => {
        setFormState(p => ({ ...p, adresse: e.target.value }));
        searchAddress(e.target.value);
    };

    const selectSuggestion = (feature) => {
        const { properties } = feature;
        setFormState(p => ({
            ...p,
            adresse: properties.name || properties.label || "",
            codePostal: properties.postcode || "",
            ville: properties.city || "",
        }));
        setAdresseSuggestions([]);
    };

    const handleFileDrop = (file) => {
        void (async () => {
            if (!file) return;
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (ev) => setFormState((p) => ({ ...p, imageUrl: ev.target.result }));
                reader.readAsDataURL(file);
                return;
            }
            if (file.type.startsWith("video/")) {
                if (file.size > MAX_VIDEO_FILE_BYTES) {
                    alert(`Vidéo trop volumineuse (max ${Math.round(MAX_VIDEO_FILE_BYTES / (1024 * 1024))} Mo).`);
                    return;
                }
                try {
                    const dur = await getVideoDurationFromFile(file);
                    if (dur > MAX_VIDEO_DURATION_SEC + 0.2) {
                        alert(
                            `La vidéo ne doit pas dépasser ${MAX_VIDEO_DURATION_SEC} secondes (durée détectée : environ ${Math.ceil(dur)} s).`,
                        );
                        return;
                    }
                } catch {
                    alert("Impossible de vérifier la durée de la vidéo.");
                    return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => setFormState((p) => ({ ...p, imageUrl: ev.target.result }));
                reader.readAsDataURL(file);
                return;
            }
            alert("Format non accepté. Utilisez une image (JPG, PNG, WebP…) ou une vidéo MP4 / WebM / MOV.");
        })();
    };
    return (
        <div style={S.container}>
            <div style={{ marginBottom: "2rem" }}>
                <button type="button" onClick={onCancel}
                    style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem", padding: 0 }}>
                    <IconChevronLeft /> Retour
                </button>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Espace salarié</span>
                <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>
                    {editingEvent ? "Modifier l'événement" : "Créer un événement"}
                </h1>
            </div>
            <form onSubmit={onSubmit}>
                <div style={S.grid}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div style={S.card}>
                            <h2 style={S.sectionTitle}>Informations générales</h2>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <label style={S.label}>
                                    Nom de l'événement *
                                    <input type="text" value={formState.name} onChange={set("name")} style={S.input} required placeholder="Ex. Atelier réparation vélo" />
                                </label>
                                <label style={S.label}>
                                    Description
                                    <textarea value={formState.description} onChange={set("description")} style={S.textarea} placeholder="Décrivez votre événement…" />
                                </label>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                                    <label style={S.label}>
                                        Type
                                        <select value={formState.type} onChange={set("type")} style={S.select}>
                                            {EVENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div style={S.card}>
                            <h2 style={S.sectionTitle}>Dates & lieu</h2>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                                <label style={S.label}>
                                    Date de début *
                                    <input type="datetime-local" value={formState.dateDebut}
                                        min={!editingEvent ? new Date(Date.now() + 60000).toISOString().slice(0, 16) : undefined}
                                        onChange={set("dateDebut")} style={S.input} required />
                                </label>
                                <label style={S.label}>
                                    Durée *
                                    <select value={formState.duree} onChange={set("duree")} style={S.select} required>
                                        <option value="30">30 min</option>
                                        <option value="60">1h</option>
                                        <option value="90">1h30</option>
                                        <option value="120">2h</option>
                                        <option value="180">3h</option>
                                        <option value="240">4h</option>
                                        <option value="360">6h</option>
                                        <option value="480">8h (journée)</option>
                                    </select>
                                </label>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "1rem" }}>
                                <div style={S.label}>
                                    Adresse
                                    <div style={{ position: "relative" }}>
                                        <input
                                            type="text" value={formState.adresse}
                                            onChange={handleAdresseChange}
                                            style={S.input} placeholder="15 rue des Arts"
                                            autoComplete="off"
                                        />
                                        {adresseLoading && (
                                            <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", color: "var(--text-muted)" }}>…</span>
                                        )}
                                        {adresseSuggestions.length > 0 && (
                                            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 20, overflow: "hidden" }}>
                                                {adresseSuggestions.map((s, idx) => (
                                                    <div key={idx} onClick={() => selectSuggestion(s)}
                                                        style={{ padding: "0.7rem 1rem", fontSize: "0.84rem", cursor: "pointer", borderBottom: idx === adresseSuggestions.length - 1 ? "none" : "1px solid #f0f0f0" }}
                                                        onMouseEnter={e => e.currentTarget.style.background = "#f7f9fa"}
                                                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                                                        <div style={{ fontWeight: 600 }}>{s.properties.name}</div>
                                                        <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>{s.properties.postcode} {s.properties.city}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <label style={S.label}>Code postal<input type="text" value={formState.codePostal} onChange={set("codePostal")} style={S.input} placeholder="75001" /></label>
                                <label style={S.label}>Ville<input type="text" value={formState.ville} onChange={set("ville")} style={S.input} placeholder="Paris" /></label>
                                <label style={S.label}>Pays<input type="text" value={formState.pays} onChange={set("pays")} style={S.input} /></label>
                            </div>
                        </div>
                        <div style={S.card}>
                            <h2 style={S.sectionTitle}>Capacité & tarification</h2>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <label style={S.label}>
                                    Statut
                                    <select value={formState.status} onChange={set("status")} style={S.select}>
                                        {SALARIE_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                    </select>
                                </label>
                                <label style={S.label}>Places max<input type="number" min="0" value={formState.capaciteMax} onChange={set("capaciteMax")} style={S.input} placeholder="30" /></label>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                                <label style={S.label}>
                                    Tarification
                                    <select value={formState.pricingType} onChange={set("pricingType")} style={S.select}>
                                        <option value="gratuit">Gratuit</option>
                                        <option value="payant">Payant</option>
                                    </select>
                                </label>
                                {formState.pricingType === "payant" && (
                                    <label style={S.label}>Prix (€)<input type="number" min="0" step="0.01" value={formState.price} onChange={set("price")} style={S.input} placeholder="12.00" /></label>
                                )}
                            </div>
                        </div>
                        <div style={S.card}>
                            <h2 style={S.sectionTitle}>Image de couverture</h2>
                            {formState.imageUrl ? (
                                <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", marginBottom: "0.5rem" }}>
                                    {previewLooksLikeVideo(formState.imageUrl) ? (
                                        <video
                                            src={formState.imageUrl}
                                            controls
                                            playsInline
                                            muted
                                            style={{ width: "100%", maxHeight: "220px", objectFit: "contain", display: "block", background: "#111" }}
                                        />
                                    ) : (
                                        <img src={formState.imageUrl} alt="Aperçu" style={{ width: "100%", maxHeight: "220px", objectFit: "cover", display: "block" }} />
                                    )}
                                    <button type="button" onClick={() => setFormState(p => ({ ...p, imageUrl: "" }))}
                                        style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1rem" }}>
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <div style={S.photoBox} onClick={() => fileRef.current?.click()}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => { e.preventDefault(); handleFileDrop(e.dataTransfer.files[0]); }}>
                                    <IconCamera />
                                    <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Cliquer ou glisser une image ou une vidéo</span>
                                    <span style={{ fontSize: "0.78rem" }}>
                                        Image : JPG, PNG, WebP — Vidéo : {MAX_VIDEO_DURATION_SEC} s max., {Math.round(MAX_VIDEO_FILE_BYTES / (1024 * 1024))} Mo max.
                                    </span>
                                </div>
                            )}
                            <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" style={{ display: "none" }} onChange={e => handleFileDrop(e.target.files[0])} />
                            <div style={{ marginTop: "0.75rem" }}>
                                <label style={{ ...S.label, fontSize: "0.78rem" }}>
                                    URL externe (facultatif)
                                    <input type="url" value={formState.imageUrl} onChange={set("imageUrl")} style={{ ...S.input, fontSize: "0.82rem" }} placeholder="https://…" />
                                </label>
                            </div>
                        </div>
                        {localError && <div style={S.errorBox}>{localError}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", position: "sticky", top: "1rem" }}>
                        <div style={S.card}>
                            <h2 style={S.sectionTitle}>Publication</h2>
                            <button type="submit" disabled={isSaving} style={S.btnPrimary}>
                                {isSaving ? "Enregistrement…" : editingEvent ? "Mettre à jour" : "Créer l'événement"}
                            </button>
                            <button type="button" onClick={onCancel} style={{ ...S.btnSecondary, width: "100%", marginTop: "0.65rem" }}>
                                Annuler
                            </button>
                        </div>
                        <div style={{ ...S.card, background: "#EAF4FF" }}>
                            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.75rem 0" }}>Validation</h3>
                            <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
                                Votre événement sera soumis à validation avant d'être publiquement visible.
                            </p>
                        </div>
                        <div style={{ ...S.card, background: "#FFF8E6" }}>
                            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.75rem 0" }}>Conflits horaires</h3>
                            <p style={{ fontSize: "0.83rem", color: "#7A5A2A", margin: 0, lineHeight: 1.55 }}>
                                Le système vérifie automatiquement les conflits horaires.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

/* ─── Composant principal ────────────────────────────────────────────────── */

export default function SalarieFormationsView({ events = [], loading, errorMessage, onCreate, onUpdate, onDelete, categories = [], subpage = "mes-evenements" }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedEventId = searchParams.get("id");

    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [formOpen, setFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [localError, setLocalError] = useState("");
    const [formState, setFormState] = useState({ ...EMPTY_FORM });

    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [participantsEvent, setParticipantsEvent] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [participantsLoading, setParticipantsLoading] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [eventToCancel, setEventToCancel] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);
    const [publishModalOpen, setPublishModalOpen] = useState(false);
    const [eventToPublish, setEventToPublish] = useState(null);

    const detectConflict = (startDate, endDate, excludeId) =>
        events.find(e => {
            if (e.id === excludeId) return false;
            if (e.validationStatus !== "approved") return false;
            return startDate < new Date(e.dateFin) && endDate > new Date(e.dateDebut);
        });

    const filteredEvents = events.filter(e => {
        const q = query.trim().toLowerCase();
        const matchQ = !q || e.name.toLowerCase().includes(q) || (e.lieu || "").toLowerCase().includes(q);
        const matchS = subpage === "brouillons"
            ? e.status === "brouillon" && e.validationStatus !== "approved"
            : e.status !== "brouillon" && (statusFilter === "all" || e.status === statusFilter);
        return matchQ && matchS;
    });

    const resetForm = () => {
        setEditingEvent(null);
        setFormState({ ...EMPTY_FORM });
        setLocalError("");
    };

    const handleEdit = (item) => {
        setEditingEvent(item);
        const parts = (item.lieu || "").split(",").map(s => s.trim());
        setFormState({
            name: item.name || "", description: item.description || "",
            type: item.type || "formation",
            dateDebut: toDateTimeInputValue(item.dateDebut),
            duree: (() => { const opts=[30,60,90,120,180,240,360,480]; const m=Math.round((new Date(item.dateFin)-new Date(item.dateDebut))/60000); return String(opts.reduce((a,b)=>Math.abs(b-m)<Math.abs(a-m)?b:a,opts[0])); })(),
            adresse: parts[0] || "", codePostal: "", ville: parts[1] || "", pays: parts[2] || "France",
            capaciteMax: item.capaciteMax == null ? (item.capacite == null ? "" : String(item.capacite)) : String(item.capaciteMax),
            status: item.status || "brouillon", imageUrl: item.imageUrl || "",
            pricingType: item.pricingType || "gratuit",
            price: item.price != null && item.price > 0 ? String(item.price) : "",
        });
        setFormOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");
        const f = formState;
        if (!f.name.trim()) { setLocalError("Le nom est requis."); return; }
        if (!f.dateDebut) { setLocalError("La date de début est obligatoire."); return; }
        const startDate = new Date(f.dateDebut);
        const endDate = new Date(startDate.getTime() + Number(f.duree) * 60000);
        if (!editingEvent && startDate <= new Date()) { setLocalError("La date de début doit être dans le futur."); return; }
        const conflict = detectConflict(startDate, endDate, editingEvent && editingEvent.id);
        if (conflict) { setLocalError(`Conflit horaire avec "${conflict.name}"`); return; }
        setIsSaving(true);
        try {
            const payload = {
                name: f.name.trim(), description: f.description.trim(),
                type: f.type,
                dateDebut: startDate.toISOString(), dateFin: endDate.toISOString(),
                lieu: [f.adresse, [f.codePostal, f.ville].filter(Boolean).join(" "), f.pays].filter(Boolean).join(", "),
                capacite: f.capaciteMax.trim() === "" ? null : Number(f.capaciteMax),
                capaciteMax: f.capaciteMax.trim() === "" ? null : Number(f.capaciteMax),
                status: f.status, imageUrl: f.imageUrl,
                pricingType: f.pricingType,
                price: f.pricingType === "payant" && f.price !== "" ? Number(f.price) : 0,
            };
            if (editingEvent) {
                await onUpdate(editingEvent.id, payload);
                setFormOpen(false); resetForm();
            } else {
                await onCreate(payload);
                resetForm();
                router.push("/salarie-formations/mes-evenements");
            }
        } catch (err) { setLocalError(String(err?.message || "Une erreur est survenue.")); }
        finally { setIsSaving(false); }
    };

    const handleDelete = (item) => {
        setEventToDelete(item);
        setDeleteModalOpen(true);
    };

    const confirmDeletion = async () => {
        if (!eventToDelete) return;
        setIsSaving(true);
        try {
            await onDelete(eventToDelete.id);
            setDeleteModalOpen(false);
            setEventToDelete(null);
        } catch (err) {
            window.alert(String(err?.message || "Impossible de supprimer."));
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = (item) => {
        setEventToPublish(item);
        setPublishModalOpen(true);
    };

    const confirmPublish = async () => {
        if (!eventToPublish) return;
        setIsSaving(true);
        try {
            const item = eventToPublish;
            const payload = {
                name: item.name,
                description: item.description || "",
                type: item.type,
                dateDebut: item.dateDebut,
                dateFin: item.dateFin,
                lieu: item.lieu || "",
                capacite: item.capacite ?? item.capaciteMax ?? null,
                capaciteMax: item.capacite ?? item.capaciteMax ?? null,
                status: "planifie",
                imageUrl: item.imageUrl || "",
                pricingType: item.pricingType || "gratuit",
                price: item.price ?? 0,
                intervenantId: item.intervenantId ?? null,
            };
            await onUpdate(item.id, payload);
            setPublishModalOpen(false);
            setEventToPublish(null);
        } catch (err) {
            window.alert(String(err?.message || "Impossible d'envoyer en validation."));
        } finally {
            setIsSaving(false);
        }
    };

    const handleViewParticipants = async (item) => {
        setParticipantsEvent(item); setParticipantsLoading(true); setParticipantsOpen(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
            const res = await fetch("/api/events/" + item.id + "/participants", { headers: { Authorization: "Bearer " + token } });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setParticipants(data.items || []);
        } catch { setParticipants([]); } finally { setParticipantsLoading(false); }
    };

    const handleMarkAbsent = async (userId) => {
        if (!participantsEvent) return;
        setParticipantsLoading(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
            const res = await fetch(`/api/admin/events/${participantsEvent.id}/participants/${userId}/absent`, {
                method: "POST",
                headers: { Authorization: "Bearer " + token }
            });
            if (!res.ok) throw new Error("Erreur");
            handleViewParticipants(participantsEvent);
        } catch (err) {
            window.alert(err.message || "Erreur lors du marquage de l'absence.");
            setParticipantsLoading(false);
        }
    };

    const handleCancelEvent = (item) => {
        setEventToCancel(item);
        setCancelModalOpen(true);
    };

    const confirmCancellation = async () => {
        if (!eventToCancel) return;
        setIsSaving(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
            const res = await fetch(`/api/admin/events/${eventToCancel.id}/cancel`, {
                method: "POST",
                headers: { Authorization: "Bearer " + token }
            });
            if (!res.ok) throw new Error("Erreur lors de l'annulation de l'événement.");
            setCancelModalOpen(false);
            setEventToCancel(null);
            if (typeof window !== "undefined") window.location.reload();
        } catch (err) {
            window.alert(err.message || "Erreur lors de l'annulation.");
        } finally {
            setIsSaving(false);
        }
    };

    if (selectedEventId) {
        return (
            <EventDetailView
                eventId={selectedEventId}
                onBack={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete("id");
                    router.push(`${window.location.pathname}?${params.toString()}`);
                }}
            />
        );
    }

    /* Formulaire : subpage creer ou édition via formOpen */
    if (subpage === "creer" || formOpen) {
        return (
            <EventForm
                editingEvent={editingEvent} formState={formState} setFormState={setFormState}
                onSubmit={handleSubmit}
                onCancel={() => {
                    if (subpage === "creer" && !editingEvent) {
                        resetForm();
                        router.push("/salarie-formations/mes-evenements");
                    } else {
                        setFormOpen(false); resetForm();
                    }
                }}
                isSaving={isSaving} localError={localError} categories={categories}
            />
        );
    }

    /* Vue liste */
    return (
        <>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">Espace salarié</span>
                    <h1>{subpage === "brouillons" ? "Brouillons" : "Mes événements"}</h1>
                </div>
            </div>

            <div className="panel" style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input type="text" placeholder="Rechercher…" value={query} onChange={e => setQuery(e.target.value)}
                        style={{ flex: "1 1 200px", minWidth: 0, padding: "0.6rem 1rem", borderRadius: "20px", border: "1px solid #e0e8ea", fontSize: "0.88rem", outline: "none", background: "#fff" }} />
                    {subpage !== "brouillons" && (
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            style={{ padding: "0.6rem 1rem", borderRadius: "20px", border: "1px solid #e0e8ea", fontSize: "0.88rem", background: "#fff", cursor: "pointer" }}>
                            <option value="all">Tous les statuts</option>
                            {EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    )}
                    <button type="button" onClick={() => router.push("/salarie-formations/creer")}
                        style={{ padding: "0.6rem 1.25rem", borderRadius: "20px", border: "none", background: "var(--black)", color: "#fff", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                        + Créer un événement
                    </button>
                </div>
                {errorMessage && <p style={{ marginTop: "0.75rem", color: "#a23b3b", fontSize: "0.85rem" }}>{errorMessage}</p>}
            </div>

            <AdminModal open={cancelModalOpen} title="Confirmer l'annulation" onClose={() => setCancelModalOpen(false)}>
                <div style={{ display: "grid", gap: "1.5rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.4 }}>
                            Annuler l'événement <span style={{ color: "var(--black)" }}>"{eventToCancel?.name}"</span> ?
                        </p>
                        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                            Cette action est <strong style={{ color: "#DC2626" }}>irréversible</strong>. 
                            Tous les participants seront désinscrits et ceux ayant payé seront <strong style={{ color: "var(--black)" }}>intégralement remboursés</strong>.
                        </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <button type="button" onClick={() => setCancelModalOpen(false)} style={{ ...S.btnSecondary, padding: "0.85rem", fontSize: "0.92rem" }}>Garder l'événement</button>
                        <button type="button" disabled={isSaving} onClick={confirmCancellation} style={{ ...S.btnPrimary, background: "#DC2626", padding: "0.85rem", fontSize: "0.92rem" }}>
                            {isSaving ? "Traitement..." : "Confirmer l'annulation"}
                        </button>
                    </div>
                </div>
            </AdminModal>

            <AdminModal open={deleteModalOpen} title="Confirmer la suppression" onClose={() => setDeleteModalOpen(false)}>
                <div style={{ display: "grid", gap: "1.5rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.4 }}>
                            Supprimer l'événement <span style={{ color: "var(--black)" }}>"{eventToDelete?.name}"</span> ?
                        </p>
                        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                            Cette action est <strong style={{ color: "#DC2626" }}>irréversible</strong>. 
                            Toutes les données associées seront définitivement supprimées.
                        </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <button type="button" onClick={() => setDeleteModalOpen(false)} style={{ ...S.btnSecondary, padding: "0.85rem", fontSize: "0.92rem" }}>Annuler</button>
                        <button type="button" disabled={isSaving} onClick={confirmDeletion} style={{ ...S.btnPrimary, background: "#DC2626", padding: "0.85rem", fontSize: "0.92rem" }}>
                            {isSaving ? "Suppression..." : "Supprimer définitivement"}
                        </button>
                    </div>
                </div>
            </AdminModal>

            <AdminModal open={publishModalOpen} title="Envoyer en validation" onClose={() => setPublishModalOpen(false)}>
                <div style={{ display: "grid", gap: "1.5rem", padding: "0.5rem 0" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.4 }}>
                            Publier <span style={{ color: "var(--black)" }}>"{eventToPublish?.name}"</span> ?
                        </p>
                        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                            Votre événement sera envoyé à l'équipe administrative pour validation. 
                            Il sera rendu public dès qu'un administrateur l'aura approuvé.
                        </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <button type="button" onClick={() => setPublishModalOpen(false)} style={{ ...S.btnSecondary, padding: "0.85rem", fontSize: "0.92rem" }}>Plus tard</button>
                        <button type="button" disabled={isSaving} onClick={confirmPublish} style={{ ...S.btnPrimary, padding: "0.85rem", fontSize: "0.92rem" }}>
                            {isSaving ? "Envoi..." : "Envoyer maintenant"}
                        </button>
                    </div>
                </div>
            </AdminModal>

            <AdminModal open={participantsOpen} title={"Participants — " + (participantsEvent ? participantsEvent.name : "")} onClose={() => { setParticipantsOpen(false); setParticipants([]); }}>
                {participantsLoading ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chargement…</p>
                ) : participants.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Aucun participant inscrit.</p>
                ) : (
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "0 0 0.25rem 0" }}>{participants.length} participant{participants.length > 1 ? "s" : ""}</p>
                            {participantsEvent && participantsEvent.status !== "annule" && (
                                <button type="button" onClick={() => { setParticipantsOpen(false); handleCancelEvent(participantsEvent); }} style={{ padding: "0.4rem 0.8rem", borderRadius: "10px", border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.1)", color: "#DC2626", fontSize: "0.80rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                    Tout annuler et rembourser
                                </button>
                            )}
                        </div>
                        {participants.map((p) => {
                            const isPaid = p.paymentStatus === "paid";
                            const isPending = p.paymentStatus === "pending";
                            const isCancelled = p.status === "annule";
                            const refunded = p.refundStatus === "refunded";
                            const refundFailed = p.refundStatus === "failed";
                            
                            return (
                                <div key={p.userId ?? p.id} style={{ display: "flex", flexDirection: "column", padding: "0.75rem", background: isCancelled ? "rgba(255,100,100,0.05)" : "var(--surface-hover)", borderRadius: "12px", gap: "0.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", gap: "0.5rem", flexWrap: "wrap" }}>
                                        <span style={{ fontWeight: 600, textDecoration: isCancelled ? "line-through" : "none" }}>{p.firstname} {p.lastname}</span>
                                        <span style={{ color: "var(--text-muted)" }}>{p.email}</span>
                                        <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", background: isPaid ? "#E5FFBC" : isPending ? "#FFF3E0" : "#E6EDEE", color: isPaid ? "#166534" : isPending ? "#A56A2A" : "#555" }}>{isPaid ? "Payé" : isPending ? "En attente" : "Gratuit"}</span>
                                        
                                        {isCancelled && <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", background: "rgba(220, 38, 38, 0.15)", color: "#B91C1C", fontWeight: 600 }}>Annulé</span>}
                                        {refunded && <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", background: "rgba(34, 197, 94, 0.15)", color: "#166534", fontWeight: 600 }}>Remboursé {p.refundAmount ? `(${p.refundAmount}€)` : ""}</span>}
                                        {refundFailed && <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", background: "rgba(245, 158, 11, 0.15)", color: "#D97706", fontWeight: 600 }} title={p.refundError}>Échec remb.</span>}
                                        {p.isAbsent && <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "99px", background: "rgba(107, 114, 128, 0.15)", color: "#4B5563", fontWeight: 600 }}>Absent</span>}
                                        
                                        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{new Date(p.registeredAt).toLocaleDateString("fr-FR")}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                        {!isCancelled && !p.isAbsent && (
                                            <button type="button" onClick={() => handleMarkAbsent(p.id)} style={{ padding: "0.25rem 0.6rem", borderRadius: "8px", border: "1px solid rgba(107, 114, 128, 0.3)", background: "transparent", color: "var(--text-main)", fontSize: "0.75rem", cursor: "pointer" }}>
                                                Marquer absent
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </AdminModal>

            <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(min(400px, 100%), 1fr))" }}>
                {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", gridColumn: "1/-1" }}>Chargement…</p>}
                {!loading && filteredEvents.length === 0 && (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "4rem 2rem", background: "var(--surface-hover)", borderRadius: "28px" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>Aucun événement pour le moment.</p>
                        <button type="button" onClick={() => router.push("/salarie-formations/creer")}
                            style={{ padding: "0.7rem 1.5rem", borderRadius: "20px", border: "none", background: "var(--black)", color: "#fff", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer" }}>
                            Créer mon premier événement
                        </button>
                    </div>
                )}
                {!loading && filteredEvents.map(item => {
                    const start = new Date(item.dateDebut);
                    const tc = TYPE_COLORS[item.type] || { bg: "#E6EDEE", color: "#444" };
                    const isFull = item.capaciteMax != null && item.capaciteMax > 0 && (item.participantCount ?? 0) >= item.capaciteMax;
                    const vBadge = item.validationStatus === "approved"
                        ? { bg: "rgba(50,200,100,0.15)", color: "#E5FFBC", border: "rgba(50,200,100,0.3)" }
                        : item.validationStatus === "rejected"
                        ? { bg: "rgba(220,60,60,0.18)", color: "#ff8080", border: "rgba(220,60,60,0.3)" }
                        : { bg: "rgba(255,255,255,0.12)", color: "#EAF5F4", border: "rgba(255,255,255,0.22)" };
                    return (
                        <article key={item.id} style={{ position: "relative", borderRadius: "28px", overflow: "hidden", height: "400px", background: item.imageUrl ? "#111" : tc.bg, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>
                            {item.imageUrl ? (
                                <>
                                    {previewLooksLikeVideo(item.imageUrl) ? (
                                        <video
                                            src={item.imageUrl}
                                            muted
                                            playsInline
                                            preload="metadata"
                                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                                            aria-label={item.name}
                                        />
                                    ) : (
                                        <img src={item.imageUrl} alt={item.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                                    )}
                                    <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", maskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", WebkitMaskImage: "linear-gradient(to top, black 0%, black 38%, transparent 62%)", pointerEvents: "none" }} />
                                </>
                            ) : (
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontSize: "5rem", opacity: 0.35 }}>{TYPE_EMOJI[item.type] || "🎉"}</span>
                                </div>
                            )}
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,10,5,0.92) 0%, rgba(5,10,5,0.6) 38%, rgba(5,10,5,0.1) 62%, transparent 78%)", pointerEvents: "none" }} />

                            {/* Badge validation haut droite */}
                            <div style={{ position: "absolute", top: "14px", right: "14px", display: "flex", gap: "0.4rem", zIndex: 2, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                {isFull && (
                                    <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(220,38,38,0.75)", color: "#fff", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.22)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                        Complet
                                    </div>
                                )}
                                {item.validationStatus && (
                                    <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: vBadge.bg, color: vBadge.color, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: `1px solid ${vBadge.border}`, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                        {item.status === "annule" ? "Annulé" : (VALIDATION_LABELS[item.validationStatus] || item.validationStatus)}
                                    </div>
                                )}
                            </div>

                            {/* Overlay bas */}
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.65rem", zIndex: 2 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.75rem" }}>
                                    <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3, flex: 1 }}>{item.name}</h3>
                                    <div style={{ padding: "5px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.15)", color: "white", fontSize: "0.88rem", fontWeight: 700, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)", whiteSpace: "nowrap", flexShrink: 0 }}>
                                        {item.pricingType === "payant" && item.price > 0 ? `${Number(item.price).toLocaleString("fr-FR")} €` : "Gratuit"}
                                    </div>
                                </div>
                                <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.5 }}>
                                    {!isNaN(start.getTime()) && start.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    {item.lieu && ` · ${item.lieu}`}
                                </p>
                                {item.validationStatus === "rejected" && item.status !== "annule" && item.rejectionComment && (
                                    <p style={{ fontSize: "0.76rem", color: "#ff8080", margin: 0, lineHeight: 1.5 }}>{item.rejectionComment}</p>
                                )}
                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                    <span style={{ padding: "4px 12px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", fontWeight: 500, border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
                                        {TYPE_LABELS[item.type] || item.type}
                                    </span>
                                    {item.capaciteMax != null && (
                                        <span style={{ padding: "4px 12px", borderRadius: "999px", background: isFull ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.12)", fontSize: "0.75rem", color: isFull ? "#fca5a5" : "rgba(255,255,255,0.85)", fontWeight: 500, border: isFull ? "1px solid rgba(220,38,38,0.4)" : "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
                                            {item.participantCount ?? 0}/{item.capaciteMax} places
                                        </span>
                                    )}
                                </div>
                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                        <button type="button" onClick={() => handleEdit(item)} title="Modifier" style={{ padding: "9px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </button>
                                        <button type="button" onClick={() => handleDelete(item)} title="Supprimer" style={{ padding: "9px", borderRadius: "50%", border: "1px solid rgba(220,60,60,0.35)", background: "rgba(220,60,60,0.15)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#ff8080", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <IconTrash />
                                        </button>
                                        {item.status !== "annule" && item.status !== "brouillon" && (
                                            <button type="button" onClick={() => handleCancelEvent(item)} title="Annuler événement" style={{ padding: "9px", borderRadius: "50%", border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.15)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#FCD34D", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                            </button>
                                        )}
                                        {item.status === "brouillon" && item.validationStatus !== "approved" ? (
                                            <button type="button" onClick={() => handlePublish(item)} style={{ flex: 1, padding: "0.72rem 1rem", borderRadius: "999px", border: "none", background: "linear-gradient(135deg, #2563EB, #1d4ed8)", color: "white", fontFamily: "inherit", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                                Envoyer
                                            </button>
                                        ) : (
                                            <button type="button" onClick={() => handleViewParticipants(item)} style={{ flex: 1, padding: "0.72rem 0.6rem", borderRadius: "999px", border: "none", background: "rgba(255,255,255,0.15)", color: "white", fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                                                <IconUsers /> Participants
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const params = new URLSearchParams(searchParams);
                                                params.set("id", item.id);
                                                router.push(`${window.location.pathname}?${params.toString()}`);
                                            }}
                                            style={{ flex: 1, padding: "0.72rem 1rem", borderRadius: "999px", border: "none", background: "white", color: "#111", fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                        >
                                            Ouvrir
                                        </button>
                                    </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </>
    );
}
