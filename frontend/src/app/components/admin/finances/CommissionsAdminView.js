"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../../lib/api";
import { fieldStyle, labelStyle } from "../../../lib/styles";

const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

const pageWrap = {
    width: "100%",
    maxWidth: "none",
    margin: 0,
    padding: "0 0 2rem",
};

const innerCard = {
    background: "#fff",
    borderRadius: "22px",
    padding: "1.35rem 1.5rem",
    boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
};

const modeCardBase = {
    textAlign: "left",
    border: "2px solid transparent",
    borderRadius: "20px",
    padding: "1.1rem 1.2rem",
    cursor: "pointer",
    transition: "border-color 0.18s, box-shadow 0.18s, transform 0.15s",
    background: "rgba(255,255,255,0.92)",
    display: "flex",
    flexDirection: "column",
    gap: "0.45rem",
    width: "100%",
    font: "inherit",
    color: "inherit",
};

export default function CommissionsAdminView() {
    const [percent, setPercent] = useState("");
    const [mode, setMode] = useState("deducted");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState(null);
    /** Toast bas-droite (même style que mes-annonces / configuration). */
    const [toast, setToast] = useState(null);

    const load = useCallback(async (opts = { quiet: false }) => {
        const quiet = opts.quiet === true;
        if (!quiet) setLoading(true);
        setLoadError(null);
        try {
            const res = await fetch(apiUrl("/admin/finances/sale-commission"), { headers: buildAuthHeaders() });
            if (!res.ok) throw new Error("Impossible de charger");
            const data = await res.json();
            const p = typeof data.percent === "number" ? data.percent : parseFloat(String(data.percent));
            setPercent(Number.isFinite(p) ? String(p).replace(".", ",") : "0");
            setMode(data.mode === "added" ? "added" : "deducted");
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

    const parsePct = () => {
        const n = parseFloat(String(percent).replace(",", ".").trim());
        return Number.isFinite(n) ? n : NaN;
    };

    const save = async () => {
        const n = parsePct();
        if (!Number.isFinite(n) || n < 0 || n > 100) {
            setToast({
                type: "error",
                msg: "Indiquez un pourcentage valide entre 0 et 100 %.",
            });
            return;
        }
        setSaving(true);
        setToast(null);
        try {
            const res = await fetch(apiUrl("/admin/finances/sale-commission"), {
                method: "PUT",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ percent: n, mode }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || "refused");
            }
            await load({ quiet: true });
            setToast({
                type: "success",
                msg: "Les paramètres ont bien été enregistrés.",
            });
        } catch {
            setToast({
                type: "error",
                msg: "Un problème est survenu lors de l'enregistrement. Réessayez dans un instant.",
            });
        } finally {
            setSaving(false);
        }
    };

    const rate = parsePct();
    const exBase = 100;
    const exFee = Number.isFinite(rate) ? Math.round(exBase * (rate / 100) * 100) / 100 : 0;
    const exBuyer = mode === "added" ? exBase + exFee : exBase;
    const exSeller = mode === "added" ? exBase : exBase - exFee;

    const modeCardStyle = (active) => ({
        ...modeCardBase,
        borderColor: active ? "var(--text-main)" : "rgba(0,0,0,0.06)",
        boxShadow: active ? "0 8px 28px rgba(0,0,0,0.08)" : "0 2px 12px rgba(0,0,0,0.04)",
        transform: active ? "translateY(-1px)" : "none",
    });

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
            <div style={pageWrap}>
            <div className="header-section commissions-header">
                <div className="title-area">
                    <span className="activities-label">Administration</span>
                    <h1>Commissions sur les ventes d&apos;annonces</h1>
                    <p className="commissions-lede">
                        Définissez comment la plateforme prélève sa commission sur les paiements Stripe des annonces
                        logistiques. Les changements s&apos;appliquent aux nouvelles réservations.
                    </p>
                </div>
            </div>

            <div className="panel commissions-panel">
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
                    <div className="commissions-layout">
                        <div className="commissions-main">
                            <p style={{ ...labelStyle, marginBottom: "0.75rem", letterSpacing: "0.02em" }}>Mode de facturation</p>
                            <div className="mode-grid">
                                <button
                                    type="button"
                                    style={modeCardStyle(mode === "deducted")}
                                    onClick={() => {
                                        setMode("deducted");
                                        setToast(null);
                                    }}
                                    aria-pressed={mode === "deducted"}
                                >
                                    <span className="mode-card-title">Sur le prix encaissé</span>
                                    <span className="mode-card-desc">
                                        La commission est déduite du montant perçu par le vendeur. L&apos;acheteur paie le
                                        prix affiché sur l&apos;annonce.
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    style={modeCardStyle(mode === "added")}
                                    onClick={() => {
                                        setMode("added");
                                        setToast(null);
                                    }}
                                    aria-pressed={mode === "added"}
                                >
                                    <span className="mode-card-title">En plus pour l&apos;acheteur</span>
                                    <span className="mode-card-desc">
                                        Le prix Stripe inclut l&apos;annonce plus la commission. Le vendeur reçoit le prix
                                        affiché, la plateforme prélève sa part sur la transaction.
                                    </span>
                                </button>
                            </div>

                            <div style={{ ...innerCard, marginTop: "1.5rem" }}>
                                <label style={{ ...labelStyle, display: "block", marginBottom: 0 }}>
                                    Taux de commission (%)
                                    <div className="rate-row">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={percent}
                                            onChange={(e) => {
                                                setPercent(e.target.value);
                                                setToast(null);
                                            }}
                                            placeholder="0"
                                            style={{ ...fieldStyle, flex: "0 1 140px", minWidth: "100px", fontWeight: 600 }}
                                        />
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
                                </label>
                            </div>
                        </div>

                        <aside className="commissions-aside">
                            <div className="preview-card">
                                <span className="preview-kicker">Aperçu (exemple {fmt(exBase)})</span>
                                <div className="preview-block">
                                    <span className="preview-label">Commission plateforme</span>
                                    <span className="preview-value accent">
                                        {Number.isFinite(rate) ? fmt(exFee) : "—"}
                                    </span>
                                </div>
                                <div className="preview-divider" />
                                <div className="preview-buyer-seller">
                                    <div className="preview-block">
                                        <span className="preview-label">Total payé par l&apos;acheteur</span>
                                        <span className="preview-value">{Number.isFinite(rate) ? fmt(exBuyer) : "—"}</span>
                                        <span className="preview-hint">
                                            {mode === "added"
                                                ? "Prix annonce + commission"
                                                : "Égal au prix annonce affiché"}
                                        </span>
                                    </div>
                                    <div className="preview-vs" aria-hidden="true" />
                                    <div className="preview-block">
                                        <span className="preview-label">Total reçu par le vendeur</span>
                                        <span className="preview-value">{Number.isFinite(rate) ? fmt(exSeller) : "—"}</span>
                                        <span className="preview-hint">
                                            {mode === "added"
                                                ? "Égal au prix annonce affiché"
                                                : "Après déduction de la commission"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
            </div>

            {toast && (
                <div
                    className="commissions-toast"
                    role={toast.type === "error" ? "alert" : "status"}
                    aria-live="polite"
                    style={{
                        ...toastSurface,
                        background: toast.type === "error" ? "var(--state-critical)" : "var(--black)",
                    }}
                >
                {toast.type === "error" ? (
                    <div
                        style={{
                            background: "rgba(255,255,255,0.2)",
                            borderRadius: "50%",
                            padding: "2px",
                            display: "flex",
                            flexShrink: 0,
                        }}
                    >
                        <AlertCircle size={16} color="white" aria-hidden />
                    </div>
                ) : (
                    <div
                        style={{
                            background: "var(--green-leaf)",
                            borderRadius: "50%",
                            padding: "2px",
                            display: "flex",
                            flexShrink: 0,
                        }}
                    >
                        <Check size={16} color="var(--black)" aria-hidden />
                    </div>
                )}
                <span style={{ fontWeight: 500, fontSize: "0.95rem", lineHeight: 1.35 }}>{toast.msg}</span>
                </div>
            )}

            <style jsx>{`
                .commissions-toast {
                    animation: commissionsToastSlide 0.3s ease-out;
                }
                .commissions-header :global(.title-area h1) {
                    margin-bottom: 0.65rem;
                }
                .commissions-lede {
                    margin: 0;
                    max-width: none;
                    font-size: 0.95rem;
                    line-height: 1.55;
                    color: var(--text-muted);
                    font-weight: 400;
                }
                .commissions-panel {
                    padding: clamp(1.25rem, 2.5vw, 2rem);
                }
                .commissions-layout {
                    display: grid;
                    gap: 1.75rem;
                    align-items: start;
                }
                @media (min-width: 900px) {
                    .commissions-layout {
                        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
                        gap: 2rem;
                    }
                    .commissions-aside {
                        position: sticky;
                        top: 5.5rem;
                    }
                }
                .mode-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 0.85rem;
                }
                @media (min-width: 640px) {
                    .mode-grid {
                        grid-template-columns: 1fr 1fr;
                        gap: 1rem;
                    }
                }
                .mode-card-title {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--text-main);
                }
                .mode-card-desc {
                    font-size: 0.8rem;
                    line-height: 1.45;
                    color: var(--text-muted);
                }
                .rate-row {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 0.85rem;
                    margin-top: 0.55rem;
                }
                @keyframes commissionsToastSlide {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .preview-card {
                    background: var(--surface-hover);
                    border-radius: 22px;
                    padding: 1.35rem 1.4rem;
                    border: 1px solid var(--border);
                }
                .preview-kicker {
                    display: block;
                    font-size: 0.72rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: var(--text-muted);
                    margin-bottom: 1.1rem;
                }
                .preview-block {
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                }
                .preview-label {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .preview-value {
                    font-size: 1.55rem;
                    font-weight: 600;
                    letter-spacing: -0.02em;
                    color: var(--text-main);
                }
                .preview-value.accent {
                    color: var(--forest-deep);
                }
                .preview-hint {
                    font-size: 0.78rem;
                    color: var(--text-muted);
                }
                .preview-divider {
                    height: 1px;
                    background: var(--border);
                    margin: 1.1rem 0;
                    opacity: 0.85;
                }
                .preview-buyer-seller {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
                    gap: 0.75rem 1rem;
                    align-items: start;
                }
                .preview-vs {
                    width: 1px;
                    align-self: stretch;
                    min-height: 3.5rem;
                    background: var(--border);
                    opacity: 0.85;
                    justify-self: center;
                }
                @media (max-width: 520px) {
                    .preview-buyer-seller {
                        grid-template-columns: 1fr;
                    }
                    .preview-vs {
                        display: none;
                    }
                }
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
