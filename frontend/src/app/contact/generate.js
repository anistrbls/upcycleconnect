const fs = require('fs');

const styles = fs.readFileSync('frontend/src/app/contact/page_styles.txt', 'utf8');

const jsx = `
"use client";

import { Leaf, ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
    return (
        <div className="landing-horizon">
            {/* Navbar */}
            <nav className="nav-horizon">
                <div className="nav-inner">
                    <div className="logo-brand">
                        <Leaf size={24} color="#233B3D" />
                        <span className="brand-text">UpcycleConnect</span>
                    </div>
                    <div className="nav-links">
                        <a href="/#about" className="nav-pill">À propos</a>
                        <a href="/#services" className="nav-pill">Services</a>
                        <a href="/contact" className="nav-pill active">Contact</a>
                    </div>
                    <div className="nav-actions">
                        <a href="/login" className="btn-dark-pill">
                            Accéder à l'app <ArrowUpRight size={16} />
                        </a>
                    </div>
                </div>
            </nav>

            <main className="main-container" style={{ minHeight: '80vh', paddingTop: '4rem', paddingBottom: '4rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <span className="pill-badge">Contactez-nous</span>
                        <h1 className="hero-title" style={{ color: 'var(--text-main)', marginTop: '1.5rem', fontSize: 'clamp(2.5rem, 4vw, 3.5rem)' }}>
                            Prêt à transformer votre impact ?
                        </h1>
                        <p className="hero-subtitle" style={{ color: 'var(--text-muted)', margin: '1rem auto 0', maxWidth: '600px' }}>
                            Que vous soyez un artisan cherchant à se développer ou une association voulant simplifier ses collectes, notre équipe est là pour vous accompagner.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '4rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--pill-bg)', padding: '2rem', borderRadius: '24px' }}>
                                <div style={{ width: '50px', height: '50px', background: '#11181C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Mail size={24} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Email</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>hello@upcycleconnect.com</p>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--pill-bg)', padding: '2rem', borderRadius: '24px' }}>
                                <div style={{ width: '50px', height: '50px', background: '#11181C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Phone size={24} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Téléphone</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>+33 1 23 45 67 89</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--pill-bg)', padding: '2rem', borderRadius: '24px' }}>
                                <div style={{ width: '50px', height: '50px', background: '#11181C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MapPin size={24} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>Atelier principal</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>15 Rue de la Transition<br/>75011 Paris</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '32px', padding: '3rem', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Prénom</label>
                                        <input type="text" placeholder="Jean" style={{ padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Nom</label>
                                        <input type="text" placeholder="Dupont" style={{ padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none' }} />
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Email professionnel</label>
                                    <input type="email" placeholder="jean@atelier.com" style={{ padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none' }} />
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Sujet</label>
                                    <select style={{ padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none', background: 'white' }}>
                                        <option>Rejoindre la plateforme</option>
                                        <option>Question technique</option>
                                        <option>Partenariat</option>
                                        <option>Autre</option>
                                    </select>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Message</label>
                                    <textarea rows="5" placeholder="Comment pouvons-nous vous aider ?" style={{ padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', outline: 'none', resize: 'none' }}></textarea>
                                </div>
                                
                                <button type="submit" className="btn-dark-pill-large" style={{ width: '100%', marginTop: '1rem', border: 'none', textAlign: 'center' }}>
                                    Envoyer le message
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer Minimal */}
            <footer className="footer-horizon" style={{ marginTop: '0' }}>
                <div className="footer-inner">
                    <div className="footer-grid" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="footer-brand">
                            <div className="footer-logo">
                                <Leaf size={28} color="white" />
                                <span>UpcycleConnect</span>
                            </div>
                            <p>Le premier écosystème numérique dédié à l'upcycling professionnel.</p>
                        </div>
                    </div>
                    
                    <div className="footer-bottom">
                        <p>&copy; {new Date().getFullYear()} UpcycleConnect. Tous droits réservés.</p>
                        <div className="footer-bottom-links">
                            <a href="#">Mentions légales</a>
                            <a href="#">Confidentialité</a>
                        </div>
                    </div>
                </div>
            </footer>
            
${styles}
`;

fs.writeFileSync('frontend/src/app/contact/page.js', jsx);
