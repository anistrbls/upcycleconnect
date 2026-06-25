"use client";

import { useMemo } from "react";
import createQr from "../../lib/vendor/qrcode-generator.js";

/** Chaîne encodée dans le QR (identique à la saisie manuelle attendue). */
export function normalizeDepositCodeForQr(code) {
    return String(code ?? "").trim();
}

function codeToSvgHtml(value, pixelSize, purpose) {
    try {
        const qr = createQr(0, "M");
        qr.addData(value, "Byte");
        qr.make();
        const n = qr.getModuleCount();
        const margin = 2;
        const inner = Math.max(48, pixelSize - margin * 2 - 4);
        const cellSize = Math.max(2, Math.floor(inner / n));
        const altLabel = purpose === "pickup" ? "Code récupération" : "Code dépôt";
        const svg = qr.createSvgTag({
            cellSize,
            margin,
            scalable: true,
            alt: { text: `${altLabel} ${value}` },
        });
        // Force the SVG to fill its container — without explicit dimensions the
        // scalable SVG collapses to 0px height inside a flex/inline-flex parent.
        return svg.replace("<svg ", `<svg style="width:100%;height:auto;display:block;" `);
    } catch (e) {
        console.warn("[DepositCodeQrPanel] QR generation failed:", e);
        return "";
    }
}

/**
 * Affichage principal : QR code + code alphanumérique en secours.
 * Génération SVG locale (vendor MIT).
 * @param {"light" | "darkCard"} variant — darkCard : logistique admin (pas de texte « particulier »).
 * @param {"deposit" | "pickup"} purpose — texte d’aide (vue light) et libellé d’accessibilité du QR.
 */
export default function DepositCodeQrPanel({
    code,
    expiresText,
    qrSize = 196,
    variant = "light",
    purpose = "deposit",
}) {
    const value = normalizeDepositCodeForQr(code);
    const svgHtml = useMemo(
        () => (value ? codeToSvgHtml(value, qrSize, purpose) : ""),
        [value, qrSize, purpose],
    );

    if (!value) return null;

    const dark = variant === "darkCard";

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: dark ? "0.4rem" : "0.55rem",
                width: "100%",
            }}
        >
            <div
                style={{
                    padding: dark ? "0.4rem" : "0.55rem",
                    background: "#fff",
                    borderRadius: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(0,0,0,0.08)",
                    lineHeight: 0,
                    maxWidth: `${qrSize}px`,
                    width: "100%",
                }}
                dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
            {variant !== "darkCard" ? (
                <p
                    style={{
                        margin: 0,
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        textAlign: "center",
                        maxWidth: "34ch",
                        lineHeight: 1.4,
                    }}
                >
                    {purpose === "pickup"
                        ? "Présentez ce QR au point de retrait. Si le scan ne fonctionne pas, communiquez le code ci-dessous."
                        : "Présentez ce QR au point de dépôt. Si le scan ne fonctionne pas, communiquez le code ci-dessous."}
                </p>
            ) : null}
            <div
                style={{
                    fontSize: dark ? "0.95rem" : "1.22rem",
                    fontWeight: 800,
                    letterSpacing: dark ? "0.08em" : "0.12em",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    color: dark ? "#fff" : "var(--text-main)",
                    textAlign: "center",
                    wordBreak: "break-all",
                }}
            >
                {value}
            </div>
            {expiresText ? (
                <div
                    style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: dark ? "#fecaca" : "var(--state-critical)",
                        textAlign: "center",
                    }}
                >
                    {expiresText}
                </div>
            ) : null}
        </div>
    );
}
