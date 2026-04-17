"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, CheckCircle2, Clock, MapPin, 
    Truck, User, Package, XCircle, FileText, QrCode, AlertCircle, RefreshCw
} from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../../../lib/api";

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

export default function LogisticsDetailPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const [logistics, setLogistics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogistics = async () => {
            try {
                const res = await fetch(apiUrl(`/admin/logistics/${id}`), {
                    headers: buildAuthHeaders()
                });
                if (res.ok) {
                    const data = await res.json();
                    setLogistics(data);
                } else {
                    console.error("Failed to fetch");
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogistics();
    }, [id]);

    if (loading) {
        return <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}><RefreshCw className="spin" size={24} /></div>;
    }

    if (!logistics) {
        return <div style={{ padding: "4rem", textAlign: "center" }}>Flux logistique introuvable pour cette annonce.</div>;
    }

    const formatDate = (dateString) => {
        if (!dateString) return "Date inconnue";
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
            day: "numeric", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    const status = STATUS_MAP[logistics.workflow_status] || { label: logistics.workflow_status, color: '#000', icon: AlertCircle };
    const Icon = status.icon;

    // Build timeline events based on available timestamps
    const timeline = [];
    
    // 1. Creation / Validation
    if (logistics.created_at) {
        timeline.push({
            title: "Validation & Création du flux",
            date: logistics.created_at,
            desc: "L'annonce a été validée par la modération et a intégré le circuit logistique.",
            icon: CheckCircle2,
            color: "#6366f1"
        });
    }

    // 2. Assignment
    if (logistics.assigned_at) {
        timeline.push({
            title: "Point de dépôt assigné",
            date: logistics.assigned_at,
            desc: `L'objet a été assigné au point de dépôt "${logistics.deposit_point_name}" (Conteneur: ${logistics.container_name}).`,
            icon: MapPin,
            color: "#8b5cf6"
        });
    }

    // 3. Code generated
    if (logistics.deposit_code_sent_at) {
        timeline.push({
            title: "Code de dépôt généré",
            date: logistics.deposit_code_sent_at,
            desc: `Le code de dépôt (${logistics.deposit_code}) a été généré et notifié à l'utilisateur.`,
            icon: QrCode,
            color: "#f59e0b"
        });
    }

    // 4. Deposited
    if (logistics.deposited_at) {
        timeline.push({
            title: "Objet déposé",
            date: logistics.deposited_at,
            desc: "L'utilisateur a déposé l'objet dans le conteneur. Le dépôt a été confirmé.",
            icon: Package,
            color: "#10b981"
        });
    }

    // 4b. Available (Sometimes marked implicitly, or explicitly by admin)
    // There isn't an 'available_at' in the returned struct currently, so we skip it or tie it to 'deposited_at'
    
    // 5. Reserved
    if (logistics.reserved_at) {
        timeline.push({
            title: "Objet réservé par un visiteur pro",
            date: logistics.reserved_at,
            desc: `L'objet a été réservé par ${logistics.reserved_by_name}.`,
            icon: User,
            color: "#ec4899"
        });
    }

    // 6. Payment (if applicable)
    if (logistics.payment_validated_at) {
        timeline.push({
            title: "Paiement validé",
            date: logistics.payment_validated_at,
            desc: "Le professionnel a effectué le paiement avec succès pour cette vente.",
            icon: CheckCircle2,
            color: "#059669"
        });
    }

    // 7. Picked Up
    if (logistics.picked_up_at) {
        timeline.push({
            title: "Objet récupéré",
            date: logistics.picked_up_at,
            desc: "Le professionnel a retiré l'objet du point de dépôt. Cycle terminé.",
            icon: Truck,
            color: "#2563eb"
        });
    }

    // 8. Cancelled
    if (logistics.cancelled_at) {
        timeline.push({
            title: "Flux annulé",
            date: logistics.cancelled_at,
            desc: `L'action logistique a été annulée. Motif : ${logistics.cancel_reason || "Non spécifié"}`,
            icon: XCircle,
            color: "#ef4444"
        });
    }

    // Sort timeline by date ascending
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
        <div style={{ width: "100%", padding: "1rem 2rem 3rem 0", animation: "fadeIn 0.5s ease-out" }}>
            <header style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                <button 
                    onClick={() => router.push("/annonces/logistique")}
                    style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "999px", padding: "0.6rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
                >
                    <ArrowLeft size={20} color="var(--text-main)" />
                </button>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: 0, color: "var(--text-main)" }}>Historique de l'objet</h1>
                    <p style={{ color: "var(--text-muted)", margin: 0 }}>Annonce #{logistics.item_id}</p>
                </div>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "2rem" }}>
                <div>
                    <div style={{ background: "white", borderRadius: "24px", padding: "2rem", border: "1px solid #f0f0f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                        <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.5rem" }}>Parcours Logistique</h2>
                        
                        <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
                            {/* Vertical Line */}
                            <div style={{ position: "absolute", left: "-1px", top: "10px", bottom: "10px", width: "2px", background: "#f1f5f9" }} />
                            
                            {timeline.map((step, idx) => {
                                const StepIcon = step.icon;
                                const isLast = idx === timeline.length - 1;
                                return (
                                    <div key={idx} style={{ position: "relative", marginBottom: isLast ? 0 : "2rem" }}>
                                        {/* Connector Dot */}
                                        <div style={{ 
                                            position: "absolute", 
                                            left: "-2.15rem", 
                                            top: "2px", 
                                            width: "24px", 
                                            height: "24px", 
                                            borderRadius: "50%", 
                                            background: step.color + '20',
                                            border: `2px solid ${step.color}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            zIndex: 2
                                        }}>
                                            <div style={{ width: "8px", height: "8px", background: step.color, borderRadius: "50%" }} />
                                        </div>
                                        
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.4rem" }}>
                                                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "var(--text-main)" }}>{step.title}</h3>
                                                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>{formatDate(step.date)}</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                                                {step.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ background: "white", borderRadius: "24px", padding: "1.5rem", border: "1px solid #f0f0f0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>Statut Actuel</h2>
                            <div style={{ background: status.color + '12', color: status.color, padding: "4px 12px", borderRadius: "100px", fontSize: "0.72rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px", border: `1px solid ${status.color}30` }}>
                                <Icon size={12} />
                                <span>{status.label}</span>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                            {logistics.item_image ? (
                                <img src={logistics.item_image} alt={logistics.item_title} style={{ width: "64px", height: "64px", borderRadius: "16px", objectFit: "cover", background: "#f8fafb" }} />
                            ) : (
                                <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "#f8fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Package size={24} color="var(--text-muted)" />
                                </div>
                            )}
                            <div>
                                <h3 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: "700" }}>{logistics.item_title}</h3>
                                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Déposé par {logistics.owner_name}</p>
                            </div>
                        </div>

                        {logistics.deposit_point_name && (
                            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#f8fafb", borderRadius: "16px", display: "flex", gap: "1rem", alignItems: "center" }}>
                                <div style={{ background: "var(--forest-deep)", color: "white", padding: "10px", borderRadius: "12px" }}>
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "var(--text-muted)", marginBottom: "2px" }}>Point de dépôt assigné</div>
                                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{logistics.deposit_point_name}</div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Conteneur: {logistics.container_name}</div>
                                </div>
                            </div>
                        )}

                        {logistics.transaction_ref && (
                            <div style={{ marginTop: "1rem", padding: "1rem", background: "#f8fafb", borderRadius: "16px", display: "flex", gap: "1rem", alignItems: "center" }}>
                                <div style={{ background: "#1d4ed8", color: "white", padding: "10px", borderRadius: "12px" }}>
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "var(--text-muted)", marginBottom: "2px" }}>
                                        Numero de transaction
                                    </div>
                                    <div style={{ fontWeight: "700", fontSize: "0.95rem", letterSpacing: "0.2px", color: "var(--text-main)" }}>
                                        {logistics.transaction_ref}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .spin { animation: rotate 1s linear infinite; }
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
