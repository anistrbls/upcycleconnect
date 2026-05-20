"use client";

import { useState } from "react";
import ConseilFormSections from "./ConseilFormSections";

const S = {
    container: { width: "100%", padding: "1rem 2rem 3rem 0", animation: "fadeIn 0.5s ease-out" },
    grid: { display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem", alignItems: "start" },
    card: { background: "var(--surface-hover)", borderRadius: "28px", padding: "2rem", marginBottom: "1.5rem" },
    btnPrimary: { padding: "0.75rem 1.5rem", borderRadius: "20px", border: "none", background: "var(--black)", color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", width: "100%" },
    btnSecondary: { padding: "0.6rem 1.25rem", borderRadius: "20px", border: "none", background: "#e8ecee", color: "var(--text-main)", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", width: "100%", marginTop: "0.65rem" },
    errorBox: { padding: "0.75rem 1rem", borderRadius: "14px", background: "#FDE8E8", color: "#B24A4A", fontSize: "0.83rem", marginTop: "0.75rem" },
};

const IconChevronLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);

/**
 * Page formulaire conseil (création ou édition).
 * @param {"admin"|"salarie"} mode
 */
export default function ConseilFormPage({
    mode = "admin",
    editingItem = null,
    formState,
    setFormState,
    authorName = "",
    isSaving = false,
    localError = "",
    onAdminSubmit,
    onSalarieSubmit,
    onCancel,
}) {
    const isAdmin = mode === "admin";
    const breadcrumb = isAdmin ? "Conseils" : "Espace salarié · Conseils";
    const title = editingItem
        ? "Modifier le conseil"
        : (isAdmin ? "Créer un conseil" : "Partager un conseil");

    return (
        <div className="conseil-form" style={S.container}>
            <div style={{ marginBottom: "2rem" }}>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem", padding: 0 }}
                >
                    <IconChevronLeft /> Retour
                </button>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>{breadcrumb}</span>
                <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>{title}</h1>
            </div>

            {isAdmin ? (
                <form onSubmit={onAdminSubmit}>
                    <FormLayout
                        formState={formState}
                        setFormState={setFormState}
                        isAdmin
                        authorName={authorName}
                        localError={localError}
                        isSaving={isSaving}
                        editingItem={editingItem}
                        onCancel={onCancel}
                    />
                </form>
            ) : (
                <form onSubmit={(e) => { e.preventDefault(); onSalarieSubmit("en_attente"); }}>
                    <FormLayout
                        formState={formState}
                        setFormState={setFormState}
                        isAdmin={false}
                        authorName={authorName}
                        localError={localError}
                        isSaving={isSaving}
                        editingItem={editingItem}
                        onCancel={onCancel}
                        onSalarieDraft={() => onSalarieSubmit("brouillon")}
                    />
                </form>
            )}
        </div>
    );
}

function FormLayout({
    formState,
    setFormState,
    isAdmin,
    authorName,
    localError,
    isSaving,
    editingItem,
    onCancel,
    onSalarieDraft,
}) {
    return (
        <div style={S.grid}>
            <div>
                <ConseilFormSections formState={formState} setFormState={setFormState} isAdmin={isAdmin} authorName={authorName} />
                {localError && <div style={S.errorBox}>{localError}</div>}
            </div>
            <div style={{ position: "sticky", top: "1rem" }}>
                <div style={S.card}>
                    {isAdmin ? (
                        <>
                            <button type="submit" disabled={isSaving} style={S.btnPrimary}>
                                {isSaving ? "Enregistrement…" : editingItem ? "Mettre à jour" : "Créer le conseil"}
                            </button>
                            <button type="button" onClick={onCancel} style={S.btnSecondary}>Annuler</button>
                        </>
                    ) : (
                        <>
                            <button type="submit" disabled={isSaving} style={S.btnPrimary}>
                                {isSaving ? "Envoi…" : "Soumettre à validation"}
                            </button>
                            <button type="button" disabled={isSaving} onClick={onSalarieDraft} style={S.btnSecondary}>
                                {isSaving ? "Enregistrement…" : "Enregistrer en brouillon"}
                            </button>
                            <button type="button" onClick={onCancel} style={{ ...S.btnSecondary, marginTop: "0.4rem" }}>Annuler</button>
                        </>
                    )}
                </div>
                <div style={{ ...S.card, background: isAdmin ? "#E5FFBC" : "#EAF4FF", marginTop: 0 }}>
                    <p style={{ fontSize: "0.83rem", color: isAdmin ? "#166534" : "#1e4976", margin: 0, lineHeight: 1.55 }}>
                        {isAdmin
                            ? "En tant qu'admin, vous pouvez publier directement un conseil sans validation."
                            : "Votre conseil sera relu par un administrateur avant d'être publié dans le feed."}
                    </p>
                </div>
            </div>
        </div>
    );
}
