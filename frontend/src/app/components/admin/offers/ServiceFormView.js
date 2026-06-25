"use client";

import { useState, useRef } from "react";
import { 
    Camera, 
    Type, 
    FileText, 
    Tag, 
    Layers, 
    Euro, 
    Clock, 
    Users, 
    Eye, 
    CheckCircle, 
    Info,
    ChevronLeft,
    X,
    Plus
} from "lucide-react";
import { previewLooksLikeVideo } from "../../../lib/mediaUploadLimits";
import { buildServiceFormInitialData, getCoverIndexForService } from "./serviceFormState";

const styles = {
    container: {
        width: "100%",
        padding: "0 2rem 3rem 0",
        animation: "fadeIn 0.5s ease-out",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gap: "2rem",
        alignItems: "start",
    },
    card: {
        background: "var(--surface-hover)",
        borderRadius: "28px",
        padding: "2.5rem",
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
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        marginBottom: "1.5rem",
    },
    label: {
        fontSize: "0.85rem",
        fontWeight: "500",
        color: "var(--text-muted)",
        marginLeft: "0.2rem",
    },
    input: {
        padding: "0.9rem 1.1rem",
        borderRadius: "16px",
        border: "none",
        fontSize: "0.95rem",
        outline: "none",
        transition: "all 0.2s ease",
        background: "#FFFFFF",
        color: "var(--text-main)",
        fontFamily: "inherit",
        width: "100%",
    },
    select: {
        padding: "0.9rem 2.5rem 0.9rem 1.1rem",
        borderRadius: "16px",
        border: "none",
        fontSize: "0.95rem",
        outline: "none",
        transition: "all 0.2s ease",
        background: "#FFFFFF",
        color: "var(--text-main)",
        fontFamily: "inherit",
        width: "100%",
        cursor: "pointer",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234F6163' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 1rem center",
        backgroundSize: "16px",
    },
    textarea: {
        padding: "0.9rem 1.1rem",
        borderRadius: "16px",
        border: "none",
        fontSize: "0.95rem",
        minHeight: "120px",
        outline: "none",
        background: "#FFFFFF",
        color: "var(--text-main)",
        fontFamily: "inherit",
        width: "100%",
        resize: "none",
    },
    photoBox: {
        border: "none",
        borderRadius: "24px",
        padding: "4rem 1.5rem",
        textAlign: "center",
        cursor: "pointer",
        background: "rgba(255, 255, 255, 0.75)",
        transition: "all 0.2s ease",
        color: "var(--text-muted)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
    }
};

export default function ServiceFormView({ categories, employees = [], initialData = null, onSubmit, onCancel, isSaving, externalError = "" }) {
    const isEdit = Boolean(initialData?.id);
    const normalizedInitial = initialData?.id ? buildServiceFormInitialData(initialData) : null;

    const [formState, setFormState] = useState(() => {
        if (normalizedInitial) return normalizedInitial;
        return {
            name: "",
            shortDescription: "",
            description: "",
            categoryId: categories[0] ? String(categories[0].id) : "",
            type: "request",
            price: "0",
            durationMinutes: "60",
            targetAudience: "tous",
            imageUrl: "",
            photos: [],
            status: "brouillon",
            employeeIds: [],
        };
    });
    const [localError, setLocalError] = useState("");
    const [coverIndex, setCoverIndex] = useState(() =>
        normalizedInitial ? getCoverIndexForService(initialData, normalizedInitial.photos) : 0,
    );
    const fileRef = useRef(null);

    const handleFiles = (files) => {
        if (!files || files.length === 0) return;
        const newPhotos = [...formState.photos];
        
        Array.from(files).forEach(file => {
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    setFormState(p => {
                        const updated = [...p.photos, ev.target.result];
                        return { ...p, photos: updated };
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const removePhoto = (index) => {
        setFormState(p => {
            const updated = [...p.photos];
            updated.splice(index, 1);
            return { ...p, photos: updated };
        });
        if (coverIndex === index) setCoverIndex(0);
        else if (coverIndex > index) setCoverIndex(coverIndex - 1);
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        setLocalError("");

        if (!formState.name.trim()) {
            setLocalError("Le nom de la prestation est requis.");
            return;
        }
        if (!formState.categoryId) {
            setLocalError("Une catégorie est obligatoire.");
            return;
        }

        const rawPrice = String(formState.price || "0").replace(",", ".");
        const parsedPrice = Number(rawPrice);
        if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
            setLocalError("Le prix doit être un nombre positif.");
            return;
        }
        if (formState.type === "booking" && (!formState.employeeIds || formState.employeeIds.length === 0)) {
            setLocalError("Sélectionnez au moins un salarié pouvant réaliser cette prestation.");
            return;
        }

        const finalImageUrl = formState.photos.length > 0 ? formState.photos[coverIndex] : "";

        onSubmit({
            ...formState,
            name: formState.name.trim(),
            shortDescription: formState.shortDescription.trim(),
            description: formState.description.trim(),
            price: parsedPrice,
            durationMinutes: Number(formState.durationMinutes) || 60,
            categoryId: Number(formState.categoryId),
            bookingMode: formState.type,
            employeeIds: formState.employeeIds || [],
            imageUrl: finalImageUrl,
            photos: formState.photos,
        });
    };

    const toggleEmployee = (employeeId) => {
        setFormState((prev) => {
            const ids = prev.employeeIds || [];
            const next = ids.includes(employeeId)
                ? ids.filter((id) => id !== employeeId)
                : [...ids, employeeId];
            return { ...prev, employeeIds: next };
        });
    };

    return (
        <div style={styles.container}>
            <div style={styles.grid}>
                {/* Colonne gauche : Formulaire */}
                <div style={{ display: "grid", gap: "2rem" }}>
                    
                    {/* Informations de base */}
                    <div style={styles.card}>
                        <h3 style={styles.sectionTitle}>
                            <Type size={20} /> Informations générales
                        </h3>
                        
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Nom de la prestation *</label>
                            <input
                                type="text"
                                placeholder="Ex: Atelier couture créative"
                                value={formState.name}
                                onChange={(e) => setFormState(p => ({ ...p, name: e.target.value }))}
                                style={styles.input}
                                required
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Description courte</label>
                                <input
                                    type="text"
                                    placeholder="En quelques mots (catalogue)..."
                                    value={formState.shortDescription}
                                    onChange={(e) => setFormState(p => ({ ...p, shortDescription: e.target.value }))}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Catégorie *</label>
                                <select
                                    value={formState.categoryId}
                                    onChange={(e) => setFormState(p => ({ ...p, categoryId: e.target.value }))}
                                    style={styles.select}
                                    required
                                >
                                    <option value="">Choisir une catégorie</option>
                                    {categories.map((item) => (
                                        <option key={item.id} value={String(item.id)} data-i18n-user-content="true">{item.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Description standard</label>
                            <textarea
                                placeholder="Présentez brièvement votre prestation..."
                                value={formState.description}
                                onChange={(e) => setFormState(p => ({ ...p, description: e.target.value }))}
                                style={styles.textarea}
                            />
                        </div>

                    </div>

                    {/* Paramètres et Tarifs */}
                    <div style={styles.card}>
                        <h3 style={styles.sectionTitle}>
                            <Layers size={20} /> Paramètres & Tarifs
                        </h3>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Mode de fonctionnement</label>
                                <select
                                    value={formState.type}
                                    onChange={(e) => setFormState(p => ({ ...p, type: e.target.value }))}
                                    style={styles.select}
                                >
                                    <option value="request">Demande simple</option>
                                    <option value="booking">Réservation avec créneau</option>
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Prix (€)</label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formState.price}
                                        onChange={(e) => setFormState(p => ({ ...p, price: e.target.value }))}
                                        style={styles.input}
                                    />
                                    <Euro size={16} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                </div>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Durée (minutes)</label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type="number"
                                        min="0"
                                        step="15"
                                        value={formState.durationMinutes}
                                        onChange={(e) => setFormState(p => ({ ...p, durationMinutes: e.target.value }))}
                                        style={styles.input}
                                    />
                                    <Clock size={16} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Public cible</label>
                                <select
                                    value={formState.targetAudience}
                                    onChange={(e) => setFormState(p => ({ ...p, targetAudience: e.target.value }))}
                                    style={styles.select}
                                >
                                    <option value="tous">Tous (Particuliers & Pros)</option>
                                    <option value="particulier">Particuliers uniquement</option>
                                    <option value="professionnel">Professionnels uniquement</option>
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>{isEdit ? "Statut" : "Statut initial"}</label>
                                <select
                                    value={formState.status}
                                    onChange={(e) => setFormState(p => ({ ...p, status: e.target.value }))}
                                    style={styles.select}
                                >
                                    <option value="brouillon">Brouillon</option>
                                    <option value="actif">Actif</option>
                                    <option value="inactif">Inactif</option>
                                </select>
                            </div>
                        </div>

                        {formState.type === "booking" ? (
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Salariés habilités *</label>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 0.75rem 0.2rem" }}>
                                    Ces salariés pourront être choisis par le client lors de la réservation.
                                </p>
                                {employees.length === 0 ? (
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                                        Aucun salarié enregistré. Créez des comptes salarié dans l&apos;administration.
                                    </p>
                                ) : (
                                    <div style={{ display: "grid", gap: "0.5rem" }}>
                                        {employees.map((emp) => {
                                            const empId = Number(emp.id);
                                            const checked = (formState.employeeIds || []).includes(empId);
                                            const label = [emp.firstname, emp.lastname].filter(Boolean).join(" ") || emp.email || `Salarié #${empId}`;
                                            return (
                                                <label
                                                    key={empId}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.75rem",
                                                        padding: "0.85rem 1rem",
                                                        borderRadius: "14px",
                                                        background: checked ? "rgba(198, 255, 0, 0.25)" : "#FFFFFF",
                                                        cursor: "pointer",
                                                        fontSize: "0.92rem",
                                                        fontWeight: checked ? 600 : 500,
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleEmployee(empId)}
                                                    />
                                                    {label}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Colonne droite : Médias & Actions */}
                <div style={{ display: "grid", gap: "2rem" }}>
                    <div style={styles.card}>
                        <h3 style={styles.sectionTitle}>
                            <Camera size={20} /> Médias ({formState.photos.length}/10)
                        </h3>
                        
                        <div style={{ display: "grid", gap: "1rem" }}>
                            {formState.photos.length > 0 && (
                                <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", border: "none" }}>
                                    <img src={formState.photos[coverIndex]} alt="Couverture" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "0.75rem", padding: "6px", textAlign: "center", fontWeight: 600 }}>PHOTO DE COUVERTURE</div>
                                </div>
                            )}

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "0.75rem" }}>
                                {formState.photos.map((url, idx) => (
                                    <div key={idx} style={{ position: "relative", aspectRatio: "1/1", borderRadius: "12px", overflow: "hidden", border: coverIndex === idx ? "2px solid var(--black)" : "none", cursor: "pointer" }} onClick={() => setCoverIndex(idx)}>
                                        <img src={url} alt={`Photo ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); removePhoto(idx); }} 
                                            style={{ 
                                                position: "absolute", 
                                                top: "4px", 
                                                right: "4px", 
                                                background: "rgba(0,0,0,0.5)", 
                                                color: "#fff", 
                                                border: "none", 
                                                borderRadius: "50%", 
                                                width: "20px", 
                                                height: "20px", 
                                                display: "flex", 
                                                alignItems: "center", 
                                                justifyContent: "center", 
                                                cursor: "pointer"
                                            }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {formState.photos.length < 10 && (
                                    <div
                                        onClick={() => fileRef.current?.click()}
                                        style={{ aspectRatio: "1/1", borderRadius: "12px", border: "2px dashed #d0d8da", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", background: "#fff" }}
                                    >
                                        <Plus size={24} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {formState.photos.length === 0 && (
                            <div
                                onClick={() => fileRef.current?.click()}
                                style={{ ...styles.photoBox, marginTop: "1rem" }}
                            >
                                <Camera size={32} strokeWidth={1.5} />
                                <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>Ajouter des photos</div>
                                <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Jusqu'à 10 photos</div>
                            </div>
                        )}
                        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
                    </div>

                    <div style={styles.card}>
                        <h3 style={styles.sectionTitle}>
                            <Info size={20} /> Aide
                        </h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                            Cliquez sur une miniature pour la définir comme photo de couverture principale.
                        </p>
                    </div>

                    {(localError || externalError) && (
                        <div style={{ padding: "1rem", background: "#FFE8E8", color: "#8B2020", borderRadius: "16px", fontSize: "0.85rem", fontWeight: 500 }}>
                            {localError || externalError}
                        </div>
                    )}

                    <div style={{ display: "grid", gap: "0.75rem" }}>
                        <button 
                            className="action-cta task-action-btn" 
                            type="button" 
                            onClick={handleSubmit} 
                            disabled={isSaving} 
                            style={{ padding: "1.1rem", borderRadius: "20px", fontSize: "1rem" }}
                        >
                            {isSaving ? "Enregistrement..." : (isEdit ? "Enregistrer les modifications" : "Publier la prestation")}
                        </button>
                        <button
                            className="action-cta"
                            type="button"
                            onClick={onCancel}
                            style={{ background: "#FFFFFF", color: "var(--text-main)", padding: "1.1rem", borderRadius: "20px", fontSize: "1rem", border: "none" }}
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
