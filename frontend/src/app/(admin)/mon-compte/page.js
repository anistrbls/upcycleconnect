"use client";

import { useEffect, useState } from "react";
import { User, Mail, Phone, MapPin, ShieldCheck, Save, Loader2, KeyRound, BarChart3, Star } from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../lib/api";

const styles = {
    container: {
        width: "100%",
        padding: "1rem 2rem 3rem 2rem",
        animation: "fadeIn 0.5s ease-out",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "2rem",
        alignItems: "start",
    },
    section: {
        background: "var(--surface-hover)",
        borderRadius: "28px",
        padding: "2rem",
        border: "none",
        position: "relative",
    },
    sectionTitle: {
        fontSize: "1.1rem",
        fontWeight: "600",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        color: "var(--text-main)",
    },
    formGroup: {
        marginBottom: "1.25rem",
    },
    label: {
        display: "block",
        fontSize: "0.85rem",
        fontWeight: "500",
        color: "var(--text-muted)",
        marginBottom: "0.5rem",
        marginLeft: "0.2rem",
    },
    inputWrap: {
        display: "flex",
        alignItems: "center",
        background: "white",
        borderRadius: "14px",
        padding: "0 1rem",
        border: "none",
        transition: "all 0.2s ease",
    },
    input: {
        width: "100%",
        background: "transparent",
        border: "none",
        padding: "0.8rem 0",
        fontSize: "0.95rem",
        fontWeight: "500",
        color: "var(--text-main)",
        outline: "none",
    },
    infoBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 1rem",
        borderRadius: "12px",
        fontSize: "0.8rem",
        fontWeight: "600",
        background: "rgba(74, 222, 128, 0.1)",
        color: "#166534",
        marginBottom: "1.5rem",
    },
    toast: {
        position: "fixed",
        bottom: "2.5rem",
        right: "2.5rem",
        padding: "1.2rem 2rem",
        borderRadius: "20px",
        background: "#111",
        color: "white",
        boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(12px)",
        animation: "slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    },
    metricPill: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        padding: "0.45rem 0.85rem",
        borderRadius: "12px",
        background: "var(--surface-hover)",
        fontSize: "0.88rem",
        color: "var(--text-main)",
    },
};

function AccountHeaderMetrics({ role, sellerRatingAvg, sellerRatingCount, upcycleConnectScore }) {
    const showSeller = role === "particulier" || role === "professionnel";
    const showUc = role === "professionnel" && typeof upcycleConnectScore === "number";
    if (!showSeller && !showUc) return null;

    const cnt = Number(sellerRatingCount) || 0;
    const avgNum =
        sellerRatingAvg != null && !Number.isNaN(Number(sellerRatingAvg)) ? Number(sellerRatingAvg) : null;
    const hasRatings = cnt > 0 && avgNum != null;
    const displayAvg = hasRatings
        ? avgNum.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : null;

    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "1.1rem",
                alignItems: "center",
            }}
        >
            {showSeller ? (
                <div style={styles.metricPill}>
                    <span style={{ display: "inline-flex", gap: "0.05rem" }} aria-hidden>
                        {[1, 2, 3, 4, 5].map((n) => {
                            const on = hasRatings && avgNum >= n - 1e-9;
                            return (
                                <Star
                                    key={n}
                                    size={16}
                                    fill={on ? "#ca8a04" : "none"}
                                    color={on ? "#ca8a04" : "rgba(35,59,61,0.22)"}
                                    strokeWidth={on ? 0 : 1.4}
                                />
                            );
                        })}
                    </span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {hasRatings ? `${displayAvg}/5` : "—"}
                    </span>
                    {cnt > 0 ? (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>({cnt})</span>
                    ) : null}
                </div>
            ) : null}
            {showUc ? (
                <div style={styles.metricPill}>
                    <BarChart3 size={16} color="var(--text-muted)" strokeWidth={2} />
                    <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>UC</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {upcycleConnectScore.toFixed(1)}
                    </span>
                </div>
            ) : null}
        </div>
    );
}

export default function MonComptePage() {
    const [userData, setUserData] = useState({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        city: "",
        role: "",
        status: "",
        // Champs Pro
        companyName: "",
        siret: "",
        address: "",
        zipCode: "",
        activityType: "",
        interventionZone: "",
        // Champs Salarié
        employeeRole: "",
        siteLocation: "",
        skills: "",
        upcycleConnectScore: null,
        sellerRatingAvg: null,
        sellerRatingCount: 0,
    });
    const [passwords, setPasswords] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPass, setSavingPass] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const resp = await fetch(apiUrl("/profile"), {
                    headers: buildAuthHeaders()
                });
                const data = await resp.json();
                if (resp.ok) {
                    setUserData(data.user);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchMe();
    }, []);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const validateProfile = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/; // Format français
        const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
        
        if (!userData.firstname?.trim() || userData.firstname.length < 2) return "Le prénom doit contenir au moins 2 caractères.";
        if (!nameRegex.test(userData.firstname)) return "Le prénom contient des caractères non valides.";
        
        if (!userData.lastname?.trim() || userData.lastname.length < 2) return "Le nom doit contenir au moins 2 caractères.";
        if (!nameRegex.test(userData.lastname)) return "Le nom contient des caractères non valides.";
        
        if (!userData.email?.trim() || !emailRegex.test(userData.email)) return "Veuillez entrer une adresse email valide.";
        
        if (userData.role !== "admin") {
            if (userData.phone && !phoneRegex.test(userData.phone)) return "Veuillez entrer un numéro de téléphone valide (ex: 06 12 34 56 78).";
            if (!userData.city?.trim() || userData.city.length < 2) return "La ville doit contenir au moins 2 caractères.";
            if (!nameRegex.test(userData.city)) return "La ville contient des caractères non valides.";
        }

        return null;
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        
        const error = validateProfile();
        if (error) {
            showToast(error, "error");
            return;
        }

        setSavingProfile(true);
        try {
            const resp = await fetch(apiUrl("/profile"), {
                method: "PUT",
                headers: buildAuthHeaders(),
                body: JSON.stringify({
                    firstname: userData.firstname,
                    lastname: userData.lastname,
                    email: userData.email,
                    phone: userData.phone ?? "",
                    city: userData.city ?? "",
                }),
            });
            const data = await resp.json();
            if (resp.ok) {
                showToast("Profil mis à jour avec succès !");
            } else {
                showToast(data.error || "Erreur lors de la mise à jour", "error");
            }
        } catch (err) {
            showToast("Erreur réseau", "error");
        } finally {
            setSavingProfile(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            showToast("Les mots de passe ne correspondent pas", "error");
            return;
        }
        setSavingPass(true);
        try {
            const resp = await fetch(apiUrl("/profile/password"), {
                method: "POST",
                headers: buildAuthHeaders(),
                body: JSON.stringify({
                    oldPassword: passwords.oldPassword,
                    newPassword: passwords.newPassword
                })
            });
            const data = await resp.json();
            if (resp.ok) {
                showToast("Mot de passe modifié. Reconnexion nécessaire.");
                setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                showToast(data.error || "Erreur lors du changement", "error");
            }
        } catch (err) {
            showToast("Erreur réseau", "error");
        } finally {
            setSavingPass(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--emerald-deep)" />
            </div>
        );
    }

    const isAdmin = userData.role === "admin";

    return (
        <div style={styles.container}>
            <div className="header-section">
                <div className="title-area">
                    <span className="activities-label">
                        {userData.role === 'admin' ? 'Administration' : 
                         userData.role === 'professionnel' ? 'Espace Pro' : 
                         userData.role === 'salarie' ? 'Espace Salarié' : 'Espace particulier'}
                    </span>
                    <h1>Mon compte</h1>
                    <AccountHeaderMetrics
                        role={userData.role}
                        sellerRatingAvg={userData.sellerRatingAvg}
                        sellerRatingCount={userData.sellerRatingCount}
                        upcycleConnectScore={userData.upcycleConnectScore}
                    />
                </div>
            </div>

            <div style={styles.grid}>
                {/* Section Informations */}
                <section style={styles.section}>
                    <div style={styles.sectionTitle}>
                        <User size={20} />
                        Informations Personnelles
                    </div>
                    
                    <div style={styles.infoBadge}>
                        <ShieldCheck size={16} />
                        {userData.status === "active" ? "Compte actif" : "En attente"}
                    </div>

                    <form onSubmit={handleUpdateProfile}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Prénom</label>
                                <div style={styles.inputWrap} className="form-group-input">
                                    <input 
                                        style={styles.input} 
                                        value={userData.firstname}
                                        onChange={e => setUserData({...userData, firstname: e.target.value})}
                                        required
                                        minLength={2}
                                    />
                                </div>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Nom</label>
                                <div style={styles.inputWrap} className="form-group-input">
                                    <input 
                                        style={styles.input} 
                                        value={userData.lastname}
                                        onChange={e => setUserData({...userData, lastname: e.target.value})}
                                        required
                                        minLength={2}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Adresse Email</label>
                            <div style={styles.inputWrap} className="form-group-input">
                                <Mail size={16} color="#94a3b8" />
                                <input 
                                    style={styles.input} 
                                    type="email"
                                    value={userData.email}
                                    onChange={e => setUserData({...userData, email: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        {!isAdmin && (
                            <>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Téléphone</label>
                                    <div style={styles.inputWrap} className="form-group-input">
                                        <Phone size={16} color="#94a3b8" />
                                        <input
                                            style={styles.input}
                                            type="tel"
                                            value={userData.phone}
                                            onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Ville</label>
                                    <div style={styles.inputWrap} className="form-group-input">
                                        <MapPin size={16} color="#94a3b8" />
                                        <input
                                            style={styles.input}
                                            value={userData.city}
                                            onChange={(e) => setUserData({ ...userData, city: e.target.value })}
                                            required
                                            minLength={2}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <button className="action-btn primary" disabled={savingProfile} style={{ width: '100%', padding: '0.85rem', marginTop: '1rem' }}>
                            {savingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Sauvegarder les modifications
                        </button>
                    </form>
                </section>

                {/* Section Sécurité */}
                <section style={styles.section}>
                    <div style={styles.sectionTitle}>
                        <KeyRound size={20} />
                        Sécurité du compte
                    </div>

                    <form onSubmit={handleUpdatePassword}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Ancien mot de passe</label>
                            <div style={styles.inputWrap} className="form-group-input">
                                <input 
                                    style={styles.input} 
                                    type="password"
                                    value={passwords.oldPassword}
                                    onChange={e => setPasswords({...passwords, oldPassword: e.target.value})}
                                />
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Nouveau mot de passe</label>
                            <div style={styles.inputWrap} className="form-group-input">
                                <input 
                                    style={styles.input} 
                                    type="password"
                                    placeholder="8 caractères min."
                                    value={passwords.newPassword}
                                    onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                                />
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Confirmer le nouveau mot de passe</label>
                            <div style={styles.inputWrap} className="form-group-input">
                                <input 
                                    style={styles.input} 
                                    type="password"
                                    value={passwords.confirmPassword}
                                    onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                                />
                            </div>
                        </div>

                        <button className="action-btn primary" disabled={savingPass} style={{ width: '100%', padding: '0.85rem', marginTop: '1rem' }}>
                            {savingPass ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
                            Changer le mot de passe
                        </button>
                        <p style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>
                            Déconnexion sur tous les appareils.
                        </p>
                    </form>
                </section>

                {/* Section Professionnelle (si applicable) */}
                {userData.role === 'professionnel' && (
                    <section style={styles.section}>
                        <div style={styles.sectionTitle}>
                            <ShieldCheck size={20} />
                            Entreprise
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Nom de l'entreprise</label>
                                <div style={{...styles.inputWrap, background: 'rgba(255,255,255,0.5)'}}>
                                    <input style={styles.input} value={userData.companyName} readOnly />
                                </div>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>SIRET</label>
                                <div style={{...styles.inputWrap, background: 'rgba(255,255,255,0.5)'}}>
                                    <input style={styles.input} value={userData.siret} readOnly />
                                </div>
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Adresse du siège</label>
                            <div style={{...styles.inputWrap, background: 'rgba(255,255,255,0.5)'}}>
                                <input style={styles.input} value={userData.address} readOnly />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Code Postal</label>
                                <div style={{...styles.inputWrap, background: 'rgba(255,255,255,0.5)'}}>
                                    <input style={styles.input} value={userData.zipCode} readOnly />
                                </div>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Type d'activité</label>
                                <div style={{...styles.inputWrap, background: 'rgba(255,255,255,0.5)'}}>
                                    <input style={styles.input} value={userData.activityType} readOnly />
                                </div>
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Zone d'intervention</label>
                            <div style={{...styles.inputWrap, background: 'rgba(255,255,255,0.5)'}}>
                                <input style={styles.input} value={userData.interventionZone} readOnly />
                            </div>
                        </div>
                    </section>
                )}

                {/* Section Salarié (si applicable) */}
                {userData.role === 'salarie' && (
                    <section style={{...styles.section, background: 'rgba(59, 130, 246, 0.05)'}}>
                        <div style={styles.sectionTitle}>
                            <ShieldCheck size={20} color="#3b82f6" />
                            Informations Professionnelles
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Rôle / Poste</label>
                                <div style={{...styles.inputWrap, background: 'rgba(255,255,255,0.5)'}}>
                                    <input style={styles.input} value={userData.employeeRole} readOnly />
                                </div>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Site de rattachement</label>
                                <div style={{...styles.inputWrap, background: 'rgba(255,255,255,0.5)'}}>
                                    <input style={styles.input} value={userData.siteLocation} readOnly />
                                </div>
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Compétences clés</label>
                            <div style={{...styles.inputWrap, background: 'rgba(255,255,255,0.5)'}}>
                                <input style={styles.input} value={userData.skills} readOnly />
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {toast && (
                <div style={{...styles.toast, background: toast.type === 'error' ? '#ef4444' : '#1e293b'}}>
                    {toast.message}
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .text-emerald-deep { color: var(--emerald-deep); }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .form-group-input:focus-within {
                    border-color: var(--emerald-deep) !important;
                    background: white !important;
                    box-shadow: 0 4px 12px rgba(46, 125, 110, 0.12) !important;
                    transform: translateY(-1px);
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(46, 125, 110, 0.35);
                    filter: brightness(1.05);
                }
                .btn-secondary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(30, 41, 59, 0.25);
                    filter: brightness(1.1);
                }
            `}</style>
        </div>
    );
}
