"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    Clock, Package, CheckCircle2, ChevronRight, 
    Search, Filter, MapPin, Truck, History, 
    AlertCircle, XCircle, ArrowRight, QrCode,
    Loader2, User, Boxes, Calendar, FileText,
    X
} from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import AdminModal from "../../../components/admin/AdminModal";

// --- Status Config ---

const STATUS_MAP = {
    'validated':        { label: 'Sortie Moderation', color: '#6366f1', icon: CheckCircle2, desc: 'En attente de point de dépôt' },
    'assigned':         { label: 'Point Assigné', color: '#8b5cf6', icon: MapPin, desc: 'Attribuer le code de dépôt' },
    'deposit_code_sent': { label: 'En attente Dépôt', color: '#f59e0b', icon: Clock, desc: 'Particulier notifié' },
    'deposited':        { label: 'Déposé', color: '#10b981', icon: Package, desc: 'Dans le conteneur' },
    'available':        { label: 'Disponible', color: '#059669', icon: QrCode, desc: 'Prêt pour les pros' },
    'pending_payment':  { label: 'Paiement en attente', color: '#d97706', icon: Clock, desc: 'Vente réservée en attente de paiement' },
    'reserved':         { label: 'Réservé', color: '#ec4899', icon: User, desc: 'En attente de retrait' },
    'picked_up':        { label: 'Récupéré', color: '#2563eb', icon: Truck, desc: 'Objet retiré' },
    'deposit_expired':  { label: 'Code Expiré', color: '#ef4444', icon: AlertCircle, desc: 'Dépôt non effectué' },
    'cancelled':        { label: 'Annulé', color: '#94a3b8', icon: XCircle, desc: 'Action annulée' },
};

const styles = {
    container: {
        width: "100%",
        padding: "1rem 2rem 3rem 0",
        animation: "fadeIn 0.5s ease-out",
    },
    header: {
        marginBottom: "2rem",
    },
    statsBar: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: "0.8rem",
        marginBottom: "1.5rem",
    },
    statCard: {
        background: "#F7F8F7",
        borderRadius: "16px",
        padding: "0.9rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.7rem",
    },
    statVal: {
        fontSize: "1.1rem",
        fontWeight: "700",
        color: "var(--text-main)",
        lineHeight: "1.2",
    },
    statLabel: {
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        fontWeight: "500",
    },
    toolbar: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
        gap: "1rem",
        flexWrap: "wrap",
    },
    searchBox: {
        display: "flex",
        alignItems: "center",
        background: "rgb(229, 255, 188)",
        padding: "0.2rem 1.2rem",
        borderRadius: "100px",
        flex: 1,
        maxWidth: "400px",
    },
    searchInput: {
        border: "none",
        background: "transparent",
        padding: "0.6rem 0.5rem",
        outline: "none",
        fontSize: "0.92rem",
        width: "100%",
        color: "var(--text-main)",
    },
    filterTabs: {
        display: "flex",
        gap: "0.6rem",
        flexWrap: "wrap",
    },
    tab: (active) => ({
        border: "none",
        background: active ? "var(--black)" : "rgb(229, 255, 188)",
        color: active ? "white" : "var(--text-main)",
        padding: "0.55rem 1.2rem",
        borderRadius: "999px",
        fontSize: "0.82rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s",
    }),
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        gap: "1.5rem",
    },
    card: {
        background: "white",
        borderRadius: "28px",
        padding: "1.5rem",
        border: "1px solid #f0f0f0",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        transition: "transform 0.2s, box-shadow 0.2s",
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "1.2rem",
        alignItems: "center",
    },
    statusBadge: (color) => ({
        background: color + '12',
        color: color,
        padding: "4px 12px",
        borderRadius: "100px",
        fontSize: "0.72rem",
        fontWeight: "700",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        border: `1px solid ${color}30`,
    }),
    idBadge: {
        fontSize: "0.72rem",
        color: "var(--text-muted)",
        fontWeight: "600",
        background: "#f3f4f6",
        padding: "2px 8px",
        borderRadius: "6px",
    },
    itemMain: {
        display: "flex",
        gap: "1rem",
        marginBottom: "1.2rem",
    },
    itemImg: {
        width: "56px",
        height: "56px",
        borderRadius: "14px",
        objectFit: "cover",
        background: "#f3f4f6",
    },
    itemTitle: {
        fontSize: "1.1rem",
        fontWeight: "700",
        margin: "0 0 4px",
        color: "var(--text-main)",
        letterSpacing: "-0.01em",
    },
    itemOwner: {
        fontSize: "0.82rem",
        color: "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        gap: "5px",
    },
    infoRow: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "#f9fafb",
        padding: "10px 14px",
        borderRadius: "16px",
        marginBottom: "1.2rem",
    },
    infoText: {
        fontSize: "0.85rem",
        color: "var(--text-main)",
        fontWeight: "500",
    },
    codeBox: {
        background: "var(--forest-deep)",
        padding: "12px",
        borderRadius: "18px",
        color: "white",
        textAlign: "center",
        marginBottom: "1rem",
        boxShadow: "0 4px 12px rgba(43,69,72,0.15)",
    },
    codeLabel: {
        fontSize: "0.6rem",
        textTransform: "uppercase",
        opacity: 0.7,
        fontWeight: "700",
        letterSpacing: "0.05em",
        marginBottom: "4px",
    },
    codeVal: {
        fontSize: "1.4rem",
        fontWeight: "800",
        letterSpacing: "4px",
    },
    cardFooter: {
        marginTop: "auto",
        display: "flex",
        gap: "0.5rem",
    },
    actionMain: {
        flex: 1,
        background: "var(--black)",
        color: "white",
        border: "none",
        padding: "0.85rem",
        borderRadius: "16px",
        fontWeight: "600",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        fontSize: "0.9rem",
        transition: "opacity 0.2s",
    },
    actionSec: {
        padding: "0.85rem",
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        background: "white",
        color: "var(--text-main)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
    },
    modalBody: {
        display: "flex",
        flexDirection: "column",
        gap: "1.2rem",
        padding: "0.5rem 0",
    },
    modalItemInfo: {
        display: "flex",
        gap: "1rem",
        background: "#f8fafb",
        padding: "1rem",
        borderRadius: "20px",
        border: "1px solid #eee",
    },
    modalImg: {
        width: "48px",
        height: "48px",
        borderRadius: "12px",
        objectFit: "cover",
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
    },
    label: {
        fontSize: "0.88rem",
        fontWeight: "600",
        color: "var(--text-main)",
        paddingLeft: "4px",
    },
    select: {
        padding: "0.9rem",
        borderRadius: "14px",
        border: "1px solid #e2e8f0",
        outline: "none",
        background: "#fff",
        fontSize: "0.92rem",
    },
    input: {
        padding: "0.9rem",
        borderRadius: "14px",
        border: "1px solid #e2e8f0",
        outline: "none",
        fontSize: "0.92rem",
    },
    codeInput: {
        padding: "1.4rem",
        borderRadius: "20px",
        border: "2px dashed var(--black)",
        outline: "none",
        textAlign: "center",
        fontSize: "2rem",
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: "6px",
        background: "#f9fafb",
    },
    containerGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
    },
    containerBtn: (active, disabled) => ({
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "1rem",
        borderRadius: "18px",
        border: `2px solid ${active ? "var(--black)" : "#eef2f3"}`,
        background: active ? "#f8fafb" : "white",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s",
        textAlign: "left",
    }),
    fullBadge: {
        background: "#fee2e2",
        color: "#ef4444",
        fontSize: "0.6rem",
        fontWeight: "700",
        padding: "2px 6px",
        borderRadius: "4px",
        marginLeft: "auto",
    },
    modalActions: {
        display: "flex",
        gap: "0.8rem",
        justifyContent: "flex-end",
        marginTop: "1.5rem",
    },
    btnPri: {
        background: "var(--black)",
        color: "white",
        border: "none",
        padding: "0.9rem 2rem",
        borderRadius: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "opacity 0.2s",
    },
    btnSec: {
        background: "#f1f5f9",
        color: "var(--text-main)",
        border: "none",
        padding: "0.9rem 2rem",
        borderRadius: "14px",
        fontWeight: "600",
        cursor: "pointer",
    },
    empty: {
        textAlign: "center",
        padding: "6rem 2rem",
        color: "var(--text-muted)",
        background: "#f8fafb",
        borderRadius: "32px",
        border: "2px dashed #e5e7eb",
    },
};

export default function LogisticsDashboard() {
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [search, setSearch] = useState("");
    
    // Modal states
    const [selectedItem, setSelectedItem] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showReserveModal, setShowReserveModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showPickupModal, setShowPickupModal] = useState(false);
    const [pickupSubmitting, setPickupSubmitting] = useState(false);
    const router = require("next/navigation").useRouter();
    
    // Data for assignment
    const [points, setPoints] = useState([]);
    const [assignment, setAssignment] = useState({ pointId: "", containerId: "" });

    const [reserveNameInput, setReserveNameInput] = useState("");
    const [cancelReasonInput, setCancelReasonInput] = useState("");
    const [revertToStatusInput, setRevertToStatusInput] = useState("");

    const fetchLogistics = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(apiUrl(`/admin/logistics?status=${filter}`), { headers: buildAuthHeaders() });
            const data = await res.json();
            setItems(data.items || []);
            setStats(data.stats);
        } catch (e) {
            console.error("Failed to fetch logistics", e);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchLogistics(); }, [fetchLogistics]);

    const handleAssign = async () => {
        if (!assignment.pointId || !assignment.containerId) return;
        try {
            const res = await fetch(apiUrl(`/admin/logistics/${selectedItem.item_id}/assign`), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ 
                    deposit_point_id: parseInt(assignment.pointId), 
                    container_id: parseInt(assignment.containerId) 
                })
            });
            if (res.ok) {
                setShowAssignModal(false);
                setAssignment({ pointId: "", containerId: "" });
                fetchLogistics();
            } else {
                const err = await res.json();
                alert(err.error || "Erreur d'assignation");
            }
        } catch (e) { alert("Erreur réseau"); }
    };

    const handleGenerateCode = async (id) => {
        try {
            const res = await fetch(apiUrl(`/admin/logistics/${id}/generate-deposit-code`), {
                method: "POST",
                headers: buildAuthHeaders()
            });
            if (res.ok) fetchLogistics();
        } catch (e) { console.error(e); }
    };

    const handleConfirmDeposit = async () => {
        try {
            const res = await fetch(apiUrl(`/admin/logistics/${selectedItem.item_id}/confirm-deposit`), {
                method: "POST",
                headers: buildAuthHeaders(),
            });
            if (res.ok) {
                setShowDepositModal(false);
                fetchLogistics();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data?.error || "Impossible de confirmer le dépôt.");
            }
        } catch (e) { alert("Erreur réseau"); }
    };

    const handleMakeAvailable = async (id) => {
        try {
            const res = await fetch(apiUrl(`/admin/logistics/${id}/make-available`), {
                method: "POST", headers: buildAuthHeaders()
            });
            if (res.ok) fetchLogistics();
        } catch (e) { console.error(e); }
    };

    const handleReserve = async () => {
        if (!reserveNameInput) return;
        try {
            const res = await fetch(apiUrl(`/admin/logistics/${selectedItem.item_id}/reserve`), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ reserved_by_name: reserveNameInput })
            });
            if (res.ok) {
                setShowReserveModal(false);
                setReserveNameInput("");
                fetchLogistics();
            }
        } catch (e) { console.error(e); }
    };

    const handleConfirmPickup = async () => {
        const item = selectedItem;
        const pickupCode = (item?.pickup_code || "").toUpperCase();
        if (!pickupCode) {
            alert("Aucun code de récupération disponible pour cet objet.");
            return;
        }

        try {
            setPickupSubmitting(true);
            const res = await fetch(apiUrl(`/admin/logistics/${item.item_id}/confirm-pickup`), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ code: pickupCode })
            });
            if (res.ok) {
                setShowPickupModal(false);
                fetchLogistics();
            } else {
                alert("Code invalide ou expiré");
            }
        } catch (e) {
            alert("Erreur");
        } finally {
            setPickupSubmitting(false);
        }
    };

    const handleCancel = async () => {
        try {
            const res = await fetch(apiUrl(`/admin/logistics/${selectedItem.item_id}/cancel`), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ 
                    reason: cancelReasonInput,
                    revert_to_status: revertToStatusInput === "completely_cancel" ? "" : revertToStatusInput
                })
            });
            if (res.ok) {
                setShowCancelModal(false);
                setCancelReasonInput("");
                setRevertToStatusInput("");
                fetchLogistics();
            } else {
                const err = await res.json();
                alert(err.error || "Erreur d'annulation");
            }
        } catch (e) { console.error(e); }
    };

    const handleHardDeleteCancelledItem = async () => {
        if (!selectedItem?.item_id) return;
        const ok = window.confirm("Cette action va supprimer définitivement l'annonce et son historique logistique. Continuer ?");
        if (!ok) return;
        try {
            const res = await fetch(apiUrl(`/admin/items/${selectedItem.item_id}`), {
                method: "DELETE",
                headers: buildAuthHeaders(),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Suppression definitive impossible.");
                return;
            }
            setShowCancelModal(false);
            setSelectedItem(null);
            setCancelReasonInput("");
            setRevertToStatusInput("");
            fetchLogistics();
        } catch (e) {
            console.error(e);
            alert("Erreur reseau lors de la suppression definitive.");
        }
    };

    // --- Helpers ---

    useEffect(() => {
        const fetchPoints = async () => {
            const res = await fetch(apiUrl("/admin/deposit-points"), { headers: buildAuthHeaders() });
            const data = await res.json();
            setPoints(data.points || []);
        };
        if (showAssignModal) fetchPoints();
    }, [showAssignModal]);

    useEffect(() => {
        if (!assignment.pointId) return;
        const fetchContainers = async () => {
            try {
                const res = await fetch(apiUrl(`/admin/deposit-points/${assignment.pointId}/containers`), { headers: buildAuthHeaders() });
                const data = await res.json();
                setPoints(prev => prev.map(p => p.id === parseInt(assignment.pointId) ? { ...p, containers: data.containers } : p));
            } catch (e) { console.error(e); }
        };
        fetchContainers();
    }, [assignment.pointId]);

    const selectedPoint = points.find(p => p.id === parseInt(assignment.pointId));

    const filteredItems = items.filter(it => 
        it.item_title.toLowerCase().includes(search.toLowerCase()) || 
        it.owner_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <p className="activities-label">Logistique & Flux</p>
                <h1 style={{ fontSize: "2.4rem", fontWeight: "600", color: "var(--text-main)", letterSpacing: "-0.02em", margin: "0.4rem 0" }}>Suivi des flux objets</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>Supervisez le cycle complet du dépôt à la récupération pro.</p>
            </header>

            <div style={styles.statsBar}>
                {stats && Object.entries(STATUS_MAP).map(([key, cfg]) => (
                    <div key={key} style={styles.statCard}>
                        <div style={{ background: cfg.color + '15', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                            <cfg.icon size={20} color={cfg.color} />
                        </div>
                        <div>
                            <div style={styles.statVal}>{stats[key] || 0}</div>
                            <div style={styles.statLabel}>{cfg.label}</div>
                        </div>
                    </div>
                ))}
                <div style={styles.statCard}>
                    <div style={{ background: 'var(--black)15', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                        <Truck size={20} color="var(--black)" />
                    </div>
                    <div>
                        <div style={styles.statVal}>{stats?.total || 0}</div>
                        <div style={styles.statLabel}>Total flux</div>
                    </div>
                </div>
            </div>

            <div style={styles.toolbar}>
                <div style={styles.searchBox}>
                    <Search size={18} color="var(--text-muted)" />
                    <input 
                        placeholder="Rechercher un objet, un auteur..." 
                        style={styles.searchInput}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                
                <div style={styles.filterTabs}>
                    <button style={styles.tab(filter === "")} onClick={() => setFilter("")}>Tout</button>
                    {['validated', 'assigned', 'deposit_code_sent', 'deposited', 'available', 'reserved'].map(s => (
                        <button 
                            key={s} 
                            style={styles.tab(filter === s)} 
                            onClick={() => setFilter(s)}
                        >
                            {STATUS_MAP[s].label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={styles.content}>
                {loading ? (
                    <div style={styles.empty}><Loader2 className="spin" /></div>
                ) : filteredItems.length === 0 ? (
                    <div style={styles.empty}>Aucun flux en cours pour ce statut.</div>
                ) : (
                    <div style={styles.grid}>
                        {filteredItems.map(item => (
                            <LogisticsCard 
                                key={item.item_id} 
                                item={item} 
                                onClickCard={() => router.push(`/annonces/logistique/${item.item_id}`)}
                                actions={{
                                    assign: () => { setSelectedItem(item); setShowAssignModal(true); },
                                    generate: () => handleGenerateCode(item.item_id),
                                    deposit: () => { setSelectedItem(item); setShowDepositModal(true); },
                                    available: () => handleMakeAvailable(item.item_id),
                                    reserve: () => { setSelectedItem(item); setShowReserveModal(true); },
                                    pickup: () => { setSelectedItem(item); setShowPickupModal(true); },
                                    cancel: () => { setSelectedItem(item); setShowCancelModal(true); },
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* --- Modals --- */}
            
            <AdminModal open={showAssignModal} title="Assignation Logistique" onClose={() => setShowAssignModal(false)}>
                <div style={styles.modalBody}>
                    <div style={styles.modalItemInfo}>
                        <img src={selectedItem?.item_image} style={styles.modalImg} />
                        <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{selectedItem?.item_title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedItem?.owner_name}</div>
                        </div>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Point de dépôt</label>
                        <select 
                            style={styles.select} 
                            value={assignment.pointId} 
                            onChange={e => setAssignment({...assignment, pointId: e.target.value, containerId: ""})}
                        >
                            <option value="">Sélectionner un point...</option>
                            {points.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.city})</option>
                            ))}
                        </select>
                    </div>

                    {assignment.pointId && (
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Conteneur disponible</label>
                            <div style={styles.containerGrid}>
                                {selectedPoint?.containers?.map(c => {
                                    const isFull = c.current_count >= c.capacity;
                                    const isInactive = c.status === 'inactif';
                                    const isMaintenance = c.status === 'maintenance';
                                    const hasMaintenanceWindow = Boolean(c.maintenance_start && c.maintenance_end);
                                    const now = Date.now();
                                    const maintenanceStart = hasMaintenanceWindow ? new Date(c.maintenance_start).getTime() : 0;
                                    const maintenanceEnd = hasMaintenanceWindow ? new Date(c.maintenance_end).getTime() : 0;
                                    const isInMaintenanceWindow = isMaintenance && hasMaintenanceWindow && !Number.isNaN(maintenanceStart) && !Number.isNaN(maintenanceEnd) && now >= maintenanceStart && now <= maintenanceEnd;
                                    const disabled = isFull || isInactive || isInMaintenanceWindow;
                                    return (
                                        <button 
                                            key={c.id} 
                                            disabled={disabled}
                                            style={styles.containerBtn(assignment.containerId === c.id.toString(), disabled)}
                                            onClick={() => setAssignment({...assignment, containerId: c.id.toString()})}
                                        >
                                            <div style={{ background: (assignment.containerId === c.id.toString() ? 'var(--black)' : '#f3f4f6'), padding: '8px', borderRadius: '10px', color: (assignment.containerId === c.id.toString() ? 'white' : 'var(--text-muted)') }}>
                                                <Boxes size={16} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{c.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.current_count}/{c.capacity} objets</div>
                                            </div>
                                            {isFull && <div style={styles.fullBadge}>Plein</div>}
                                            {!isFull && isInMaintenanceWindow && <div style={styles.fullBadge}>Maintenance</div>}
                                            {!isFull && !isInMaintenanceWindow && isInactive && <div style={styles.fullBadge}>Indispo</div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div style={styles.modalActions}>
                        <button style={styles.btnSec} onClick={() => setShowAssignModal(false)}>Annuler</button>
                        <button style={styles.btnPri} disabled={!assignment.containerId} onClick={handleAssign}>Confirmer l'assignation</button>
                    </div>
                </div>
            </AdminModal>

            <AdminModal open={showDepositModal} title="Confirmer le dépôt" onClose={() => setShowDepositModal(false)}>
                <div style={styles.modalBody}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafb', borderRadius: '16px', padding: '0.85rem 1rem', marginBottom: '1.25rem', border: '1px solid rgba(35,59,61,0.07)' }}>
                        {selectedItem?.item_image && (
                            <img
                                src={selectedItem.item_image}
                                alt={selectedItem?.title}
                                style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                            />
                        )}
                        <div style={{ fontWeight: '700', fontSize: '0.97rem', color: 'var(--text-main)', lineHeight: '1.3' }}>{selectedItem?.item_title}</div>
                    </div>
                    <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                        Confirmez-vous que cet objet a bien été déposé physiquement au point de collecte ?
                    </p>
                    <div style={styles.modalActions}>
                        <button style={styles.btnSec} onClick={() => setShowDepositModal(false)}>Annuler</button>
                        <button style={styles.btnPri} onClick={handleConfirmDeposit}>Confirmer le dépôt</button>
                    </div>
                </div>
            </AdminModal>

            <AdminModal open={showReserveModal} title="Réservation Professionnelle" onClose={() => setShowReserveModal(false)}>
                <div style={styles.modalBody}>
                    <div style={{ display: 'flex', gap: '1rem', background: '#f8fafb', padding: '1rem', borderRadius: '20px', marginBottom: '1rem', border: '1px solid #eee' }}>
                        <div style={{ background: '#ec489915', padding: '10px', borderRadius: '12px' }}>
                            <User size={24} color="#ec4899" />
                        </div>
                        <div>
                            <div style={{ fontWeight: '700' }}>Nouvelle réservation</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>L'objet sera réservé pendant 48h.</div>
                        </div>
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Nom du professionnel / Entreprise</label>
                        <input 
                            placeholder="Ex: Atelier Upcycle Paris" 
                            style={styles.input} 
                            value={reserveNameInput}
                            onChange={e => setReserveNameInput(e.target.value)}
                        />
                    </div>
                    <div style={styles.modalActions}>
                        <button style={styles.btnSec} onClick={() => setShowReserveModal(false)}>Annuler</button>
                        <button style={styles.btnPri} disabled={!reserveNameInput} onClick={handleReserve}>Confirmer la réservation</button>
                    </div>
                </div>
            </AdminModal>

            <AdminModal open={showPickupModal} title="Confirmer la récupération" onClose={() => setShowPickupModal(false)}>
                <div style={styles.modalBody}>
                    <div style={styles.modalItemInfo}>
                        <img src={selectedItem?.item_image} style={styles.modalImg} />
                        <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{selectedItem?.item_title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedItem?.reserved_by_name || "Réservation professionnelle"}</div>
                        </div>
                    </div>

                    <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.6' }}>
                        Confirmer la récupération de cet objet ?
                    </p>

                    <div style={styles.modalActions}>
                        <button style={styles.btnSec} onClick={() => setShowPickupModal(false)} disabled={pickupSubmitting}>Annuler</button>
                        <button style={styles.btnPri} onClick={handleConfirmPickup} disabled={pickupSubmitting}>
                            {pickupSubmitting ? "Confirmation..." : "Confirmer la récupération"}
                        </button>
                    </div>
                </div>
            </AdminModal>

            <AdminModal open={showCancelModal} title="Retour ou Annulation du flux" onClose={() => setShowCancelModal(false)}>
                <div style={styles.modalBody}>
                    {selectedItem?.workflow_status === "cancelled" ? (
                        <>
                            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500', border: '1px solid #fecaca' }}>
                                Ce flux est déjà annulé. Vous pouvez supprimer définitivement l'annonce pour la retirer du suivi des flux objets et de la base de données.
                            </div>
                            <div style={styles.modalActions}>
                                <button style={styles.btnSec} onClick={() => setShowCancelModal(false)}>Fermer</button>
                                <button style={{ ...styles.btnPri, background: '#dc2626' }} onClick={handleHardDeleteCancelledItem}>
                                    Supprimer définitivement l'annonce
                                </button>
                            </div>
                        </>
                    ) : selectedItem?.workflow_status === "picked_up" ? (
                        <>
                            <div style={{ background: '#f0fdf4', color: '#166534', padding: '1rem', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500', border: '1px solid #bbf7d0' }}>
                                Ce flux est <strong>terminé</strong> — l'objet a été récupéré avec succès. Vous pouvez supprimer définitivement cette annonce et son historique logistique, ce qui permettra également de supprimer le compte professionnel associé si souhaité.
                            </div>
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#991b1b', marginBottom: '2px' }}>⚠ Zone de suppression définitive</div>
                                    <div style={{ fontSize: '0.78rem', color: '#b91c1c' }}>Cette action est irréversible. L'annonce et son historique seront supprimés.</div>
                                </div>
                                <button style={{ ...styles.btnPri, background: '#dc2626', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={handleHardDeleteCancelledItem}>
                                    Supprimer l'annonce
                                </button>
                            </div>
                            <div style={styles.modalActions}>
                                <button style={styles.btnSec} onClick={() => setShowCancelModal(false)}>Fermer</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ background: '#fffbeb', color: '#b45309', padding: '1rem', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500', border: '1px solid #fef3c7' }}>
                                Vous pouvez revenir à une étape précédente ou annuler complètement le flux logistique (ce qui libérera la place si l'objet est déjà déposé).
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Action souhaitée</label>
                                <select 
                                    style={styles.select}
                                    value={revertToStatusInput}
                                    onChange={e => setRevertToStatusInput(e.target.value)}
                                >
                                    <option value="">Sélectionnez l'action...</option>
                                    <optgroup label="Revenir à une étape précédente">
                                        {selectedItem && (() => {
                                            const flow = ['validated', 'assigned', 'deposit_code_sent', 'deposited', 'available', 'reserved'];
                                            const idx = flow.indexOf(selectedItem.workflow_status);
                                            if (idx > 0) {
                                                return flow.slice(0, idx).map(st => (
                                                    <option key={st} value={st}>Revenir au statut : {STATUS_MAP[st]?.label}</option>
                                                ));
                                            }
                                            return null;
                                        })()}
                                    </optgroup>
                                    <optgroup label="Annulation totale">
                                        <option value="completely_cancel">Annuler totalement le flux</option>
                                    </optgroup>
                                </select>
                            </div>
                            {revertToStatusInput === "completely_cancel" && (
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Raison de l'annulation totale</label>
                                    <textarea 
                                        placeholder="Optionnel..." 
                                        style={{ ...styles.input, minHeight: '80px', resize: 'none', fontFamily: 'inherit' }}
                                        value={cancelReasonInput}
                                        onChange={e => setCancelReasonInput(e.target.value)}
                                    />
                                </div>
                            )}
                            <div style={styles.modalActions}>
                                <button style={styles.btnSec} onClick={() => setShowCancelModal(false)}>Fermer sans rien faire</button>
                                <button 
                                    style={{ ...styles.btnPri, background: revertToStatusInput === "completely_cancel" ? '#ef4444' : 'var(--black)' }} 
                                    onClick={handleCancel}
                                    disabled={!revertToStatusInput}
                                >
                                    {revertToStatusInput === "completely_cancel" ? "Confirmer l'annulation totale" : "Confirmer le retour"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </AdminModal>

            <style jsx>{`
                .spin { animation: rotate 1s linear infinite; }
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

function LogisticsCard({ item, actions, onClickCard }) {
    const status = STATUS_MAP[item.workflow_status] || { label: item.workflow_status, color: '#000', icon: AlertCircle };
    const Icon = status.icon;

    return (
        <div style={{ ...styles.card, cursor: 'pointer' }} className="logistics-card" onClick={onClickCard}>
            <div style={styles.cardHeader}>
                <div style={styles.statusBadge(status.color)}>
                    <Icon size={12} />
                    <span>{status.label}</span>
                </div>
                <div style={styles.idBadge}>#{item.item_id}</div>
            </div>

            <div style={styles.cardBody}>
                <div style={styles.itemMain}>
                    <img src={item.item_image} style={styles.itemImg} />
                    <div style={{ flex: 1 }}>
                        <h3 style={styles.itemTitle}>{item.item_title}</h3>
                        <p style={styles.itemOwner}>
                            <User size={13} /> {item.owner_name}
                        </p>
                    </div>
                </div>

                <div style={styles.infoRow}>
                    <div style={{ color: item.deposit_point_name ? 'var(--forest-deep)' : '#ef4444' }}>
                        <MapPin size={16} />
                    </div>
                    <span style={styles.infoText}>
                        {item.deposit_point_name ? `${item.deposit_point_name} (${item.container_name})` : "Point non assigné"}
                    </span>
                </div>

                {item.workflow_status === 'deposit_code_sent' && (
                    <div style={styles.codeBox}>
                        <div style={styles.codeLabel}>Code de dépôt</div>
                        <div style={styles.codeVal}>{item.deposit_code}</div>
                    </div>
                )}
                
                {item.workflow_status === 'reserved' && (
                    <div style={styles.codeBox}>
                        <div style={styles.codeLabel}>Code Récupération ({item.reserved_by_name})</div>
                        <div style={styles.codeVal}>{item.pickup_code}</div>
                    </div>
                )}
                
                {item.workflow_status === 'deposit_expired' && (
                    <div style={{ ...styles.codeBox, background: '#fee2e2', color: '#ef4444' }}>
                        <div style={styles.codeLabel}>Le code a expiré</div>
                        <div style={{ ...styles.codeVal, fontSize: '1rem', letterSpacing: 'normal' }}>Renouvelez l'attribution</div>
                    </div>
                )}
            </div>

            <div style={styles.cardFooter} onClick={(e) => e.stopPropagation()}>
                <WorkflowButtons status={item.workflow_status} actions={actions} />
                <button 
                    style={{ ...styles.actionSec, border: 'none', background: '#f3f4f6' }} 
                    onClick={actions.cancel}
                    title="Annuler le flux"
                >
                    <X size={18} />
                </button>
            </div>
            
            <style jsx>{`
                .logistics-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 30px rgba(0,0,0,0.08);
                }
            `}</style>
        </div>
    );
}

function WorkflowButtons({ status, actions }) {
    switch (status) {
        case 'validated':
            return <button style={styles.actionMain} onClick={actions.assign}><MapPin size={16} /> Assigner point</button>;
        case 'assigned':
            return <button style={styles.actionMain} onClick={actions.generate}><QrCode size={16} /> Générer code dépôt</button>;
        case 'deposit_code_sent':
            return <button style={styles.actionMain} onClick={actions.deposit}><CheckCircle2 size={16} /> Confirmer dépôt</button>;
        case 'deposited':
            return <button style={styles.actionMain} onClick={actions.available}><ArrowRight size={16} /> Mise à disposition</button>;
        case 'available':
            return <button style={styles.actionMain} onClick={actions.reserve}><User size={16} /> Réserver pour pro</button>;
        case 'reserved':
            return <button style={styles.actionMain} onClick={actions.pickup}><Truck size={16} /> Valider collecte</button>;
        case 'deposit_expired':
            return <button style={styles.actionMain} onClick={actions.assign}><History size={16} /> Régénérer code</button>;
        default:
            return <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', flex: 1, padding: '0.85rem', background: '#f9fafb', borderRadius: '16px', fontWeight: '500' }}>Flux terminé</div>;
    }
}
