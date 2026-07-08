"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, Sparkles, ArrowUpCircle } from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { fieldStyle, labelStyle } from "../../../lib/styles";

const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

const centsToEuroStr = (cents) => (Number(cents) / 100).toFixed(2).replace(".", ",");
const euroStrToCents = (str) => {
    const n = parseFloat(String(str).replace(",", ".").trim());
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};

const formatDays = (n) => `${n || 0} jour${Number(n) > 1 ? "s" : ""}`;

const innerCard = {
    background: "#fff",
    borderRadius: "22px",
    padding: "1.35rem 1.5rem",
    boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
};

const groupTitle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "var(--text-main)",
    marginBottom: "1rem",
};

const fieldRow = {
    display: "flex",
    flexWrap: "wrap",
    gap: "1.25rem",
    marginBottom: "0.25rem",
};

const fieldCol = {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
    flex: "1 1 180px",
    minWidth: "160px",
};

export default function BoostPricingAdminView() {
    const [form, setForm] = useState({
        itemFeaturePriceCents: "4,99",
        itemBumpPriceCents: "1,49",
        projectFeaturePriceCents: "4,99",
        projectBumpPriceCents: "1,49",
        featureDurationDays: "7",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [toast, setToast] = useState(null);

    const load = useCallback(async (opts = { quiet: false }) => {
        const quiet = opts.quiet === true;
        if (!quiet) setLoading(true);
        setLoadError(null);
        try {
            const res = await fetch(apiUrl("/admin/finances/boost-pricing"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error("Impossible de charger");
            const data = await res.json();
            setForm({
                itemFeaturePriceCents: centsToEuroStr(data.itemFeaturePriceCents),
                itemBumpPriceCents: centsToEuroStr(data.itemBumpPriceCents),
                projectFeaturePriceCents: centsToEuroStr(data.projectFeaturePriceCents),
                projectBumpPriceCents: centsToEuroStr(data.projectBumpPriceCents),
                featureDurationDays: String(data.featureDurationDays),
            });
        } catch (e) {
            setLoadError(e.message || "Erreur");
        } finally {
            if (!quiet) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!toast) return undefined;
        const ms = toast.type === "error" ? 4500 : 3500;
        const t = window.setTimeout(() => setToast(null), ms);
        return () => window.clearTimeout(t);
    }, [toast]);

    const setField = (key) => (e) => {
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
        setToast(null);
    };

    const save = async () => {
        const itemFeaturePriceCents = euroStrToCents(form.itemFeaturePriceCents);
        const itemBumpPriceCents = euroStrToCents(form.itemBumpPriceCents);
        const projectFeaturePriceCents = euroStrToCents(form.projectFeaturePriceCents);
        const projectBumpPriceCents = euroStrToCents(form.projectBumpPriceCents);
        const featureDurationDays = parseInt(form.featureDurationDays, 10);

        if ([itemFeaturePriceCents, itemBumpPriceCents, projectFeaturePriceCents, projectBumpPriceCents].some(
            (v) => !Number.isFinite(v) || v <= 0
        )) {
            setToast({ type: "error", msg: "Indiquez des tarifs valides et positifs (ex: 4,99)." });
            return;
        }
        if (!Number.isFinite(featureDurationDays) || featureDurationDays <= 0 || featureDurationDays > 90) {
            setToast({ type: "error", msg: "La durée de mise à la une doit être comprise entre 1 et 90 jours." });
            return;
        }

        setSaving(true);
        setToast(null);
        try {
            const res = await fetch(apiUrl("/admin/finances/boost-pricing"), {
                method: "PUT",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    itemFeaturePriceCents,
                    itemBumpPriceCents,
                    projectFeaturePriceCents,
                    projectBumpPriceCents,
                    featureDurationDays,
                }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || "refused");
            }
            await load({ quiet: true });
            setToast({ type: "success", msg: "Les tarifs ont bien été enregistrés." });
        } catch {
            setToast({
                type: "error",
                msg: "Un problème est survenu lors de l'enregistrement. Réessayez dans un instant.",
            });
        } finally {
            setSaving(false);
        }
    };

    const toastSurface = {
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        color: "white",
        padding: "1rem 1.5rem",
        borderRadius: "16px",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        zIndex: 9999,
        maxWidth: "min(420px, calc(100vw - 2.5rem))",
    };

    return (
        <>
            <div style={{ width: "100%", padding: "0 0 2rem" }}>
                <div className="header-section">
                    <div className="title-area">
                        <span className="activities-label">Administration</span>
                        <h1>Mise en avant des annonces et projets</h1>
                        <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.55, color: "var(--text-muted)" }}>
                            Définissez les tarifs et la durée des options payantes « Mise à la une » et « Remonter » proposées
                            aux utilisateurs sur leurs annonces et leurs projets d&apos;upcycling.
                        </p>
                    </div>
                </div>

                <div className="panel" style={{ padding: "clamp(1.25rem, 2.5vw, 2rem)", marginTop: "1.5rem" }}>
                    {loading ? (
                        <div style={{ padding: "4rem", textAlign: "center" }}>
                            <div className="loading-spinner" style={{ margin: "0 auto 1rem" }} />
                            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Chargement…</p>
                        </div>
                    ) : loadError ? (
                        <div style={{ padding: "3rem", textAlign: "center" }}>
                            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>{loadError}</p>
                            <button type="button" className="action-cta task-action-btn" onClick={load}>
                                Réessayer
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            <div style={innerCard}>
                                <p style={groupTitle}>
                                    <Sparkles size={16} />
                                    Annonces d&apos;objets
                                </p>
                                <div style={fieldRow}>
                                    <div style={fieldCol}>
                                        <label style={labelStyle}>Mise à la une (€)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={form.itemFeaturePriceCents}
                                            onChange={setField("itemFeaturePriceCents")}
                                            style={{ ...fieldStyle, fontWeight: 600 }}
                                        />
                                    </div>
                                    <div style={fieldCol}>
                                        <label style={labelStyle}>Remonter l&apos;annonce (€)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={form.itemBumpPriceCents}
                                            onChange={setField("itemBumpPriceCents")}
                                            style={{ ...fieldStyle, fontWeight: 600 }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={innerCard}>
                                <p style={groupTitle}>
                                    <ArrowUpCircle size={16} />
                                    Projets d&apos;upcycling
                                </p>
                                <div style={fieldRow}>
                                    <div style={fieldCol}>
                                        <label style={labelStyle}>Mise à la une (€)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={form.projectFeaturePriceCents}
                                            onChange={setField("projectFeaturePriceCents")}
                                            style={{ ...fieldStyle, fontWeight: 600 }}
                                        />
                                    </div>
                                    <div style={fieldCol}>
                                        <label style={labelStyle}>Remonter le projet (€)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={form.projectBumpPriceCents}
                                            onChange={setField("projectBumpPriceCents")}
                                            style={{ ...fieldStyle, fontWeight: 600 }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={innerCard}>
                                <p style={groupTitle}>Durée de la mise à la une</p>
                                <div style={fieldRow}>
                                    <div style={fieldCol}>
                                        <label style={labelStyle}>Nombre de jours</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={form.featureDurationDays}
                                            onChange={setField("featureDurationDays")}
                                            style={{ ...fieldStyle, fontWeight: 600, maxWidth: "140px" }}
                                        />
                                    </div>
                                </div>
                                <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                    S&apos;applique aux deux options « Mise à la une » (annonces et projets). L&apos;option
                                    « Remonter » n&apos;a pas de durée : elle rafraîchit juste la position dans la liste.
                                </p>
                            </div>

                            <div>
                                <button
                                    type="button"
                                    className="action-cta task-action-btn"
                                    onClick={save}
                                    disabled={saving}
                                    style={{ opacity: saving ? 0.65 : 1 }}
                                >
                                    {saving ? "Enregistrement…" : "Enregistrer"}
                                </button>
                            </div>

                            <div style={{ ...innerCard, background: "var(--surface-hover)" }}>
                                <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                                    Aperçu
                                </span>
                                <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem", color: "var(--text-main)" }}>
                                    Annonce à la une : <strong>{fmt(euroStrToCents(form.itemFeaturePriceCents) / 100 || 0)}</strong> pendant{" "}
                                    <strong>{formatDays(form.featureDurationDays)}</strong>
                                </p>
                                <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem", color: "var(--text-main)" }}>
                                    Remonter une annonce : <strong>{fmt(euroStrToCents(form.itemBumpPriceCents) / 100 || 0)}</strong>
                                </p>
                                <p style={{ margin: "0 0 0.35rem", fontSize: "0.9rem", color: "var(--text-main)" }}>
                                    Projet à la une : <strong>{fmt(euroStrToCents(form.projectFeaturePriceCents) / 100 || 0)}</strong> pendant{" "}
                                    <strong>{formatDays(form.featureDurationDays)}</strong>
                                </p>
                                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-main)" }}>
                                    Remonter un projet : <strong>{fmt(euroStrToCents(form.projectBumpPriceCents) / 100 || 0)}</strong>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {toast && (
                <div
                    role={toast.type === "error" ? "alert" : "status"}
                    aria-live="polite"
                    style={{
                        ...toastSurface,
                        background: toast.type === "error" ? "var(--state-critical)" : "var(--black)",
                    }}
                >
                    {toast.type === "error" ? (
                        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", padding: "2px", display: "flex", flexShrink: 0 }}>
                            <AlertCircle size={16} color="white" aria-hidden />
                        </div>
                    ) : (
                        <div style={{ background: "var(--green-leaf)", borderRadius: "50%", padding: "2px", display: "flex", flexShrink: 0 }}>
                            <Check size={16} color="var(--black)" aria-hidden />
                        </div>
                    )}
                    <span style={{ fontWeight: 500, fontSize: "0.95rem", lineHeight: 1.35 }}>{toast.msg}</span>
                </div>
            )}

            <style jsx>{`
                .loading-spinner {
                    width: 30px;
                    height: 30px;
                    border: 3px solid var(--border);
                    border-top-color: var(--forest-deep);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </>
    );
}
