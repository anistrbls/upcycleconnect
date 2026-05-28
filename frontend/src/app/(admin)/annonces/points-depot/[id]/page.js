"use client";

import { useEffect, useState, Suspense, use } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Plus, Trash2, Edit3, X, 
  Package, CheckCircle2, AlertCircle, ChevronRight, ImageIcon
} from "lucide-react";
import { TOKEN_KEY, apiUrl } from "../../../../lib/api";
import { formatDateFR } from "../../../../lib/formatters";

function isContainerInMaintenanceWindow(c) {
    if (c.status !== "maintenance" || !c.maintenance_start || !c.maintenance_end) {
        return c.status === "maintenance";
    }
    const now = Date.now();
    const start = new Date(c.maintenance_start).getTime();
    const end = new Date(c.maintenance_end).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return c.status === "maintenance";
    return now >= start && now < end;
}

function containerStatusLabel(c) {
    if (c.status === "maintenance") {
        if (!isContainerInMaintenanceWindow(c)) {
            if (c.maintenance_end && Date.now() >= new Date(c.maintenance_end).getTime()) {
                return "Maintenance terminée (rechargez la page)";
            }
            if (c.maintenance_start && Date.now() < new Date(c.maintenance_start).getTime()) {
                return `Maintenance planifiée dès le ${formatDateFR(c.maintenance_start)}`;
            }
        }
        const endLabel = c.maintenance_end ? ` jusqu'au ${formatDateFR(c.maintenance_end)}` : "";
        return c.maintenance_reason
            ? `Container maintenance : ${c.maintenance_reason}${endLabel}`
            : `Container maintenance${endLabel}`;
    }
    return `Container ${c.status}`;
}

const styles = {
    container: {
        width: "100%",
        padding: "1rem 2rem 3rem 0",
        animation: "fadeIn 0.5s ease-out",
    },
    header: {
        marginBottom: "2rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
    },
    backBtn: {
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "999px",
        padding: "0.6rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.2s",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "1.5rem",
    },
    photoPanel: {
        background: "white",
        borderRadius: "24px",
        padding: "1.25rem",
        border: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
        marginBottom: "1.5rem",
    },
    photoHero: {
        width: "100%",
        height: "280px",
        objectFit: "cover",
        borderRadius: "18px",
        display: "block",
        background: "#f1f5f9",
    },
    photoStrip: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(104px, 104px))",
        gap: "0.6rem",
    },
    photoThumb: {
        width: "100%",
        aspectRatio: "1 / 1",
        objectFit: "cover",
        borderRadius: "14px",
        display: "block",
        background: "#f1f5f9",
    },
    card: {
        background: "white",
        borderRadius: "24px",
        padding: "1.5rem",
        border: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        position: "relative",
    },
    capacityInfo: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "0.9rem",
    },
    usagePill: (percent) => ({
        padding: "4px 10px",
        borderRadius: "20px",
        fontSize: "0.75rem",
        fontWeight: "700",
        background: percent >= 100 ? "#fee2e2" : percent > 80 ? "#fef3c7" : "#dcfce7",
        color: percent >= 100 ? "#991b1b" : percent > 80 ? "#92400e" : "#166534",
    }),
    modalOverlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "2rem",
    },
    modal: {
        background: "white",
        borderRadius: "32px",
        width: "100%",
        maxWidth: "500px",
        padding: "2.5rem",
        boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
    },
    input: {
        width: "100%",
        padding: "0.9rem 1.2rem",
        borderRadius: "14px",
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        fontSize: "0.95rem",
        outline: "none",
        marginTop: "0.5rem",
    },
    saveBtn: {
        background: "var(--black)",
        color: "white",
        border: "none",
        padding: "0.9rem 1.5rem",
        borderRadius: "999px",
        fontWeight: "700",
        cursor: "pointer",
        width: "100%",
        marginTop: "1rem",
    },
    itemsSection: {
        marginTop: "0.25rem",
        paddingTop: "0.85rem",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
    },
    itemsSectionTitle: {
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        margin: 0,
    },
    itemRow: {
        display: "flex",
        alignItems: "center",
        gap: "0.65rem",
        padding: "0.55rem 0.65rem",
        borderRadius: "14px",
        background: "#f8fafc",
        border: "1px solid rgba(0,0,0,0.05)",
        cursor: "pointer",
        transition: "background 0.15s",
        textAlign: "left",
        width: "100%",
    },
    itemThumb: {
        width: 48,
        height: 48,
        borderRadius: 10,
        objectFit: "cover",
        flexShrink: 0,
        background: "#e2e8f0",
    },
    itemThumbPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 10,
        flexShrink: 0,
        background: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
    },
};

const WORKFLOW_LABELS = {
    deposited: "Déposé",
    available: "Disponible",
    reserved: "Réservé",
};

function itemCover(item) {
    if (item?.image) return item.image;
    if (Array.isArray(item?.photos) && item.photos[0]) return item.photos[0];
    return "";
}

function ContainerManagementContent({ id }) {
    const router = useRouter();
    const [point, setPoint] = useState(null);
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingContainer, setEditingContainer] = useState(null);
    const [formData, setFormData] = useState({ name: "", capacity: "10", status: "actif", maintenance_reason: "", maintenance_start: "", maintenance_end: "" });

    const toLocalDateTimeInput = (value) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const pad = (n) => String(n).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const toISOFromLocalDateTime = (value) => {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return date.toISOString();
    };

    const fetchData = async () => {
        const token = window.localStorage.getItem(TOKEN_KEY);
        try {
            const [pRes, cRes] = await Promise.all([
                fetch(apiUrl(`/admin/deposit-points/${id}`), { headers: { Authorization: `Bearer ${token}` } }),
                fetch(apiUrl(`/admin/deposit-points/${id}/containers`), { headers: { Authorization: `Bearer ${token}` } })
            ]);
            if (pRes.ok) setPoint(await pRes.json());
            if (cRes.ok) {
                const data = await cRes.json();
                setContainers(data.containers || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const parsedCapacity = Number.parseInt(String(formData.capacity), 10);
        if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
            alert("La capacité doit être un nombre supérieur à 0.");
            return;
        }

        if (editingContainer?.current_count > 0 && formData.status !== "actif") {
            alert("Impossible de passer ce container en inactif ou maintenance tant qu'il contient des objets.");
            return;
        }

        if (formData.status === "maintenance") {
            if (!formData.maintenance_reason?.trim() || !formData.maintenance_start || !formData.maintenance_end) {
                alert("Pour la maintenance, la raison ainsi que les dates de début et de fin sont obligatoires.");
                return;
            }
            if (new Date(formData.maintenance_end).getTime() < new Date(formData.maintenance_start).getTime()) {
                alert("La date de fin de maintenance doit être après la date de début.");
                return;
            }
        }

        const payload = {
            ...formData,
            capacity: parsedCapacity,
            maintenance_reason: formData.status === "maintenance" ? String(formData.maintenance_reason || "").trim() : "",
            maintenance_start: formData.status === "maintenance" ? toISOFromLocalDateTime(formData.maintenance_start) : null,
            maintenance_end: formData.status === "maintenance" ? toISOFromLocalDateTime(formData.maintenance_end) : null,
        };

        const token = window.localStorage.getItem(TOKEN_KEY);
        const method = editingContainer ? "PATCH" : "POST";
        const url = editingContainer 
            ? apiUrl(`/admin/containers/${editingContainer.id}`) 
            : apiUrl(`/admin/deposit-points/${id}/containers`);

        try {
            const res = await fetch(url, {
                method,
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setShowModal(false);
                fetchData();
            } else {
                let errorMessage = "Impossible d'enregistrer le container.";
                try {
                    const data = await res.json();
                    if (data?.error) errorMessage = data.error;
                } catch (_) {}
                alert(errorMessage);
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const deleteContainer = async (cid) => {
        if (!confirm("Supprimer ce container ?")) return;
        const token = window.localStorage.getItem(TOKEN_KEY);
        try {
            await fetch(apiUrl(`/admin/containers/${cid}`), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div style={{ padding: "3rem" }}>Chargement...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <button style={styles.backBtn} onClick={() => router.push("/annonces/points-depot")}>
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: 0 }}>{point?.name}</h1>
                    <p style={{ color: "var(--text-muted)", margin: 0 }}>Gestion des unités de stockage (Containers)</p>
                </div>
                <button 
                  style={{ marginLeft: "auto", background: "var(--forest-deep)", color: "white", border: "none", padding: "0.8rem 1.5rem", borderRadius: "999px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
                                    onClick={() => { setEditingContainer(null); setFormData({ name: "", capacity: "10", status: "actif", maintenance_reason: "", maintenance_start: "", maintenance_end: "" }); setShowModal(true); }}
                >
                    <Plus size={18} /> Ajouter un container
                </button>
            </header>

            {Array.isArray(point?.photos) && point.photos.length > 0 && (
                <section style={styles.photoPanel}>
                    <div>
                        <div style={{ fontSize: "0.76rem", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                            Photos du point de dépôt
                        </div>
                        <div style={{ fontSize: "0.92rem", color: "var(--text-main)", fontWeight: "700" }}>
                            {point.name}
                        </div>
                    </div>
                    <div style={styles.photoStrip}>
                        {point.photos.map((photo, index) => (
                            <div
                                key={`${index}-${photo.slice(0, 20)}`}
                                style={{
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    borderRadius: "16px",
                                    overflow: "hidden",
                                    background: "#f8fafc",
                                }}
                            >
                                <img src={photo} alt={`${point.name} ${index + 1}`} style={styles.photoThumb} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div style={styles.grid}>
                {containers.map((c) => {
                    const usage = c.capacity > 0 ? Math.round((c.current_count / c.capacity) * 100) : 0;
                    return (
                        <div key={c.id} style={styles.card}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <Package size={20} color="var(--forest-deep)" />
                                    <h3 style={{ margin: 0, fontWeight: "700" }}>{c.name}</h3>
                                </div>
                                <div style={{ display: "flex", gap: "0.4rem" }}>
                                    <button onClick={() => { setEditingContainer(c); setFormData({ ...c, capacity: String(c.capacity ?? ""), maintenance_reason: c.maintenance_reason || "", maintenance_start: toLocalDateTimeInput(c.maintenance_start), maintenance_end: toLocalDateTimeInput(c.maintenance_end) }); setShowModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Edit3 size={16} /></button>
                                    <button onClick={() => deleteContainer(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div style={styles.capacityInfo}>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Capacité utilisée</span>
                                <div style={styles.usagePill(usage)}>{usage}%</div>
                            </div>

                            <div style={{ width: "100%", height: "10px", background: "#f1f5f9", borderRadius: "5px", overflow: "hidden" }}>
                                <div style={{ width: `${Math.min(usage, 100)}%`, height: "100%", background: usage > 90 ? "#ef4444" : "var(--forest-deep)", transition: "width 0.5s" }} />
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: "600" }}>
                                <span>{c.current_count} objets</span>
                                <span style={{ color: "var(--text-muted)" }}>Total: {c.capacity}</span>
                            </div>

                            <div style={{ marginTop: "0.5rem", padding: "0.6rem", borderRadius: "12px", background: isContainerInMaintenanceWindow(c) ? '#fef2f2' : c.status === 'actif' ? '#f0fdf4' : '#fef2f2', display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}>
                                {isContainerInMaintenanceWindow(c) ? <AlertCircle size={14} color="#991b1b" /> : c.status === 'actif' ? <CheckCircle2 size={14} color="#166534" /> : <AlertCircle size={14} color="#991b1b" />}
                                <span style={{ fontWeight: "700", color: isContainerInMaintenanceWindow(c) ? '#991b1b' : c.status === 'actif' ? '#166534' : '#991b1b' }}>
                                    {containerStatusLabel(c)}
                                </span>
                            </div>

                            <div style={styles.itemsSection}>
                                <p style={styles.itemsSectionTitle}>
                                    Objets dans ce container ({(c.items || []).length})
                                </p>
                                {(c.items || []).length === 0 ? (
                                    <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
                                        {c.current_count > 0
                                            ? "Aucun détail disponible — actualisez la page."
                                            : "Aucun objet pour le moment."}
                                    </p>
                                ) : (
                                    (c.items || []).map((item) => {
                                        const cover = itemCover(item);
                                        const wf = WORKFLOW_LABELS[item.workflowStatus] || item.workflowStatus || "—";
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                style={styles.itemRow}
                                                className="container-item-row"
                                                onClick={() => router.push(`/annonces/logistique/${item.id}`)}
                                                title="Voir la fiche logistique"
                                            >
                                                {cover ? (
                                                    <img src={cover} alt="" style={styles.itemThumb} />
                                                ) : (
                                                    <div style={styles.itemThumbPlaceholder}>
                                                        <ImageIcon size={18} />
                                                    </div>
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {item.title || "Sans titre"}
                                                    </div>
                                                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                                                        {item.reference ? `Réf. ${item.reference}` : item.category || "—"}
                                                        {item.userName ? ` · ${item.userName}` : ""}
                                                    </div>
                                                    <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--forest-deep)", marginTop: "0.2rem" }}>
                                                        {wf}
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        {editingContainer?.current_count > 0 && (
                            <div style={{ marginBottom: "1rem", borderRadius: "12px", padding: "0.7rem 0.9rem", background: "#fef3c7", color: "#92400e", fontSize: "0.82rem", fontWeight: "600" }}>
                                Ce container contient des objets. Le statut doit rester actif tant qu'il n'est pas vide.
                            </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>{editingContainer ? "Modifier" : "Nouveau"} container</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                            <div>
                                <label style={{ fontSize: "0.85rem", fontWeight: "700" }}>Nom / Identifiant</label>
                                <input style={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="ex: Box A1" />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.85rem", fontWeight: "700" }}>Capacité (nombre d'objets)</label>
                                <input type="number" style={styles.input} value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} min="1" required />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.85rem", fontWeight: "700" }}>Statut</label>
                                <select style={styles.input} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                    <option value="actif">Actif</option>
                                    <option value="inactif" disabled={Boolean(editingContainer?.current_count > 0)}>Inactif</option>
                                    <option value="maintenance" disabled={Boolean(editingContainer?.current_count > 0)}>Maintenance</option>
                                </select>
                            </div>
                            {formData.status === "maintenance" && (
                                <>
                                    <div>
                                        <label style={{ fontSize: "0.85rem", fontWeight: "700" }}>Raison de maintenance</label>
                                        <input style={styles.input} value={formData.maintenance_reason || ""} onChange={e => setFormData({ ...formData, maintenance_reason: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: "0.85rem", fontWeight: "700" }}>Début de maintenance</label>
                                        <input type="datetime-local" style={styles.input} value={formData.maintenance_start || ""} onChange={e => setFormData({ ...formData, maintenance_start: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: "0.85rem", fontWeight: "700" }}>Fin de maintenance</label>
                                        <input type="datetime-local" style={styles.input} value={formData.maintenance_end || ""} onChange={e => setFormData({ ...formData, maintenance_end: e.target.value })} required />
                                    </div>
                                </>
                            )}
                            <button type="submit" style={styles.saveBtn}>Enregistrer</button>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .container-item-row:hover { background: #eef2f6 !important; }
            `}</style>
        </div>
    );
}

export default function ContainerManagementPage({ params }) {
    const { id } = use(params);
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <ContainerManagementContent id={id} />
        </Suspense>
    );
}
