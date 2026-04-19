"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiUrl, fetchWithTimeout } from "../lib/api";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SiretStatus({ feedback }) {
    if (feedback.kind === "idle") return null;

    const classMap = {
        loading: "signup-siret-status--loading",
        success: "signup-siret-status--ok",
        warning: "signup-siret-status--warn",
        error: "signup-siret-status--err",
    };

    const text =
        feedback.kind === "loading"
            ? "Vérification auprès de l'INSEE…"
            : feedback.kind === "success"
              ? `✓ ${feedback.message}`
              : feedback.message;

    return (
        <p className={`signup-siret-status ${classMap[feedback.kind] ?? ""}`}>
            {text}
        </p>
    );
}

export default function InscriptionPage() {
    const router = useRouter();

    const [role, setRole] = useState("particulier");
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [companyManager, setCompanyManager] = useState("");
    const [siret, setSiret] = useState("");
    const [address, setAddress] = useState("");
    const [zipCode, setZipCode] = useState("");
    const [activityType, setActivityType] = useState("");
    const [interventionZone, setInterventionZone] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [siretFeedback, setSiretFeedback] = useState({ kind: "idle", message: "" });
    // Ensemble des champs pré-remplis depuis le SIRET (non modifiables)
    const [lockedFields, setLockedFields] = useState(new Set());

    const clearApiFields = useCallback((locked) => {
        if (locked.has("companyName")) setCompanyName("");
        if (locked.has("address")) setAddress("");
        if (locked.has("zipCode")) setZipCode("");
    }, []);

    const validateSiretRemote = useCallback(async (raw) => {
        const clean = raw.replace(/\s/g, "");
        if (clean.length !== 14 || !/^\d{14}$/.test(clean)) {
            setSiretFeedback({ kind: "idle", message: "" });
            return;
        }
        setSiretFeedback({ kind: "loading", message: "" });
        try {
            const res = await fetchWithTimeout(
                `${apiUrl("/siret/validate")}?siret=${encodeURIComponent(clean)}`,
                { method: "GET" },
                15000,
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setSiretFeedback({ kind: "error", message: data.error || "Vérification indisponible." });
                return;
            }
            if (data.configured === false) {
                setSiretFeedback({ kind: "warning", message: "Validation non disponible sur le serveur." });
                return;
            }
            if (data.valid) {
                // Injecte les champs retournés par l'API et les verrouille
                const locked = new Set();
                if (data.denomination) { setCompanyName(data.denomination); locked.add("companyName"); }
                if (data.address)      { setAddress(data.address);           locked.add("address"); }
                if (data.zipCode)      { setZipCode(data.zipCode);           locked.add("zipCode"); }
                setLockedFields(locked);
                setSiretFeedback({ kind: "success", message: data.denomination || "Numéro reconnu." });
            } else {
                setSiretFeedback({ kind: "error", message: data.error || "SIRET invalide." });
            }
        } catch {
            setSiretFeedback({ kind: "idle", message: "" });
        }
    }, []);

    // Quand le SIRET change, on déverrouille et efface les champs pré-remplis par l'API
    useEffect(() => {
        setLockedFields((prev) => {
            if (prev.size > 0) clearApiFields(prev);
            return new Set();
        });
        setSiretFeedback({ kind: "idle", message: "" });
    }, [siret, clearApiFields]);

    useEffect(() => {
        if (role !== "professionnel") {
            setSiretFeedback({ kind: "idle", message: "" });
            setLockedFields((prev) => { clearApiFields(prev); return new Set(); });
            return;
        }
        const t = setTimeout(() => validateSiretRemote(siret), 600);
        return () => clearTimeout(t);
    }, [siret, role, validateSiretRemote, clearApiFields]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!firstname.trim() || !lastname.trim()) {
            setError("Prénom et nom sont obligatoires.");
            return;
        }
        if (!emailRegex.test(email.trim())) {
            setError("Format d'email invalide.");
            return;
        }
        if (password.length < 8) {
            setError("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }
        if (password !== password2) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }
        if (role === "professionnel") {
            const clean = siret.replace(/\s/g, "");
            if (clean.length !== 14 || !/^\d{14}$/.test(clean)) {
                setError("Le SIRET doit contenir exactement 14 chiffres.");
                return;
            }
        }

        const payload = {
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            email: email.trim(),
            password,
            role,
            phone: phone.trim(),
            city: city.trim(),
            companyName: role === "professionnel" ? companyName.trim() : "",
            companyManager: role === "professionnel" ? companyManager.trim() : "",
            siret: role === "professionnel" ? siret.replace(/\s/g, "") : "",
            address: role === "professionnel" ? address.trim() : "",
            zipCode: role === "professionnel" ? zipCode.trim() : "",
            activityType: role === "professionnel" ? activityType : "",
            interventionZone: role === "professionnel" ? interventionZone.trim() : "",
        };

        setIsLoading(true);
        try {
            const response = await fetchWithTimeout(
                apiUrl("/auth/register"),
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
                20000,
            );
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Inscription impossible");
            setSuccess(data.message || "Compte créé.");
            if (data.user?.role === "particulier" && data.user?.status === "active") {
                setTimeout(() => router.push("/login"), 2200);
            }
        } catch (err) {
            setError(
                err?.name === "AbortError"
                    ? "Le serveur met trop de temps à répondre."
                    : String(err?.message || "Erreur d'inscription"),
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="login-shell">
            <div className="login-grid">
                {/* Panneau visuel gauche */}
                <section className="login-visual-panel">
                    <div className="signup-visual-decor" aria-hidden="true">
                        <span className="visual-orb visual-orb-a" />
                        <span className="visual-orb visual-orb-b" />
                        <span className="visual-orb visual-orb-c" />
                    </div>
                    <div className="visual-brand-row">
                        <span className="visual-mark">✣</span>
                        <span className="visual-brand-name">UpcycleConnect</span>
                    </div>
                    <div className="visual-copy">
                        <p className="visual-eyebrow">Créer un compte</p>
                        <h2>Rejoignez une communauté engagée pour donner une seconde vie aux matériaux.</h2>
                    </div>
                </section>

                {/* Panneau formulaire droit */}
                <section className="login-form-panel">
                    <div className="login-form-inner signup-form-inner">
                        <div className="star-wrap">
                            <div className="form-star">✶</div>
                        </div>

                        <header className="login-head-block">
                            <h1>Inscription</h1>
                            <p className="login-subtitle">
                                Quelques informations suffisent pour accéder à la plateforme.
                                Les champs marqués d&apos;un astérisque sont obligatoires.
                            </p>
                        </header>

                        <form className="login-form" onSubmit={handleSubmit} noValidate>
                            <div className="form-fields-wrap signup-form-fields">

                                {/* Type de compte */}
                                <section className="signup-section" aria-labelledby="signup-type-label">
                                    <h2 id="signup-type-label" className="signup-section-title">
                                        Type de compte
                                    </h2>
                                    <div
                                        className="signup-role-toggle"
                                        role="radiogroup"
                                        aria-label="Type de compte"
                                    >
                                        <button
                                            type="button"
                                            className="signup-role-btn"
                                            aria-pressed={role === "particulier"}
                                            onClick={() => setRole("particulier")}
                                        >
                                            Particulier
                                        </button>
                                        <button
                                            type="button"
                                            className="signup-role-btn"
                                            aria-pressed={role === "professionnel"}
                                            onClick={() => setRole("professionnel")}
                                        >
                                            Professionnel
                                        </button>
                                    </div>
                                </section>

                                {/* Identité */}
                                <section className="signup-section" aria-labelledby="signup-identity-label">
                                    <h2 id="signup-identity-label" className="signup-section-title">
                                        Identité
                                    </h2>
                                    <div className="signup-field-row">
                                        <label className="form-label">
                                            Prénom *
                                            <input
                                                type="text"
                                                value={firstname}
                                                onChange={(e) => setFirstname(e.target.value)}
                                                required
                                                autoComplete="given-name"
                                            />
                                        </label>
                                        <label className="form-label">
                                            Nom *
                                            <input
                                                type="text"
                                                value={lastname}
                                                onChange={(e) => setLastname(e.target.value)}
                                                required
                                                autoComplete="family-name"
                                            />
                                        </label>
                                    </div>
                                </section>

                                {/* Coordonnées */}
                                <section className="signup-section" aria-labelledby="signup-contact-label">
                                    <h2 id="signup-contact-label" className="signup-section-title">
                                        Coordonnées
                                    </h2>
                                    <label className="form-label">
                                        Adresse e-mail *
                                        <input
                                            type="text"
                                            inputMode="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                            placeholder="vous@exemple.fr"
                                        />
                                    </label>
                                    <div className="signup-field-row">
                                        <label className="form-label">
                                            Téléphone
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                autoComplete="tel"
                                                placeholder="Optionnel"
                                            />
                                        </label>
                                        <label className="form-label">
                                            Ville
                                            <input
                                                type="text"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                                autoComplete="address-level2"
                                                placeholder="Optionnel"
                                            />
                                        </label>
                                    </div>
                                </section>

                                {/* Entreprise — professionnel uniquement */}
                                {role === "professionnel" && (
                                    <section
                                        className="signup-section"
                                        aria-labelledby="signup-company-label"
                                    >
                                        <h2 id="signup-company-label" className="signup-section-title">
                                            Entreprise
                                        </h2>
                                        <div className="signup-pro-card">
                                            <p className="signup-pro-lead">
                                                Entrez votre numéro SIRET — les informations de votre
                                                entreprise seront renseignées automatiquement.
                                            </p>
                                            <label className="form-label">
                                                SIRET (14 chiffres) *
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={siret}
                                                    onChange={(e) =>
                                                        setSiret(e.target.value.replace(/[^\d\s]/g, ""))
                                                    }
                                                    required
                                                    placeholder="732 829 320 00074"
                                                    aria-describedby="siret-status"
                                                />
                                                <div id="siret-status" role="region" aria-live="polite">
                                                    <SiretStatus feedback={siretFeedback} />
                                                </div>
                                            </label>
                                            <div className="signup-field-row">
                                                <label className="form-label">
                                                    Raison sociale
                                                    <input
                                                        type="text"
                                                        value={companyName}
                                                        onChange={(e) => !lockedFields.has("companyName") && setCompanyName(e.target.value)}
                                                        readOnly={lockedFields.has("companyName")}
                                                        className={lockedFields.has("companyName") ? "signup-input--locked" : ""}
                                                        autoComplete="organization"
                                                        placeholder="Les Ateliers du Réemploi"
                                                    />
                                                </label>
                                                <label className="form-label">
                                                    Nom du responsable
                                                    <input
                                                        type="text"
                                                        value={companyManager}
                                                        onChange={(e) => setCompanyManager(e.target.value)}
                                                        placeholder="Jean Martin"
                                                    />
                                                </label>
                                            </div>
                                            <label className="form-label">
                                                Adresse
                                                <input
                                                    type="text"
                                                    value={address}
                                                    onChange={(e) => !lockedFields.has("address") && setAddress(e.target.value)}
                                                    readOnly={lockedFields.has("address")}
                                                    className={lockedFields.has("address") ? "signup-input--locked" : ""}
                                                    autoComplete="street-address"
                                                    placeholder="12 rue de la Paix"
                                                />
                                            </label>
                                            <div className="signup-field-row">
                                                <label className="form-label">
                                                    Code postal
                                                    <input
                                                        type="text"
                                                        value={zipCode}
                                                        onChange={(e) => !lockedFields.has("zipCode") && setZipCode(e.target.value)}
                                                        readOnly={lockedFields.has("zipCode")}
                                                        className={lockedFields.has("zipCode") ? "signup-input--locked" : ""}
                                                        autoComplete="postal-code"
                                                        placeholder="75001"
                                                    />
                                                </label>
                                                <label className="form-label">
                                                    Type d&apos;activité
                                                    <select
                                                        value={activityType}
                                                        onChange={(e) => setActivityType(e.target.value)}
                                                        className="signup-select"
                                                    >
                                                        <option value="">Sélectionner…</option>
                                                        <option value="recyclage">Recyclage</option>
                                                        <option value="upcycling">Upcycling</option>
                                                        <option value="vente">Vente</option>
                                                        <option value="artisanat">Artisanat</option>
                                                        <option value="autre">Autre</option>
                                                    </select>
                                                </label>
                                            </div>
                                            <label className="form-label">
                                                Zone d&apos;intervention
                                                <input
                                                    type="text"
                                                    value={interventionZone}
                                                    onChange={(e) => setInterventionZone(e.target.value)}
                                                    placeholder="Île-de-France, Paris intra muros… (optionnel)"
                                                />
                                            </label>
                                        </div>
                                    </section>
                                )}

                                {/* Sécurité */}
                                <section className="signup-section" aria-labelledby="signup-pwd-label">
                                    <h2 id="signup-pwd-label" className="signup-section-title">
                                        Sécurité
                                    </h2>
                                    <div className="form-label password-field">
                                        <span className="form-label-text">
                                            Mot de passe * (min. 8 caractères)
                                        </span>
                                        <div className="password-wrap">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle"
                                                onClick={() => setShowPassword((v) => !v)}
                                                aria-label={
                                                    showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                                                }
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                                                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7s-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <label className="form-label">
                                        Confirmer le mot de passe *
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password2}
                                            onChange={(e) => setPassword2(e.target.value)}
                                            required
                                            autoComplete="new-password"
                                        />
                                    </label>
                                </section>
                            </div>

                            {error && (
                                <div className="signup-alert signup-alert--error" role="alert">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="signup-alert signup-alert--success" role="status">
                                    {success}
                                </div>
                            )}

                            <div className="submit-wrap">
                                <button className="login-submit" type="submit" disabled={isLoading}>
                                    <span>{isLoading ? "Création du compte…" : "Créer mon compte"}</span>
                                    <svg
                                        className="submit-arrow"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </button>
                            </div>

                            <p className="signup-footer">
                                Déjà un compte ?{" "}
                                <Link href="/login">Se connecter</Link>
                            </p>
                        </form>
                    </div>
                </section>
            </div>
        </main>
    );
}
