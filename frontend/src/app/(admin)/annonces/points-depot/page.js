"use client";

import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { 
  Building2, MapPin, Package, Settings2, Plus, 
  Trash2, Edit3, X, ChevronRight, Info, AlertTriangle, CheckCircle2 
} from "lucide-react";
import { TOKEN_KEY, apiUrl } from "../../../lib/api";
const DepositMap = dynamic(() => import("../../../components/admin/DepositMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "400px",
        background: "#f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "24px",
      }}
    >
      Chargement de la carte…
    </div>
  ),
});

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
    kpiStrip: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "0.75rem",
        marginBottom: "1.5rem",
    },
    kpiCard: {
        background: "#F7F8F7",
        borderRadius: "16px",
        padding: "0.85rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.65rem",
    },
    kpiLabel: {
        margin: 0,
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        lineHeight: "1.2",
    },
    kpiValue: {
        margin: "0.1rem 0 0",
        fontSize: "1.05rem",
        fontWeight: "700",
        color: "var(--text-main)",
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
        scrollbarWidth: "none",
        msOverflowStyle: "none",
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
        padding: "0.8rem 1.5rem",
        borderRadius: "999px",
        fontWeight: "700",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        fontSize: "0.95rem",
        transition: "transform 0.1s, background 0.2s",
    },
    photoUploadBox: {
        width: "100%",
        padding: "1rem 1.2rem",
        borderRadius: "16px",
        border: "1px dashed rgba(35,59,61,0.22)",
        background: "#f8fafc",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
    },
    photoGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))",
        gap: "0.75rem",
        marginTop: "0.85rem",
    },
    photoThumb: {
        width: "100%",
        aspectRatio: "1 / 1",
        borderRadius: "14px",
        objectFit: "cover",
        display: "block",
        background: "#eef2f7",
    },
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
});

function PointsDepotContent() {
    const router = useRouter();
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPoint, setEditingPoint] = useState(null);
    const [formData, setFormData] = useState({
        name: "", address: "", zip_code: "", city: "", country: "France",
        latitude: 48.8566, longitude: 2.3522, status: "actif", type: "",
        internal_comment: "", photos: []
    });
    const [types, setTypes] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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

    const fetchTypes = async () => {
        try {
            const res = await fetch(apiUrl("/deposit-point-types"));
            if (res.ok) {
                const data = await res.json();
                setTypes(data.items || []);
            }
        } catch (err) {
            console.error("Failed to fetch types", err);
        }
    };

    useEffect(() => { fetchPoints(); fetchTypes(); }, []);

    const searchAddress = async (query) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            return;
        }
        setLoadingSuggestions(true);
        try {
            const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.features || []);
            }
        } catch (err) {
            console.error("Geocoding error", err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleAddressChange = (e) => {
        const value = e.target.value;
        setFormData({ ...formData, address: value });
        searchAddress(value);
    };

    const selectSuggestion = (feature) => {
        const { properties, geometry } = feature;
        setFormData({
            ...formData,
            address: properties.name || properties.label,
            city: properties.city || "",
            zip_code: properties.postcode || "",
            latitude: geometry.coordinates[1],
            longitude: geometry.coordinates[0]
        });
        setSuggestions([]);
    };

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

    const handlePhotoChange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const nextPhotos = await Promise.all(files.map(fileToBase64));
        setFormData((current) => ({
            ...current,
            photos: [...(Array.isArray(current.photos) ? current.photos : []), ...nextPhotos].slice(0, 8),
        }));
        e.target.value = "";
    };

    const removePhoto = (index) => {
        setFormData((current) => ({
            ...current,
            photos: (current.photos || []).filter((_, idx) => idx !== index),
        }));
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
        setFormData({ ...point, photos: Array.isArray(point.photos) ? point.photos : [] });
        setShowModal(true);
    };

    const openAdd = () => {
        setEditingPoint(null);
        setFormData({
            name: "", address: "", zip_code: "", city: "", country: "France",
            latitude: 48.8566, longitude: 2.3522, status: "actif", type: "conteneur",
            internal_comment: "", photos: []
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
                    <h1 style={{ fontSize: "2.5rem", fontWeight: "500", margin: "0.45rem 0", letterSpacing: "-0.02em" }}>Points de dépôt</h1>
                    <p style={{ color: "var(--text-muted)" }}>Gérez les lieux physiques de collecte et surveillez leur saturation.</p>
                </div>
                <button 
                    className="action-btn primary" 
                    type="button" 
                    style={{ marginBottom: "0.4rem" }} 
                    onClick={openAdd}
                >
                    <Plus size={20} /> Nouveau point
                </button>
            </header>

            <div style={styles.kpiStrip}>
                <div style={styles.kpiCard}>
                    <Building2 size={18} color="var(--forest-deep)" />
                    <div>
                        <p style={styles.kpiLabel}>Points totaux</p>
                        <p style={styles.kpiValue}>{points.length}</p>
                    </div>
                </div>
                <div style={styles.kpiCard}>
                    <Package size={18} color="var(--forest-deep)" />
                    <div>
                        <p style={styles.kpiLabel}>Capacité totale</p>
                        <p style={styles.kpiValue}>{totalCapacity}</p>
                    </div>
                </div>
                <div style={styles.kpiCard}>
                    <AlertTriangle size={18} color="var(--forest-deep)" />
                    <div>
                        <p style={styles.kpiLabel}>Points saturés</p>
                        <p style={styles.kpiValue}>{saturatedCount}</p>
                    </div>
                </div>
                <div style={styles.kpiCard}>
                    <Settings2 size={18} color="var(--forest-deep)" />
                    <div>
                        <p style={styles.kpiLabel}>Utilisation globale</p>
                        <p style={styles.kpiValue}>{globalUsagePercent}%</p>
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
                            {Array.isArray(point.photos) && point.photos[0] && (
                                <img
                                    src={point.photos[0]}
                                    alt={point.name}
                                    style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "20px", marginBottom: "0.2rem" }}
                                    data-i18n-user-content="true"
                                />
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={styles.statusBadge(point.status)}>{point.status}</div>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button onClick={() => openEdit(point)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}><Edit3 size={16} /></button>
                                    <button onClick={() => deletePoint(point.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
                                </div>
                            </div>
                            
                            <div>
                                <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.2rem", fontWeight: "700" }} data-i18n-user-content="true">{point.name}</h3>
                                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                    <MapPin size={14} /> <span data-i18n-user-content="true">{point.address}, {point.city}</span>
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
                                    <div style={{ fontSize: "0.9rem", fontWeight: "700", marginTop: "0.2rem" }} data-i18n-user-content="true">{point.type}</div>
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
                    <div className="modal-content" style={styles.modal} onClick={e => e.stopPropagation()}>
                        <button style={{ position: "absolute", top: "1.5rem", right: "1.5rem", border: "none", background: "none", cursor: "pointer" }} onClick={() => setShowModal(false)}><X size={24} /></button>
                        <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem" }}>{editingPoint ? "Modifier le point" : "Ajouter un point"}</h2>
                        
                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                            <div>
                                <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Nom du point</label>
                                <input style={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="ex: UC - Paris 11" />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div style={{ position: "relative" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Adresse</label>
                                    <input 
                                        style={styles.input} 
                                        value={formData.address} 
                                        onChange={handleAddressChange} 
                                        required 
                                        autoComplete="off"
                                    />
                                    {suggestions.length > 0 && (
                                        <div style={{
                                            position: "absolute",
                                            top: "100%",
                                            left: 0,
                                            right: 0,
                                            background: "white",
                                            borderRadius: "12px",
                                            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                                            zIndex: 10,
                                            marginTop: "4px",
                                            overflow: "hidden"
                                        }}>
                                            {suggestions.map((s, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={() => selectSuggestion(s)}
                                                    style={{
                                                        padding: "0.8rem 1rem",
                                                        fontSize: "0.85rem",
                                                        cursor: "pointer",
                                                        borderBottom: idx === suggestions.length - 1 ? "none" : "1px solid #f0f0f0",
                                                        transition: "background 0.2s"
                                                    }}
                                                    onMouseEnter={e => e.target.style.background = "#f7f9fa"}
                                                    onMouseLeave={e => e.target.style.background = "white"}
                                                >
                                                    <div style={{ fontWeight: "700" }} data-i18n-user-content="true">{s.properties.name}</div>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }} data-i18n-user-content="true">{s.properties.postcode} {s.properties.city}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                    <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Type</label>
                                    <select style={styles.input} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} required>
                                        <option value="">Sélectionner un type...</option>
                                        {types.map(t => (
                                            <option key={t.id} value={t.label} data-i18n-user-content="true">{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    <div>
                                        <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Lat</label>
                                        <input type="number" step="any" style={styles.input} value={formData.latitude} onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value)})} required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Long</label>
                                        <input type="number" step="any" style={styles.input} value={formData.longitude} onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value)})} required />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}>Photos du point</label>
                                <label style={styles.photoUploadBox}>
                                    <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoChange} />
                                    <Building2 size={18} color="var(--forest-deep)" />
                                    <div style={{ fontWeight: "700", color: "var(--text-main)", fontSize: "0.9rem" }}>Ajouter des photos</div>
                                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Jusqu'à 8 images pour le point de dépôt</div>
                                </label>
                                {Array.isArray(formData.photos) && formData.photos.length > 0 && (
                                    <div style={styles.photoGrid}>
                                        {formData.photos.map((photo, index) => (
                                            <div key={`${index}-${photo.slice(0, 20)}`} style={{ position: "relative" }}>
                                                <img src={photo} alt={`Point ${index + 1}`} style={styles.photoThumb} />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(index)}
                                                    style={{
                                                        position: "absolute",
                                                        top: "6px",
                                                        right: "6px",
                                                        width: "24px",
                                                        height: "24px",
                                                        borderRadius: "999px",
                                                        border: "none",
                                                        background: "rgba(0,0,0,0.55)",
                                                        color: "white",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                .modal-content::-webkit-scrollbar {
                    display: none;
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
