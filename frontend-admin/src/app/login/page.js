"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const TOKEN_KEY = "uc_admin_token";

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

        fetch(`${API_URL}/api/auth/me`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${existingToken}`,
            },
        })
            .then((res) => {
                if (res.ok) {
                    router.replace("/");
                }
            })
            .catch(() => {});
    }, [router]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Identifiants invalides");
            }

            window.localStorage.setItem(TOKEN_KEY, data.token);
            router.replace("/");
        } catch (err) {
            setError(err.message || "Erreur de connexion");
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

                    <div className="visual-orb visual-orb-a"></div>
                    <div className="visual-orb visual-orb-b"></div>
                    <div className="visual-orb visual-orb-c"></div>

                    <div className="visual-copy">
                        <p className="visual-eyebrow">Console de gestion</p>
                        <h2>Pilotez l'ecosysteme UpcycleConnect avec clarte.</h2>
                    </div>
                </section>

                <section className="login-form-panel">
                    <div className="form-star">✶</div>
                    <h1>Connexion</h1>
                    <p className="login-subtitle">Accedez a l'espace administrateur UpcycleConnect en toute securite.</p>

                    <form className="login-form" onSubmit={handleSubmit}>
                        <label className="form-label">
                            Votre email
                            <input
                                type="email"
                                placeholder="nom@exemple.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </label>

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
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.43 8.6 7.18 6 12 6s8.57 2.6 9.94 5.65a1 1 0 0 1 0 .7C20.57 15.4 16.82 18 12 18s-8.57-2.6-9.94-5.65z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </button>
                        </div>

                        {error ? <p className="login-error">{error}</p> : null}

                        <button className="login-submit" type="submit" disabled={isLoading}>
                            {isLoading ? "Connexion..." : "Se connecter"}
                        </button>
                    </form>
                </section>
            </div>
        </main>
    );
}
