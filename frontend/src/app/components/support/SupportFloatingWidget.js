"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, LifeBuoy, Loader2, MessageCircle, Plus, Send, X } from "lucide-react";
import { apiUrl, buildAuthHeaders } from "../../lib/api";

const MAX_SUPPORT_IMAGES = 4;
const MAX_SUPPORT_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const SUPPORT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORT_TEAM_ROLES = new Set(["admin", "salarie", "salarié", "moderateur", "modérateur", "moderator"]);

const statusLabel = (status) => {
    if (status === "resolved") return "Résolu";
    if (status === "in_progress") return "En cours";
    return "Ouvert";
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

function ImagePreviewStrip({ images, onRemove, onImageOpen }) {
    if (!Array.isArray(images) || images.length === 0) return null;

    return (
        <div className="support-widget-previews" aria-label="Images à envoyer">
            {images.map((src, index) => (
                <div className="support-widget-preview" key={`${src.slice(0, 32)}-${index}`}>
                    <button type="button" onClick={() => onImageOpen?.(src)} aria-label="Agrandir l'image">
                        <img src={src} alt="Image à envoyer" />
                    </button>
                    <button type="button" className="support-widget-preview-remove" onClick={() => onRemove(index)} aria-label="Supprimer l'image">
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}

function MessageBubble({ message, currentUserId, onImageOpen }) {
    const own = Number(message.senderId) === Number(currentUserId);
    const senderRole = String(message.senderRole || "").trim().toLowerCase();
    const isTeamSender = SUPPORT_TEAM_ROLES.has(senderRole);
    const senderLabel = own ? "Vous" : isTeamSender ? "UpcycleConnect Team" : message.senderName;
    const images = Array.isArray(message.images) ? message.images : [];

    return (
        <div className={`support-widget-message ${own ? "own" : ""}`}>
            <div className="support-widget-message-meta">
                <span data-i18n-user-content={own || isTeamSender ? undefined : "true"}>{senderLabel}</span>
                <span>{formatTime(message.createdAt)}</span>
            </div>
            {message.body && <p data-i18n-user-content="true">{message.body}</p>}
            {images.length > 0 && (
                <div className="support-widget-images">
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

export default function SupportFloatingWidget({ user }) {
    const fileInputRef = useRef(null);
    const createFileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [creatingNew, setCreatingNew] = useState(false);
    const [subject, setSubject] = useState("");
    const [newMessage, setNewMessage] = useState("");
    const [newImages, setNewImages] = useState([]);
    const [message, setMessage] = useState("");
    const [pendingImages, setPendingImages] = useState([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [lightboxImage, setLightboxImage] = useState("");

    const loadConversations = useCallback(async () => {
        try {
            const res = await fetch(apiUrl("/support/conversations"), {
                headers: buildAuthHeaders(),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Impossible de charger l'assistance.");
            const items = data.conversations || [];
            setConversations(items);
            setSelectedId((current) => current || items[0]?.id || null);
            if (items.length === 0) setCreatingNew(true);
        } catch (err) {
            setError(err.message || "Impossible de charger l'assistance.");
        }
    }, []);

    const loadDetail = useCallback(async (id, { silent = false } = {}) => {
        if (!id) return;
        if (!silent) setLoading(true);
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
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return undefined;
        loadConversations();
        return undefined;
    }, [open, loadConversations]);

    useEffect(() => {
        if (!open || !selectedId) return undefined;
        loadDetail(selectedId);
        const timer = setInterval(() => loadDetail(selectedId, { silent: true }), 8000);
        return () => clearInterval(timer);
    }, [open, selectedId, loadDetail]);

    useEffect(() => {
        if (!open) return;
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [open, detail?.messages?.length]);

    useEffect(() => {
        if (!lightboxImage) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") setLightboxImage("");
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [lightboxImage]);

    const addImages = async (files, mode) => {
        try {
            const existingCount = mode === "new" ? newImages.length : pendingImages.length;
            const images = await readSupportImages(files, existingCount);
            if (mode === "new") {
                setNewImages((prev) => [...prev, ...images]);
            } else {
                setPendingImages((prev) => [...prev, ...images]);
            }
        } catch (err) {
            setError(err.message || "Impossible d'ajouter l'image.");
        }
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!newMessage.trim() && newImages.length === 0) return;
        setSending(true);
        setError("");
        try {
            const res = await fetch(apiUrl("/support/conversations"), {
                method: "POST",
                headers: buildAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ subject, message: newMessage, images: newImages }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Impossible de créer la demande.");
            setSubject("");
            setNewMessage("");
            setNewImages([]);
            setCreatingNew(false);
            setSelectedId(data.conversation?.id || null);
            setDetail(data);
            await loadConversations();
        } catch (err) {
            setError(err.message || "Impossible de créer la demande.");
        } finally {
            setSending(false);
        }
    };

    const handleSend = async (event) => {
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

    const currentConversation = detail?.conversation || conversations.find((item) => Number(item.id) === Number(selectedId));
    const messages = detail?.messages || [];
    const canShowThread = currentConversation && !creatingNew;

    return (
        <div className="support-widget">
            {open && (
                <section className="support-widget-panel" aria-label="Assistance">
                    <header className="support-widget-header">
                        <div>
                            <span>Aide en ligne</span>
                            <strong>UpcycleConnect Team</strong>
                        </div>
                        <div className="support-widget-header-actions">
                            {conversations.length > 0 && (
                                <button type="button" onClick={() => setCreatingNew((prev) => !prev)} aria-label={creatingNew ? "Retour à la conversation" : "Nouvelle demande"}>
                                    {creatingNew ? <MessageCircle size={17} /> : <Plus size={17} />}
                                </button>
                            )}
                            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer l'assistance">
                                <X size={18} />
                            </button>
                        </div>
                    </header>

                    {error && <div className="support-widget-error">{error}</div>}

                    {creatingNew ? (
                        <form className="support-widget-body support-widget-form" onSubmit={handleCreate}>
                            <div className="support-widget-empty">
                                <LifeBuoy size={25} />
                                <strong>Démarrer une demande</strong>
                                <span>Expliquez-nous le problème, l'équipe vous répondra ici.</span>
                            </div>
                            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Sujet de votre demande" />
                            <textarea value={newMessage} onChange={(event) => setNewMessage(event.target.value)} placeholder="Votre message" rows={5} />
                            <ImagePreviewStrip images={newImages} onRemove={(index) => setNewImages((prev) => prev.filter((_, i) => i !== index))} onImageOpen={setLightboxImage} />
                            <div className="support-widget-compose-actions">
                                <button type="button" className="support-widget-attach" onClick={() => createFileInputRef.current?.click()} aria-label="Joindre une image">
                                    <ImagePlus size={17} />
                                </button>
                                <input
                                    ref={createFileInputRef}
                                    type="file"
                                    accept={SUPPORT_IMAGE_ACCEPT}
                                    multiple
                                    hidden
                                    onChange={(event) => {
                                        addImages(event.target.files, "new");
                                        event.target.value = "";
                                    }}
                                />
                                <button type="submit" className="support-widget-send" disabled={sending || (!newMessage.trim() && newImages.length === 0)}>
                                    {sending ? <Loader2 className="support-widget-spin" size={16} /> : <Send size={16} />}
                                    Envoyer la demande
                                </button>
                            </div>
                        </form>
                    ) : canShowThread ? (
                        <>
                            <div className="support-widget-conversation-head">
                                <strong data-i18n-user-content="true">{currentConversation.subject}</strong>
                                <span>{statusLabel(currentConversation.status)}</span>
                            </div>
                            <div className="support-widget-body support-widget-thread">
                                {loading ? (
                                    <div className="support-widget-empty">
                                        <Loader2 className="support-widget-spin" />
                                        Chargement…
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="support-widget-empty">Aucun message.</div>
                                ) : (
                                    messages.map((item) => (
                                        <MessageBubble key={item.id} message={item} currentUserId={user?.id} onImageOpen={setLightboxImage} />
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <form className="support-widget-composer" onSubmit={handleSend}>
                                <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Écrire un message..." rows={2} />
                                <ImagePreviewStrip images={pendingImages} onRemove={(index) => setPendingImages((prev) => prev.filter((_, i) => i !== index))} onImageOpen={setLightboxImage} />
                                <div className="support-widget-compose-actions">
                                    <button type="button" className="support-widget-attach" onClick={() => fileInputRef.current?.click()} aria-label="Joindre une image">
                                        <ImagePlus size={17} />
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={SUPPORT_IMAGE_ACCEPT}
                                        multiple
                                        hidden
                                        onChange={(event) => {
                                            addImages(event.target.files, "reply");
                                            event.target.value = "";
                                        }}
                                    />
                                    <button type="submit" className="support-widget-send" disabled={sending || (!message.trim() && pendingImages.length === 0)}>
                                        {sending ? <Loader2 className="support-widget-spin" size={16} /> : <Send size={16} />}
                                        Envoyer
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="support-widget-body">
                            <div className="support-widget-empty">
                                <Loader2 className="support-widget-spin" />
                                Chargement…
                            </div>
                        </div>
                    )}
                </section>
            )}

            <button type="button" className="support-widget-tab" onClick={() => setOpen((prev) => !prev)} aria-label={open ? "Fermer l'assistance" : "Ouvrir l'assistance"}>
                {open ? <X size={20} /> : <MessageCircle size={20} />}
                <span>{open ? "Fermer" : "Assistance"}</span>
            </button>

            {lightboxImage && (
                <div className="support-widget-lightbox" role="dialog" aria-modal="true" aria-label="Image partagée en grand" onClick={() => setLightboxImage("")}>
                    <div onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => setLightboxImage("")} aria-label="Fermer l'image">
                            <X size={20} />
                        </button>
                        <img src={lightboxImage} alt="Image partagée en grand" />
                    </div>
                </div>
            )}

            <style jsx global>{`
                .support-widget {
                    position: fixed;
                    right: 24px;
                    bottom: 24px;
                    z-index: 8500;
                    display: grid;
                    justify-items: end;
                    gap: 0.8rem;
                    pointer-events: none;
                }
                .support-widget-panel,
                .support-widget-tab,
                .support-widget-lightbox {
                    pointer-events: auto;
                }
                .support-widget-tab {
                    border: 0;
                    border-radius: 999px;
                    background: #151a1b;
                    color: #fff;
                    padding: 0.85rem 1.05rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.55rem;
                    font: inherit;
                    font-weight: 800;
                    cursor: pointer;
                    box-shadow: 0 18px 38px rgba(21, 26, 27, 0.22);
                }
                .support-widget-panel {
                    width: min(390px, calc(100vw - 32px));
                    max-height: min(690px, calc(100vh - 118px));
                    background: #f5faf9;
                    border: 1px solid #d9e7e7;
                    border-radius: 28px;
                    box-shadow: 0 24px 70px rgba(21, 26, 27, 0.22);
                    overflow: hidden;
                    display: grid;
                    grid-template-rows: auto auto minmax(0, 1fr) auto;
                }
                .support-widget-header {
                    background: #151a1b;
                    color: #fff;
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    gap: 1rem;
                    align-items: center;
                }
                .support-widget-header div:first-child {
                    display: grid;
                    gap: 0.15rem;
                }
                .support-widget-header span {
                    font-size: 0.72rem;
                    opacity: 0.72;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0;
                }
                .support-widget-header strong {
                    font-size: 1rem;
                }
                .support-widget-header-actions {
                    display: flex;
                    gap: 0.4rem;
                }
                .support-widget-header-actions button,
                .support-widget-attach {
                    width: 38px;
                    height: 38px;
                    border-radius: 999px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: rgba(255, 255, 255, 0.12);
                    color: inherit;
                    display: grid;
                    place-items: center;
                    cursor: pointer;
                }
                .support-widget-error {
                    margin: 0.7rem 0.85rem 0;
                    padding: 0.65rem 0.75rem;
                    border-radius: 14px;
                    background: #fff1f2;
                    color: #b91c1c;
                    font-size: 0.82rem;
                    font-weight: 700;
                }
                .support-widget-conversation-head {
                    padding: 0.85rem 1rem;
                    border-bottom: 1px solid #d9e7e7;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.75rem;
                }
                .support-widget-conversation-head strong {
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .support-widget-conversation-head span {
                    flex-shrink: 0;
                    border-radius: 999px;
                    background: #d6eef0;
                    color: #2e5c60;
                    padding: 0.25rem 0.6rem;
                    font-size: 0.72rem;
                    font-weight: 900;
                }
                .support-widget-body {
                    min-height: 280px;
                    overflow: auto;
                    padding: 0.9rem;
                }
                .support-widget-thread {
                    display: flex;
                    flex-direction: column;
                    gap: 0.7rem;
                }
                .support-widget-message {
                    max-width: 84%;
                    justify-self: start;
                    align-self: flex-start;
                    background: #fff;
                    color: var(--text-main);
                    border: 1px solid #e1eaeb;
                    border-radius: 18px 18px 18px 5px;
                    padding: 0.72rem 0.78rem;
                    display: grid;
                    gap: 0.35rem;
                }
                .support-widget-message.own {
                    align-self: flex-end;
                    background: #151a1b;
                    color: #fff;
                    border-color: #151a1b;
                    border-radius: 18px 18px 5px 18px;
                }
                .support-widget-message-meta {
                    display: flex;
                    justify-content: space-between;
                    gap: 0.8rem;
                    opacity: 0.72;
                    font-size: 0.68rem;
                    font-weight: 800;
                }
                .support-widget-message p {
                    margin: 0;
                    white-space: pre-wrap;
                    line-height: 1.38;
                    font-size: 0.88rem;
                }
                .support-widget-images {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(82px, 1fr));
                    gap: 0.4rem;
                }
                .support-widget-images button,
                .support-widget-preview button:first-child {
                    border: 0;
                    padding: 0;
                    background: transparent;
                    cursor: zoom-in;
                }
                .support-widget-images img {
                    width: 100%;
                    aspect-ratio: 4 / 3;
                    object-fit: cover;
                    border-radius: 12px;
                    display: block;
                }
                .support-widget-composer,
                .support-widget-form {
                    display: grid;
                    gap: 0.7rem;
                    border-top: 1px solid #d9e7e7;
                    padding: 0.85rem;
                    background: #f5faf9;
                }
                .support-widget-form {
                    border-top: 0;
                    min-height: 440px;
                    align-content: start;
                }
                .support-widget-composer textarea,
                .support-widget-form textarea,
                .support-widget-form input {
                    width: 100%;
                    border: 1px solid #d8e3e4;
                    border-radius: 18px;
                    padding: 0.75rem 0.85rem;
                    background: #fff;
                    color: var(--text-main);
                    resize: vertical;
                    font: inherit;
                    outline: none;
                }
                .support-widget-compose-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.55rem;
                    align-items: center;
                }
                .support-widget-attach {
                    background: #fff;
                    color: var(--text-main);
                    border-color: #d8e3e4;
                }
                .support-widget-send {
                    border: 0;
                    border-radius: 999px;
                    background: #151a1b;
                    color: #fff;
                    padding: 0.72rem 0.95rem;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.45rem;
                    font: inherit;
                    font-weight: 800;
                    cursor: pointer;
                }
                .support-widget-send:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
                .support-widget-previews {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.45rem;
                }
                .support-widget-preview {
                    width: 58px;
                    height: 58px;
                    border-radius: 14px;
                    border: 1px solid #d8e3e4;
                    overflow: hidden;
                    position: relative;
                    background: #fff;
                }
                .support-widget-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }
                .support-widget-preview-remove {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 22px;
                    height: 22px;
                    border: 0;
                    border-radius: 999px;
                    background: rgba(21, 26, 27, 0.78);
                    color: #fff;
                    display: grid;
                    place-items: center;
                    cursor: pointer;
                }
                .support-widget-empty {
                    min-height: 180px;
                    display: grid;
                    place-items: center;
                    align-content: center;
                    gap: 0.55rem;
                    color: var(--text-muted);
                    text-align: center;
                    line-height: 1.4;
                }
                .support-widget-empty strong {
                    color: var(--text-main);
                }
                .support-widget-spin {
                    animation: supportWidgetSpin 0.8s linear infinite;
                }
                .support-widget-lightbox {
                    position: fixed;
                    inset: 0;
                    z-index: 12000;
                    background: rgba(10, 13, 14, 0.82);
                    display: grid;
                    place-items: center;
                    padding: clamp(1rem, 4vw, 3rem);
                }
                .support-widget-lightbox > div {
                    position: relative;
                    max-width: min(1000px, 96vw);
                    max-height: 88vh;
                    display: grid;
                    place-items: center;
                }
                .support-widget-lightbox button {
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
                .support-widget-lightbox img {
                    max-width: 100%;
                    max-height: 88vh;
                    object-fit: contain;
                    border-radius: 20px;
                    background: #fff;
                    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
                }
                @keyframes supportWidgetSpin {
                    to { transform: rotate(360deg); }
                }
                @media (max-width: 640px) {
                    .support-widget {
                        right: 14px;
                        bottom: 14px;
                    }
                    .support-widget-panel {
                        width: calc(100vw - 28px);
                        max-height: calc(100vh - 94px);
                    }
                    .support-widget-tab span {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
