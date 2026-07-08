"use client";
import "./landing.css";

import { ArrowRight, Leaf, Recycle, MapPin, Calendar, Hammer, Users, HeartHandshake, ShieldCheck, Instagram, Facebook, Twitter, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";

export default function HomePage() {
    const [scrolled, setScrolled] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const serviceSlides = [
        {
            image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=800&auto=format&fit=crop",
            badge: "Accès Pro",
            title: "Espace de vente dédié.",
            text: "Entrez dans un espace construit pour les acteurs du réemploi — pour grandir, collaborer, et prospérer."
        },
        {
            image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=800&auto=format&fit=crop",
            badge: "Communauté",
            title: "Réseau d'artisans.",
            text: "Connectez-vous avec des centaines de professionnels partageant les mêmes valeurs écologiques et développez votre activité."
        },
        {
            image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=800&auto=format&fit=crop",
            badge: "Logistique",
            title: "Gestion des stocks.",
            text: "Suivez l'état de vos matériaux en temps réel pour optimiser vos créations artisanales et réduire vos pertes nettes."
        }
    ];

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % serviceSlides.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + serviceSlides.length) % serviceSlides.length);

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
                        <a href="/#services" className="nav-pill" data-i18n-skip="true">Services</a>
                        <a href="/contact" className="nav-pill">Contact</a>
                    </div>
                    <div className="nav-actions">
                        <a href="/login" className="btn-dark-pill">
                            Accéder à l'app <ArrowUpRight size={16} />
                        </a>
                    </div>
                </div>
            </nav>

            <main className="main-container">
                {/* Hero Section */}
                <section className="hero-horizon">
                    {/* Background image overlay */}
                    <div className="hero-bg" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?q=80&w=2000&auto=format&fit=crop')" }}></div>
                    <div className="hero-overlay"></div>
                    
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Donnez une seconde vie<br />aux objets. Centralisez tout.
                        </h1>
                        <p className="hero-subtitle">
                            Rejoignez l'écosystème ultime de l'upcycling — où la passion rencontre la gestion professionnelle, et chaque action vous rapproche du zéro déchet.
                        </p>
                        
                        <div className="hero-actions-container">
                            <a href="/login" className="btn-dark-pill-large">
                                Commencer votre transition
                            </a>
                            
                            <div className="hero-social-proof">
                                <div className="avatars-stack">
                                    <div className="avatar" style={{backgroundImage: "url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop')"}}></div>
                                    <div className="avatar" style={{backgroundImage: "url('https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop')"}}></div>
                                    <div className="avatar" style={{backgroundImage: "url('https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop')"}}></div>
                                </div>
                                <div className="proof-text">
                                    <span>Rejoignez +500 professionnels</span>
                                    <span className="proof-sub">Artisans et associations</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="hero-bottom-right">
                        <a href="#">Instagram <span className="link-arrow">↗</span></a>
                        <a href="#">Facebook <span className="link-arrow">↗</span></a>
                        <a href="#">Tik Tok <span className="link-arrow">↗</span></a>
                    </div>
                </section>

                {/* About Section */}
                <section id="about" className="about-horizon">
                    <div className="about-left">
                        <span className="pill-badge">À propos d'UpcycleConnect</span>
                    </div>
                    <div className="about-right">
                        <p>
                            Chez UpcycleConnect, nous ne nous contentons pas de recycler — nous valorisons. Depuis notre création, notre plateforme est devenue la maison des professionnels de l'économie circulaire, des associations aux artisans chevronnés.
                        </p>
                    </div>
                </section>

                {/* Bento Grid */}
                <section className="bento-horizon">
                    {/* Card 1: Dark */}
                    <div className="bento-card card-dark">
                        <div className="card-top-icon"><Recycle size={28} /></div>
                        <h3>
                            Outils de gestion professionnels <br/><span className="text-muted">avec suivi financier et modération — </span>
                            gérez dans de <span className="text-white">parfaites conditions</span>, en toute saison.
                        </h3>
                        <div className="card-bottom-toggle">
                            <div className="toggle-switch">
                                <div className="toggle-knob"></div>
                            </div>
                            <span>Mode Pro</span>
                        </div>
                    </div>
                    
                    {/* Card 2: Image */}
                    <div className="bento-card card-image" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800&auto=format&fit=crop')" }}>
                        <div className="card-image-overlay">
                            <span className="pill-badge-blur">Ateliers & Formations</span>
                        </div>
                    </div>
                    
                    {/* Card 3: Light Stats */}
                    <div className="bento-card card-light">
                        <h2 className="huge-number">500+</h2>
                        <h4>Artisans certifiés</h4>
                        <p className="small-text">Des professionnels prêts à transformer vos matériaux bruts en créations uniques.</p>
                        
                        <div className="levels-list">
                            <div className="level-row">
                                <span className="level-name">Bois</span>
                                <div className="level-dots">
                                    <span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot"></span>
                                </div>
                                <span className="level-num">55</span>
                            </div>
                            <div className="level-row">
                                <span className="level-name">Textile</span>
                                <div className="level-dots">
                                    <span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot"></span><span className="dot"></span>
                                </div>
                                <span className="level-num">40</span>
                            </div>
                            <div className="level-row">
                                <span className="level-name">Métal</span>
                                <div className="level-dots">
                                    <span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot fill"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span>
                                </div>
                                <span className="level-num">35</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stats Row */}
                <section id="impact" className="stats-horizon">
                    <h3 className="stats-title">Quelques faits supplémentaires en chiffres</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <h4>12 000+</h4>
                            <p>Kg de matériaux sauvés</p>
                        </div>
                        <div className="stat-item">
                            <h4>89%</h4>
                            <p>Taux de réemploi</p>
                        </div>
                        <div className="stat-item">
                            <h4>1,200+</h4>
                            <p>Membres actifs</p>
                        </div>
                        <div className="stat-item">
                            <h4>125+</h4>
                            <p>Ateliers annuels</p>
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section id="services" className="services-horizon">
                    <div className="services-left">
                        <span className="pill-badge">Services</span>
                        <h2>Explorez notre gamme complète d'outils, formations, et expériences de réemploi. De la collecte à la vente — nous avons le programme qu'il vous faut.</h2>
                        <a href="/login" className="btn-dark-pill">
                            Explorer Plus <ArrowUpRight size={16} />
                        </a>
                    </div>
                    
                    <div className="services-right">
                        <div className="service-card large" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=80&w=800&auto=format&fit=crop')" }}>
                            <span className="pill-badge-blur top-left">Dons & Collectes</span>
                            <div className="service-card-bottom">
                                <p>Programmes conçus pour toutes les structures.</p>
                                <div className="arrow-circle"><ArrowUpRight size={16} color="white"/></div>
                            </div>
                        </div>
                        
                        <div className="service-card-col">
                            <div className="service-card small" style={{ backgroundImage: `url('${serviceSlides[currentSlide].image}')`, transition: 'background-image 0.4s ease' }}>
                                <span className="pill-badge-blur top-left">{serviceSlides[currentSlide].badge}</span>
                                <div className="service-card-bottom">
                                    <p>{serviceSlides[currentSlide].title}</p>
                                </div>
                            </div>
                            <div className="service-text-block">
                                <p>{serviceSlides[currentSlide].text}</p>
                                <div className="nav-arrows">
                                    <button className="nav-arrow left" onClick={prevSlide}>←</button>
                                    <button className="nav-arrow right" onClick={nextSlide}>→</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer Premium Minimal */}
            <footer className="footer-horizon">
                <div className="footer-inner">
                    <div className="footer-grid" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="footer-brand">
                            <div className="footer-logo">
                                <Leaf size={28} color="white" />
                                <span>UpcycleConnect</span>
                            </div>
                            <p>Le premier écosystème numérique dédié à l'upcycling professionnel.</p>
                        </div>
                        
                        <div className="footer-col" style={{ alignItems: 'flex-end' }}>
                            <a href="/contact" className="btn-dark-pill" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                                Nous contacter
                            </a>
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

            
        </div>
    );
}
