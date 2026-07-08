"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Inbox, Loader2, RefreshCw, Send, UserCheck, X } from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../lib/api";

const MAX_SUPPORT_IMAGES = 4;
const MAX_SUPPORT_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const SUPPORT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORT_TEAM_ROLES = new Set(["admin", "salarie", "salarié", "moderateur", "modérateur", "moderator"]);
const PROFESSIONAL_ROLES = new Set(["professionnel", "professional", "pro"]);
const INDIVIDUAL_ROLES = new Set(["particulier", "individual"]);

const normalizeRole = (value) => String(value || "").trim().toLowerCase();

const statusLabel = (status) => {
    if (status === "resolved") return "Résolu";
    if (status === "in_progress") return "En cours";
    return "Ouvert";
};

const isProfessionalConversation = (conversation) => {
    const role = normalizeRole(conversation?.userRole);
    if (PROFESSIONAL_ROLES.has(role)) return true;
    if (INDIVIDUAL_ROLES.has(role)) return false;

    const subscriptionName = String(conversation?.subscriptionName || "").trim();
    const subscriptionKey = String(conversation?.subscriptionKey || "").trim();
    const subscriptionPrice = Number(conversation?.subscriptionPriceEuro ?? 0);
    const priority = Number(conversation?.supportPriority ?? 0);

    return Boolean(subscriptionName || subscriptionKey) || subscriptionPrice > 0 || priority > 0;
};

const supportPriority = (conversation) => {
    const value = Number(conversation?.supportPriority ?? conversation?.subscriptionPriceEuro ?? 0);
    return Number.isFinite(value) ? value : 0;
};

const hasPaidSubscription = (conversation) => isProfessionalConversation(conversation) && supportPriority(conversation) > 0;

const formatSubscriptionLabel = (conversation) => {
    if (!isProfessionalConversation(conversation)) return "";
    const name = String(conversation?.subscriptionName || conversation?.subscriptionKey || "Découverte").trim();
    const price = Number(conversation?.subscriptionPriceEuro ?? 0);
    if (Number.isFinite(price) && price > 0) return `${name} · ${price} €/mois`;
    return name;
};

const conversationUpdatedTime = (conversation) => {
    const time = new Date(conversation?.updatedAt || conversation?.lastMessageAt || conversation?.createdAt || 0).getTime();
    return Number.isFinite(time) ? time : 0;
};

const compareSupportConversations = (a, b) => {
    const aPro = isProfessionalConversation(a);
    const bPro = isProfessionalConversation(b);
    if (aPro !== bPro) return aPro ? -1 : 1;

    if (aPro && bPro) {
        const aPaid = hasPaidSubscription(a);
        const bPaid = hasPaidSubscription(b);
        if (aPaid !== bPaid) return aPaid ? -1 : 1;

        const priorityDiff = supportPriority(b) - supportPriority(a);
        if (priorityDiff !== 0) return priorityDiff;
    }

    return conversationUpdatedTime(b) - conversationUpdatedTime(a);
};

const formatTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const readImageAsDataURL = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Impossible de lire l'image."));
        reader.readAsDataURL(file);
    });

const readSupportImages = async (fileList, existingCount = 0) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return [];
    if (existingCount + files.length > MAX_SUPPORT_IMAGES) {
        throw new Error(`Maximum ${MAX_SUPPORT_IMAGES} images par message.`);
    }

    const images = [];
    for (const file of files) {
        if (!SUPPORT_IMAGE_TYPES.has(file.type)) {
            throw new Error("Format non supporté. Utilisez JPG, PNG ou WEBP.");
        }
        if (file.size > MAX_SUPPORT_IMAGE_BYTES) {
            throw new Error("Image trop volumineuse (max 5 MB).");
        }
        images.push(await readImageAsDataURL(file));
    }
    return images;
};

function SupportMessage({ message, onImageOpen }) {
    const senderRole = String(message.senderRole || "").trim().toLowerCase();
    const isTeamSender = SUPPORT_TEAM_ROLES.has(senderRole);
    const senderLabel = isTeamSender ? "UpcycleConnect Team" : message.senderName;
    const images = Array.isArray(message.images) ? message.images : [];

    return (
        <div className={`support-admin-message ${isTeamSender ? "team" : ""}`}>
            <div className="support-admin-message-meta">
                <span data-i18n-user-content={isTeamSender ? undefined : "true"}>{senderLabel}</span>
                <span>{formatTime(message.createdAt)}</span>
            </div>
            {message.body && <p data-i18n-user-content="true">{message.body}</p>}
            {images.length > 0 && (
                <div className="support-admin-images">
                    {images.map((src, index) => (
                        <button type="button" key={`${src.slice(0, 32)}-${index}`} onClick={() => onImageOpen(src)} aria-label="Agrandir l'image">
                            <img src={src} alt="Image partagée" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ImagePreviewStrip({ images, onRemove, onImageOpen }) {
    if (!Array.isArray(images) || images.length === 0) return null;

    return (
        <div className="support-admin-previews" aria-label="Images à envoyer">
            {images.map((src, index) => (
                <div className="support-admin-preview" key={`${src.slice(0, 32)}-${index}`}>
                    <button type="button" onClick={() => onImageOpen(src)} aria-label="Agrandir l'image">
                        <img src={src} alt="Image à envoyer" />
                    </button>
                    <button type="button" className="support-admin-preview-remove" onClick={() => onRemove(index)} aria-label="Supprimer l'image">
                        <X size={13} />
                    </button>
                </div>
            ))}
        </div>
    );
}

function SupportConversationCard({ item, isSelected, onSelect }) {
    const isPro = isProfessionalConversation(item);
    const paid = hasPaidSubscription(item);
    const subscriptionLabel = formatSubscriptionLabel(item);

    return (
        <button
            type="button"
            className={`support-admin-conversation ${isSelected ? "active" : ""} ${paid ? "priority" : ""}`}
            onClick={onSelect}
        >
            <span className="support-admin-conversation-top">
                <strong data-i18n-user-content="true">{item.subject}</strong>
                <small>{formatTime(item.updatedAt)}</small>
            </span>
            <span className="support-admin-conversation-user">
                <span data-i18n-user-content="true">{item.userName || item.userEmail}</span>
                {isPro && subscriptionLabel && <span className={`support-admin-plan-badge ${paid ? "priority" : ""}`}>{subscriptionLabel}</span>}
            </span>
            <span className="support-admin-conversation-bottom">
                <small>{statusLabel(item.status)}</small>
                <span>
                    {paid && <small className="support-admin-priority-label">Prioritaire</small>}
                    <small>{item.messageCount} message{item.messageCount > 1 ? "s" : ""}</small>
                </span>
            </span>
        </button>
    );
}

export default function SupportAdminView() {
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [statusFilter, setStatusFilter] = useState("active");
    const [loadingList, setLoadingList] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [message, setMessage] = useState("");
    const [pendingImages, setPendingImages] = useState([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [lightboxImage, setLightboxImage] = useState("");

    const loadConversations = useCallback(async () => {
        setError("");
        setLoadingList(true);
        try {
            const res = await fetch(apiUrl("/support/conversations"), {
                headers: buildAuthHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Impossible de charger l'assistance.");
            const items = data.conversations || [];
            setConversations(items);
            setSelectedId((current) => {
                if (current && items.some((item) => Number(item.id) === Number(current))) return current;
                return items[0]?.id || null;
            });
        } catch (err) {
            setError(err.message || "Impossible de charger l'assistance.");
        } finally {
            setLoadingList(false);
        }
    }, []);

    const loadDetail = useCallback(async (id, { silent = false } = {}) => {
        if (!id) {
            setDetail(null);
            return;
        }
        if (!silent) setLoadingDetail(true);
        try {
            const res = await fetch(apiUrl(`/support/conversations/${id}`), {
                headers: buildAuthHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Impossible de charger la conversation.");
            setDetail(data);
        } catch (err) {
            if (!silent) setError(err.message || "Impossible de charger la conversation.");
        } finally {
            if (!silent) setLoadingDetail(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    useEffect(() => {
        loadDetail(selectedId);
        if (!selectedId) return undefined;
        const timer = setInterval(() => loadDetail(selectedId, { silent: true }), 10000);
        return () => clearInterval(timer);
    }, [selectedId, loadDetail]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [detail?.messages?.length]);

    useEffect(() => {
        if (!lightboxImage) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") setLightboxImage("");
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [lightboxImage]);

    const visibleConversations = useMemo(() => {
        const filtered = statusFilter === "all"
            ? conversations
            : statusFilter === "active"
                ? conversations.filter((item) => item.status !== "resolved")
                : conversations.filter((item) => item.status === statusFilter);
        return [...filtered].sort(compareSupportConversations);
    }, [conversations, statusFilter]);

    const professionalConversations = useMemo(
        () => visibleConversations.filter((item) => isProfessionalConversation(item)),
        [visibleConversations]
    );
    const individualConversations = useMemo(
        () => visibleConversations.filter((item) => !isProfessionalConversation(item)),
        [visibleConversations]
    );
    const selectedConversation = detail?.conversation || conversations.find((item) => Number(item.id) === Number(selectedId));
    const messages = detail?.messages || [];
    const selectedSubscriptionLabel = formatSubscriptionLabel(selectedConversation);
    const selectedIsPro = isProfessionalConversation(selectedConversation);
    const selectedIsPriority = hasPaidSubscription(selectedConversation);

    const addImages = async (files) => {
        try {
            const images = await readSupportImages(files, pendingImages.length);
            setPendingImages((prev) => [...prev, ...images]);
        } catch (err) {
            setError(err.message || "Impossible d'ajouter l'image.");
        }
    };

    const updateConversation = async (status, assignToMe = false) => {
        if (!selectedId) return;
        setError("");
        try {
            const res = await fetch(apiUrl(`/support/conversations/${selectedId}`), {
                method: "PATCH",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ status, assignToMe }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Impossible de mettre à jour la conversation.");
            setDetail(data);
            await loadConversations();
        } catch (err) {
            setError(err.message || "Impossible de mettre à jour la conversation.");
        }
    };

    const sendMessage = async (event) => {
        event.preventDefault();
        if (!selectedId || (!message.trim() && pendingImages.length === 0)) return;
        setSending(true);
        setError("");
        try {
            const res = await fetch(apiUrl(`/support/conversations/${selectedId}/messages`), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ message, images: pendingImages }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Impossible d'envoyer le message.");
            setMessage("");
            setPendingImages([]);
            setDetail(data);
            await loadConversations();
        } catch (err) {
            setError(err.message || "Impossible d'envoyer le message.");
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="support-admin-page">
            <header className="support-admin-heading">
                <div>
                    <p>File support</p>
                    <h1>Conversations d'assistance</h1>
                    <span>Traiter les demandes privées envoyées depuis le widget d'assistance.</span>
                </div>
                <button type="button" className="support-admin-secondary" onClick={loadConversations}>
                    <RefreshCw size={17} />
                    Actualiser
                </button>
            </header>

            {error && <div className="support-admin-error">{error}</div>}

            <div className="support-admin-grid">
                <aside className="support-admin-list-panel">
                    <div className="support-admin-filter-row">
                        {[
                            ["active", "Ouvert"],
                            ["all", "Tous"],
                            ["in_progress", "En cours"],
                            ["resolved", "Résolu"],
                        ].map(([value, label]) => (
                            <button key={value} type="button" className={statusFilter === value ? "active" : ""} onClick={() => setStatusFilter(value)}>
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="support-admin-conversation-list">
                        {loadingList ? (
                            <div className="support-admin-empty">
                                <Loader2 className="support-admin-spin" />
                                Chargement des conversations...
                            </div>
                        ) : visibleConversations.length === 0 ? (
                            <div className="support-admin-empty">
                                <Inbox size={28} />
                                Aucune demande pour le moment.
                            </div>
                        ) : (
                            <>
                                <section className="support-admin-conversation-section">
                                    <div className="support-admin-section-title">
                                        <span>Professionnels</span>
                                        <small>{professionalConversations.length}</small>
                                    </div>
                                    <p>Les abonnements payants sont triés par priorité.</p>
                                    {professionalConversations.length === 0 ? (
                                        <div className="support-admin-section-empty">Aucune demande professionnelle.</div>
                                    ) : (
                                        professionalConversations.map((item) => (
                                            <SupportConversationCard
                                                key={item.id}
                                                item={item}
                                                isSelected={Number(item.id) === Number(selectedId)}
                                                onSelect={() => setSelectedId(item.id)}
                                            />
                                        ))
                                    )}
                                </section>

                                <section className="support-admin-conversation-section">
                                    <div className="support-admin-section-title">
                                        <span>Particuliers</span>
                                        <small>{individualConversations.length}</small>
                                    </div>
                                    {individualConversations.length === 0 ? (
                                        <div className="support-admin-section-empty">Aucune demande particulier.</div>
                                    ) : (
                                        individualConversations.map((item) => (
                                            <SupportConversationCard
                                                key={item.id}
                                                item={item}
                                                isSelected={Number(item.id) === Number(selectedId)}
                                                onSelect={() => setSelectedId(item.id)}
                                            />
                                        ))
                                    )}
                                </section>
                            </>
                        )}
                    </div>
                </aside>

                <section className="support-admin-thread-panel">
                    {!selectedConversation ? (
                        <div className="support-admin-empty support-admin-empty-large">
                            <Inbox size={34} />
                            Sélectionnez une conversation.
                        </div>
                    ) : (
                        <>
                            <header className="support-admin-thread-head">
                                <div>
                                    <p>{statusLabel(selectedConversation.status)}</p>
                                    <h2 data-i18n-user-content="true">{selectedConversation.subject}</h2>
                                    <span className="support-admin-thread-user-line">
                                        <span data-i18n-user-content="true">{selectedConversation.userName || selectedConversation.userEmail}</span>
                                        {selectedIsPro && selectedSubscriptionLabel && (
                                            <span className={`support-admin-plan-badge ${selectedIsPriority ? "priority" : ""}`}>
                                                {selectedSubscriptionLabel}
                                            </span>
                                        )}
                                        {selectedIsPriority && <span className="support-admin-priority-label">Prioritaire</span>}
                                    </span>
                                </div>
                                <div className="support-admin-thread-actions">
                                    <button type="button" className="support-admin-secondary" onClick={() => updateConversation("in_progress", true)}>
                                        <UserCheck size={16} />
                                        Prendre en charge
                                    </button>
                                    {selectedConversation.status === "resolved" ? (
                                        <button type="button" className="support-admin-secondary" onClick={() => updateConversation("open")}>
                                            Rouvrir
                                        </button>
                                    ) : (
                                        <button type="button" className="support-admin-primary" onClick={() => updateConversation("resolved")}>
                                            <CheckCircle2 size={16} />
                                            Résoudre
                                        </button>
                                    )}
                                </div>
                            </header>

                            <div className="support-admin-thread">
                                {loadingDetail ? (
                                    <div className="support-admin-empty">
                                        <Loader2 className="support-admin-spin" />
                                        Chargement des messages...
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="support-admin-empty">Aucun message.</div>
                                ) : (
                                    messages.map((item) => (
                                        <SupportMessage key={item.id} message={item} onImageOpen={setLightboxImage} />
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="support-admin-composer" onSubmit={sendMessage}>
                                <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Écrire un message..." rows={3} />
                                <ImagePreviewStrip images={pendingImages} onRemove={(index) => setPendingImages((prev) => prev.filter((_, i) => i !== index))} onImageOpen={setLightboxImage} />
                                <div className="support-admin-compose-actions">
                                    <button type="button" className="support-admin-icon-button" onClick={() => fileInputRef.current?.click()} aria-label="Joindre une image">
                                        <ImagePlus size={18} />
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={SUPPORT_IMAGE_ACCEPT}
                                        multiple
                                        hidden
                                        onChange={(event) => {
                                            addImages(event.target.files);
                                            event.target.value = "";
                                        }}
                                    />
                                    <button type="submit" className="support-admin-primary" disabled={sending || (!message.trim() && pendingImages.length === 0)}>
                                        {sending ? <Loader2 className="support-admin-spin" size={16} /> : <Send size={16} />}
                                        Envoyer
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </section>
            </div>

            {lightboxImage && (
                <div className="support-admin-lightbox" role="dialog" aria-modal="true" aria-label="Image partagée en grand" onClick={() => setLightboxImage("")}>
                    <div onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => setLightboxImage("")} aria-label="Fermer l'image">
                            <X size={20} />
                        </button>
                        <img src={lightboxImage} alt="Image partagée en grand" />
                    </div>
                </div>
            )}

            <style jsx global>{`
                .main-content:has(.support-admin-page) {
                    overflow: hidden;
                }
                .support-admin-page {
                    height: 100%;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.9rem;
                    padding-bottom: 0;
                    overflow: hidden;
                }
                .support-admin-heading {
                    flex: 0 0 auto;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                }
                .support-admin-heading p {
                    margin: 0 0 0.35rem;
                    color: var(--text-muted);
                    font-size: 0.76rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }
                .support-admin-heading h1 {
                    margin: 0;
                    color: var(--text-main);
                    font-size: clamp(2rem, 3.2vw, 3rem);
                    line-height: 1;
                }
                .support-admin-heading span {
                    display: block;
                    margin-top: 0.5rem;
                    color: var(--text-muted);
                    font-size: 0.95rem;
                }
                .support-admin-error {
                    flex: 0 0 auto;
                    padding: 0.85rem 1rem;
                    border-radius: 18px;
                    background: #fff1f2;
                    color: #b91c1c;
                    font-weight: 800;
                }
                .support-admin-grid {
                    flex: 1 1 auto;
                    min-height: 0;
                    display: grid;
                    grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
                    gap: 1rem;
                }
                .support-admin-list-panel,
                .support-admin-thread-panel {
                    min-height: 0;
                    background: var(--surface-muted, #edf4f3);
                    border-radius: 28px;
                    border: 1px solid var(--border, #d8e3e4);
                    overflow: hidden;
                }
                .support-admin-list-panel {
                    display: grid;
                    grid-template-rows: auto minmax(0, 1fr);
                }
                .support-admin-filter-row {
                    display: flex;
                    gap: 0.35rem;
                    flex-wrap: wrap;
                    padding: 0.65rem;
                    border-bottom: 1px solid var(--border, #d8e3e4);
                }
                .support-admin-filter-row button,
                .support-admin-secondary,
                .support-admin-primary,
                .support-admin-icon-button {
                    border: 0;
                    border-radius: 14px;
                    min-height: 34px;
                    padding: 0.46rem 0.72rem;
                    font: inherit;
                    font-size: 0.82rem;
                    font-weight: 800;
                    line-height: 1;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.4rem;
                    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
                }
                .support-admin-filter-row button,
                .support-admin-secondary,
                .support-admin-icon-button {
                    background: rgba(255, 255, 255, 0.72);
                    color: var(--text-main);
                    border: 1px solid var(--border, #d8e3e4);
                }
                .support-admin-filter-row button {
                    color: var(--text-muted);
                    box-shadow: none;
                }
                .support-admin-filter-row button.active,
                .support-admin-primary {
                    background: #151a1b;
                    color: #fff;
                    border-color: #151a1b;
                }
                .support-admin-filter-row button.active {
                    box-shadow: 0 6px 16px rgba(21, 26, 27, 0.12);
                }
                .support-admin-secondary:hover,
                .support-admin-icon-button:hover,
                .support-admin-filter-row button:hover {
                    background: #fff;
                    border-color: #aac3c6;
                    color: var(--text-main);
                }
                .support-admin-primary:hover:not(:disabled) {
                    background: #243032;
                    border-color: #243032;
                    transform: translateY(-1px);
                }
                .support-admin-primary:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
                .support-admin-icon-button {
                    width: 38px;
                    height: 38px;
                    padding: 0;
                }
                .support-admin-conversation-list {
                    min-height: 0;
                    overflow: auto;
                    padding: 0.75rem;
                    display: grid;
                    align-content: start;
                    gap: 0.75rem;
                }
                .support-admin-conversation-section {
                    display: grid;
                    gap: 0.55rem;
                }
                .support-admin-conversation-section + .support-admin-conversation-section {
                    border-top: 1px solid rgba(127, 163, 167, 0.28);
                    padding-top: 0.75rem;
                }
                .support-admin-section-title {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.7rem;
                    padding: 0 0.15rem;
                    color: var(--text-main);
                    font-size: 0.78rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .support-admin-section-title small {
                    min-width: 24px;
                    height: 22px;
                    padding: 0 0.45rem;
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.74);
                    border: 1px solid var(--border, #d8e3e4);
                    color: var(--text-muted);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.72rem;
                    font-weight: 900;
                }
                .support-admin-conversation-section > p {
                    margin: -0.25rem 0 0.1rem;
                    padding: 0 0.15rem;
                    color: var(--text-muted);
                    font-size: 0.74rem;
                    line-height: 1.35;
                }
                .support-admin-section-empty {
                    padding: 0.75rem;
                    border-radius: 16px;
                    border: 1px dashed rgba(127, 163, 167, 0.42);
                    color: var(--text-muted);
                    background: rgba(255, 255, 255, 0.36);
                    font-size: 0.78rem;
                    font-weight: 800;
                    text-align: center;
                }
                .support-admin-conversation {
                    width: 100%;
                    text-align: left;
                    background: #fff;
                    border: 1px solid transparent;
                    border-radius: 20px;
                    padding: 0.8rem;
                    color: var(--text-main);
                    cursor: pointer;
                    display: grid;
                    gap: 0.45rem;
                    box-shadow: 0 12px 28px rgba(24, 43, 45, 0.04);
                }
                .support-admin-conversation.priority {
                    border-color: rgba(62, 104, 108, 0.34);
                    background:
                        linear-gradient(135deg, rgba(229, 255, 188, 0.42), rgba(255, 255, 255, 0.92) 58%),
                        #fff;
                }
                .support-admin-conversation.active {
                    border-color: #7fa3a7;
                    box-shadow: 0 0 0 2px rgba(127, 163, 167, 0.18);
                }
                .support-admin-conversation-top,
                .support-admin-conversation-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.7rem;
                }
                .support-admin-conversation-bottom > span {
                    min-width: 0;
                    display: inline-flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 0.4rem;
                    flex-wrap: wrap;
                }
                .support-admin-conversation-top strong {
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .support-admin-conversation small {
                    color: var(--text-muted);
                    font-size: 0.75rem;
                    font-weight: 800;
                    flex-shrink: 0;
                }
                .support-admin-conversation-user {
                    color: var(--text-muted);
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    flex-wrap: wrap;
                    min-width: 0;
                }
                .support-admin-conversation-user > span:first-child {
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .support-admin-plan-badge,
                .support-admin-priority-label {
                    display: inline-flex;
                    align-items: center;
                    width: fit-content;
                    max-width: 100%;
                    border-radius: 999px;
                    white-space: nowrap;
                    line-height: 1;
                }
                .support-admin-plan-badge {
                    padding: 0.24rem 0.45rem;
                    background: rgba(238, 244, 245, 0.92);
                    border: 1px solid rgba(127, 163, 167, 0.32);
                    color: var(--text-main);
                    font-size: 0.68rem;
                    font-weight: 900;
                }
                .support-admin-plan-badge.priority {
                    background: #e5ffbc;
                    border-color: rgba(71, 95, 31, 0.18);
                    color: #324412;
                }
                .support-admin-priority-label {
                    padding: 0.22rem 0.42rem;
                    background: rgba(21, 26, 27, 0.08);
                    color: #2e5c60;
                    font-size: 0.68rem;
                    font-weight: 900;
                }
                .support-admin-thread-panel {
                    display: grid;
                    grid-template-rows: auto minmax(0, 1fr) auto;
                }
                .support-admin-thread-head {
                    padding: 0.75rem 0.95rem;
                    border-bottom: 1px solid var(--border, #d8e3e4);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    background: rgba(255, 255, 255, 0.45);
                }
                .support-admin-thread-head p {
                    margin: 0 0 0.3rem;
                    color: #2e5c60;
                    font-size: 0.78rem;
                    font-weight: 900;
                    text-transform: uppercase;
                }
                .support-admin-thread-head h2 {
                    margin: 0;
                    color: var(--text-main);
                    font-size: 1.25rem;
                }
                .support-admin-thread-head > div > .support-admin-thread-user-line {
                    display: flex;
                    margin-top: 0.25rem;
                    color: var(--text-muted);
                    font-size: 0.9rem;
                }
                .support-admin-thread-user-line {
                    align-items: center;
                    gap: 0.45rem;
                    flex-wrap: wrap;
                }
                .support-admin-thread-user-line .support-admin-plan-badge,
                .support-admin-thread-user-line .support-admin-priority-label {
                    margin-top: 0;
                }
                .support-admin-thread-actions,
                .support-admin-compose-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 0.55rem;
                    flex-wrap: wrap;
                }
                .support-admin-thread {
                    min-height: 0;
                    overflow: auto;
                    padding: 0.85rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.7rem;
                }
                .support-admin-message {
                    max-width: min(680px, 82%);
                    align-self: flex-start;
                    background: #fff;
                    color: var(--text-main);
                    border: 1px solid var(--border, #d8e3e4);
                    border-radius: 20px 20px 20px 6px;
                    padding: 0.85rem 0.95rem;
                    display: grid;
                    gap: 0.45rem;
                }
                .support-admin-message.team {
                    align-self: flex-end;
                    background: #151a1b;
                    color: #fff;
                    border-color: #151a1b;
                    border-radius: 20px 20px 6px 20px;
                }
                .support-admin-message-meta {
                    display: flex;
                    justify-content: space-between;
                    gap: 1rem;
                    opacity: 0.72;
                    font-size: 0.75rem;
                    font-weight: 900;
                }
                .support-admin-message p {
                    margin: 0;
                    white-space: pre-wrap;
                    line-height: 1.45;
                }
                .support-admin-images {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(130px, 220px));
                    gap: 0.55rem;
                }
                .support-admin-images button,
                .support-admin-preview button:first-child {
                    border: 0;
                    padding: 0;
                    background: transparent;
                    cursor: zoom-in;
                }
                .support-admin-images img {
                    width: 100%;
                    aspect-ratio: 4 / 3;
                    max-height: 220px;
                    object-fit: cover;
                    border-radius: 14px;
                    display: block;
                }
                .support-admin-composer {
                    padding: 0.75rem;
                    border-top: 1px solid var(--border, #d8e3e4);
                    background: rgba(255, 255, 255, 0.55);
                    display: grid;
                    gap: 0.55rem;
                }
                .support-admin-composer textarea {
                    width: 100%;
                    min-height: 70px;
                    max-height: 120px;
                    border: 1px solid var(--border, #d8e3e4);
                    border-radius: 18px;
                    padding: 0.85rem 1rem;
                    background: #fff;
                    color: var(--text-main);
                    resize: vertical;
                    font: inherit;
                    outline: none;
                }
                .support-admin-previews {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                .support-admin-preview {
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    border: 1px solid var(--border, #d8e3e4);
                    overflow: hidden;
                    position: relative;
                    background: #fff;
                }
                .support-admin-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }
                .support-admin-preview-remove {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 24px;
                    height: 24px;
                    border: 0;
                    border-radius: 999px;
                    background: rgba(21, 26, 27, 0.78);
                    color: #fff;
                    display: grid;
                    place-items: center;
                    cursor: pointer;
                }
                .support-admin-empty {
                    min-height: 180px;
                    display: grid;
                    place-items: center;
                    align-content: center;
                    gap: 0.55rem;
                    color: var(--text-muted);
                    text-align: center;
                    font-weight: 800;
                }
                .support-admin-empty-large {
                    min-height: 100%;
                }
                .support-admin-spin {
                    animation: supportAdminSpin 0.8s linear infinite;
                }
                .support-admin-lightbox {
                    position: fixed;
                    inset: 0;
                    z-index: 12000;
                    background: rgba(10, 13, 14, 0.82);
                    display: grid;
                    place-items: center;
                    padding: clamp(1rem, 4vw, 3rem);
                }
                .support-admin-lightbox > div {
                    position: relative;
                    max-width: min(1000px, 96vw);
                    max-height: 88vh;
                    display: grid;
                    place-items: center;
                }
                .support-admin-lightbox button {
                    position: absolute;
                    top: -14px;
                    right: -14px;
                    width: 42px;
                    height: 42px;
                    border-radius: 999px;
                    border: 1px solid rgba(255, 255, 255, 0.28);
                    background: #fff;
                    color: #151a1b;
                    display: grid;
                    place-items: center;
                    cursor: pointer;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
                }
                .support-admin-lightbox img {
                    max-width: 100%;
                    max-height: 88vh;
                    object-fit: contain;
                    border-radius: 20px;
                    background: #fff;
                    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
                }
                @keyframes supportAdminSpin {
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 980px) {
                    .main-content:has(.support-admin-page) {
                        overflow-y: auto;
                    }
                    .support-admin-page {
                        height: auto;
                        overflow: visible;
                    }
                    .support-admin-grid {
                        grid-template-columns: 1fr;
                        flex: 0 0 auto;
                    }
                    .support-admin-list-panel {
                        min-height: 320px;
                    }
                    .support-admin-thread-panel {
                        min-height: 560px;
                    }
                    .support-admin-heading,
                    .support-admin-thread-head {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                }
            `}</style>
        </section>
    );
}
