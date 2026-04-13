"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, MapPin, Package, Settings2, Plus, 
  Trash2, Edit3, X, ChevronRight, Info, AlertTriangle, CheckCircle2 
} from "lucide-react";
import { TOKEN_KEY, apiUrl } from "../../../lib/api";
import DepositMap from "../../../components/admin/DepositMap";

const styles = {
    container: {
        width: "100%",
        padding: "1rem 2rem 3rem 0",
        animation: "fadeIn 0.5s ease-out",
    },
    header: {
        marginBottom: "2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    kpiGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1.2rem",
        marginBottom: "2rem",
    },
    kpiCard: {
        background: "white",
        borderRadius: "24px",
        padding: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.03)",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
        gap: "1.5rem",
        marginTop: "2rem",
    },
    card: {
        background: "white",
        borderRadius: "28px",
        padding: "1.5rem",
        border: "1px solid rgba(0,0,0,0.06)",
        position: "relative",
        transition: "transform 0.2s, box-shadow 0.2s",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    },
    statusBadge: (status) => {
        const colors = {
            actif: { bg: "#e8f5e9", text: "#2e7d32" },
            sature: { bg: "#ffebee", text: "#c62828" },
            maintenance: { bg: "#fff3e0", text: "#ef6c00" },
            inactif: { bg: "#f5f5f5", text: "#616161" },
        };
        const c = colors[status] || colors.actif;
        return {
            padding: "4px 12px",
            borderRadius: "999px",
            fontSize: "0.72rem",
            fontWeight: "700",
            background: c.bg,
            color: c.text,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
        };
    },
    progressBar: (percent) => ({
        width: "100%",
        height: "8px",
        background: "#f0f2f0",
        borderRadius: "4px",
        overflow: "hidden",
        position: "relative",
    }),
    progressFill: (percent) => ({
        width: `${Math.min(percent, 100)}%`,
        height: "100%",
        background: percent > 90 ? "#ef4444" : percent > 70 ? "#f59e0b" : "#10b981",
        borderRadius: "4px",
        transition: "width 1s ease-out",
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
        maxWidth: "600px",
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "2.5rem",
        position: "relative",
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
        transition: "border-color 0.2s",
    },
    primaryBtn: {
        background: "var(--black)",
        color: "white",
        border: "none",
        padding: "0.9rem 1.8rem",
        borderRadius: "999px",
        fontWeight: "700",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        fontSize: "0.95rem",
        transition: "transform 0.1s, background 0.2s",
    }
};

function PointsDepotContent() {
    const router = useRouter();
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);
    const [formData, setFormData] = useState({
        name: "", address: "", zip_code: "", city: "", country: "France",
        latitude: 48.8566, longitude: 2.3522, status: "actif", type: "conteneur",
        internal_comment: ""
    });

    const fetchPoints = async () => {
        const token = window.localStorage.getItem(TOKEN_KEY);
        try {
            const res = await fetch(apiUrl("/admin/deposit-points"), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPoints(data.points || []);
            }
        } catch (err) {
            console.error("Failed to fetch points", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPoints(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = window.localStorage.getItem(TOKEN_KEY);
        const method = editingPoint ? "PATCH" : "POST";
        const url = editingPoint 
            ? apiUrl(`/admin/deposit-points/${editingPoint.id}`) 
            : apiUrl("/admin/deposit-points");

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
                setEditingPoint(null);
                fetchPoints();
            }
        } catch (err) {
            alert("Erreur: " + err.message);
        }
    };

    const deletePoint = async (id) => {
        if (!confirm("Supprimer ce point de dépôt ?")) return;
        const token = window.localStorage.getItem(TOKEN_KEY);
        try {
            const res = await fetch(apiUrl(`/admin/deposit-points/${id}`), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) fetchPoints();
        } catch (err) {
            console.error(err);
        }
    };

    const openEdit = (point) => {
        setEditingPoint(point);
        setFormData({ ...point });
        setShowModal(true);
    };

    const openAdd = () => {
        setEditingPoint(null);
        setFormData({
            name: "", address: "", zip_code: "", city: "", country: "France",
            latitude: 48.8566, longitude: 2.3522, status: "actif", type: "conteneur",
            internal_comment: ""
        });
        setShowModal(true);
    };

    if (loading) return <div style={{ padding: "3rem", color: "var(--text-muted)" }}>Chargement des données...</div>;

    const totalCapacity = points.reduce((acc, p) => acc + (p.total_capacity || 0), 0);
    const totalUsage = points.reduce((acc, p) => acc + (p.current_count || 0), 0);
    const globalUsagePercent = totalCapacity > 0 ? Math.round((totalUsage / totalCapacity) * 100) : 0;
    const saturatedCount = points.filter(p => p.status === 'sature').length;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <p className="activities-label">Logistique & Collecte</p>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.45rem 0" }}>Points de dépôt</h1>
                    <p style={{ color: "var(--text-muted)" }}>Gérez les lieux physiques de collecte et surveillez leur saturation.</p>
                </div>
                <button style={styles.primaryBtn} onClick={openAdd}>
                    <Plus size={20} /> Nouveau point
                </button>
            </header>

            <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}>
                    <div style={{ background: "#e0f2fe", padding: "0.8rem", borderRadius: "16px" }}><Building2 size={24} color="#0369a1" /></div>
                    <div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>{points.length}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "601" }}>Points totaux</div>
                    </div>
                </div>
                <div style={styles.kpiCard}>
                    <div style={{ background: "#dcfce7", padding: "0.8rem", borderRadius: "16px" }}><Package size={24} color="#166534" /></div>
                    <div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>{totalCapacity}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "601" }}>Capacité totale</div>
                    </div>
                </div>
                <div style={styles.kpiCard}>
                    <div style={{ background: "#fff3e0", padding: "0.8rem", borderRadius: "16px" }}><AlertTriangle size={24} color="#ef6c00" /></div>
                    <div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>{saturatedCount}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "601" }}>Points saturés</div>
                    </div>
                </div>
                <div style={styles.kpiCard}>
                    <div style={{ background: "#f3e8ff", padding: "0.8rem", borderRadius: "16px" }}><Settings2 size={24} color="#7e22ce" /></div>
                    <div>
                        <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>{globalUsagePercent}%</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "601" }}>Utilisation globale</div>
                    </div>
                </div>
            </div>

            <DepositMap points={points} onPointClick={openEdit} />

            <div style={styles.grid}>
                {points.map((point) => {
                    const usagePercent = point.total_capacity > 0 
                        ? Math.round((point.current_count / point.total_capacity) * 100) 
                        : 0;
                    return (
                        <div key={point.id} className="deposit-card" style={styles.card}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={styles.statusBadge(point.status)}>{point.status}</div>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button onClick={() => openEdit(point)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}><Edit3 size={16} /></button>
                                    <button onClick={() => deletePoint(point.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
                                </div>
                            </div>
                            
                            <div>
                                <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.2rem", fontWeight: "700" }}>{point.name}</h3>
                                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                    <MapPin size={14} /> {point.address}, {point.city}
                                </p>
                            </div>

                            <div style={{ marginTop: "0.5rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.4rem", color: "var(--text-main)" }}>
                                    <span>Occupation</span>
                                    <span>{usagePercent}%</span>
                                </div>
                                <div style={styles.progressBar()}>
                                    <div style={styles.progressFill(usagePercent)} />
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.5rem" }}>
                                <div style={{ flex: 1, background: "#f8fafb", padding: "0.75rem", borderRadius: "16px", textAlign: "center" }}>
                                    <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "700" }}>Type</div>
                                    <div style={{ fontSize: "0.9rem", fontWeight: "700", marginTop: "0.2rem" }}>{point.type}</div>
                                </div>
                                <div style={{ flex: 1, background: "#f8fafb", padding: "0.75rem", borderRadius: "16px", textAlign: "center" }}>
                                    <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "700" }}>Capacité</div>
                                    <div style={{ fontSize: "0.9rem", fontWeight: "700", marginTop: "0.2rem" }}>{point.total_capacity}</div>
                                </div>
                            </div>

                            <button 
                                onClick={() => router.push(`/annonces/points-depot/${point.id}`)}
                                style={{ 
                                    width: "100%", padding: "0.75rem", borderRadius: "14px", 
                                    background: "#f0f4f4", border: "none", color: "var(--forest-deep)", 
                                    fontWeight: "700", fontSize: "0.85rem", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
                                }}
                            >
                                Gérer les containers <ChevronRight size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <button style={{ position: "absolute", top: "1.5rem", right: "1.5rem", border: "none", background: "none", cursor: "pointer" }} onClick={() => setShowModal(false)}><X size={24} /></button>
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem" }}>{editingPoint ? "Modifier le point" : "Ajouter un point"}</h2>
                        
                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                            <div>
                                <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Nom du point</label>
                                <input style={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="ex: UC - Paris 11" />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Adresse</label>
                                    <input style={styles.input} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Code Postal</label>
                                    <input style={styles.input} value={formData.zip_code} onChange={e => setFormData({...formData, zip_code: e.target.value})} required />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Ville</label>
                                    <input style={styles.input} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Statut</label>
                                    <select style={styles.input} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                        <option value="actif">Actif</option>
                                        <option value="inactif">Inactif</option>
                                        <option value="sature">Saturé</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Latitude</label>
                                    <input type="number" step="any" style={styles.input} value={formData.latitude} onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})} />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Longitude</label>
                                    <input type="number" step="any" style={styles.input} value={formData.longitude} onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})} />
                                </div>
                            </div>

                            <button type="submit" style={{ ...styles.primaryBtn, width: "100%", justifyContent: "center", marginTop: "1rem" }}>
                                {editingPoint ? "Mettre à jour" : "Enregistrer le point"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .deposit-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 30px rgba(0,0,0,0.08);
                }
            `}</style>
        </div>
    );
}

export default function PointsDepotPage() {
    return (
        <Suspense fallback={<div>Chargement...</div>}>
            <PointsDepotContent />
        </Suspense>
    );
}
