"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, apiUrl } from "../lib/api";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("admin@upcycleconnect.fr");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const existingToken = window.localStorage.getItem(TOKEN_KEY);
        if (!existingToken) {
            return;
        }

        fetch(apiUrl("/auth/me"), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${existingToken}`,
            },
        })
            .then((res) => {
                if (res.ok) {
                    router.replace("/vue-globale/vue-generale");
                }
            })
            .catch(() => { });
    }, [router]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setIsLoading(true);

        const normalizedEmail = email.trim();
        const normalizedPassword = password.trim();

        if (!normalizedEmail || !normalizedPassword) {
            setError("Veuillez renseigner votre email et votre mot de passe.");
            setIsLoading(false);
            return;
        }

        // Basic email sanity check to avoid browser-specific pattern errors.
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            setError("Format d'email invalide.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(apiUrl("/auth/login"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Identifiants invalides");
            }

            window.localStorage.setItem(TOKEN_KEY, data.token);
            router.replace("/vue-globale/vue-generale");
        } catch (err) {
            setError(String(err?.message || "Erreur de connexion"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="login-shell">
            <div className="login-grid">
                <section className="login-visual-panel">
                    <div className="visual-brand-row">
                        <span className="visual-mark">✣</span>
                        <span className="visual-brand-name">UpcycleConnect</span>
                    </div>

                    <div className="visual-copy">
                        <p className="visual-eyebrow">Console de gestion</p>
                        <h2>Pilotez l'ecosysteme UpcycleConnect avec clarte.</h2>
                    </div>
                </section>

                <section className="login-form-panel">
                    <div className="login-form-inner">
                        <div className="star-wrap">
                            <div className="form-star">✶</div>
                        </div>

                        <div className="login-head-block">
                            <h1>Connexion</h1>
                            <p className="login-subtitle">Entrez vos informations pour acceder a votre espace, n'importe ou et a tout moment.</p>
                        </div>

                        <form className="login-form" onSubmit={handleSubmit} noValidate>
                            <div className="form-fields-wrap">
                                <label className="form-label">
                                    Votre email
                                    <input
                                        type="text"
                                        inputMode="email"
                                        placeholder="nom@exemple.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </label>

                                <div className="form-label password-field">
                                    <div className="password-head">
                                        <span className="form-label-text">Mot de passe</span>
                                        <button type="button" className="password-link">Mot de passe oublie ?</button>
                                    </div>

                                    <div className="password-wrap">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                                                <path d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7s-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {error ? <p className="login-error">{error}</p> : null}

                            <div className="submit-wrap">
                                <button className="login-submit" type="submit" disabled={isLoading}>
                                    <span>{isLoading ? "Connexion..." : "Se connecter"}</span>
                                    <svg className="submit-arrow" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            </div>
        </main>
    );
}
