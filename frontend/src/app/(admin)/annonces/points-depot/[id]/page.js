"use client";

import { useEffect, useState, Suspense, use } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Plus, Trash2, Edit3, X, 
  Package, Info, CheckCircle2, AlertCircle 
} from "lucide-react";
import { TOKEN_KEY, apiUrl } from "../../../../lib/api";

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
    }
};

function ContainerManagementContent({ id }) {
    const router = useRouter();
    const [point, setPoint] = useState(null);
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingContainer, setEditingContainer] = useState(null);
    const [formData, setFormData] = useState({ name: "", capacity: 10, status: "actif" });

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
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                fetchData();
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const deleteContainer = async (cid) => {
        if(!confirm("Supprimer ce container ?")) return;
        const token = window.localStorage.getItem(TOKEN_KEY);
        try {
            await fetch(apiUrl(`/admin/containers/${cid}`), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch(err) { console.error(err); }
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
                  onClick={() => { setEditingContainer(null); setFormData({ name: "", capacity: 10, status: "actif" }); setShowModal(true); }}
                >
                    <Plus size={18} /> Ajouter un container
                </button>
            </header>

            <div style={styles.grid}>
                {containers.map((c) => {
                    const usage = Math.round((c.current_count / c.capacity) * 100);
                    return (
                        <div key={c.id} style={styles.card}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <Package size={20} color="var(--forest-deep)" />
                                    <h3 style={{ margin: 0, fontWeight: "700" }}>{c.name}</h3>
                                </div>
                                <div style={{ display: "flex", gap: "0.4rem" }}>
                                    <button onClick={() => { setEditingContainer(c); setFormData({ ...c }); setShowModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Edit3 size={16} /></button>
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

                            <div style={{ marginTop: "0.5rem", padding: "0.6rem", borderRadius: "12px", background: c.status === 'actif' ? '#f0fdf4' : '#fef2f2', display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}>
                                {c.status === 'actif' ? <CheckCircle2 size={14} color="#166534" /> : <AlertCircle size={14} color="#991b1b" />}
                                <span style={{ fontWeight: "700", color: c.status === 'actif' ? '#166534' : '#991b1b' }}>Container {c.status}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
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
                                <input type="number" style={styles.input} value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} required />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.85rem", fontWeight: "700" }}>Statut</label>
                                <select style={styles.input} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                    <option value="actif">Actif</option>
                                    <option value="inactif">Inactif</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>
                            <button type="submit" style={styles.saveBtn}>Enregistrer</button>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
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
