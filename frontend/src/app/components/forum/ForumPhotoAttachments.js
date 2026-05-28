"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_FORUM_PHOTOS = 5;
const MAX_FORUM_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function readImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function normalizePhotos(photos) {
    if (!photos) return [];
    if (Array.isArray(photos)) return photos.filter((p) => typeof p === "string" && p.trim());
    if (typeof photos === "string") {
        const trimmed = photos.trim();
        if (!trimmed || trimmed === "[]") return [];
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string" && p.trim()) : [];
        } catch {
            return trimmed.startsWith("data:image/") ? [trimmed] : [];
        }
    }
    return [];
}

const IcClose = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const IcChevL = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 18l-6-6 6-6" />
    </svg>
);
const IcChevR = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 18l6-6-6-6" />
    </svg>
);

function ForumPhotoLightbox({ images, index, onClose, onIndexChange }) {
    const goPrev = useCallback(() => {
        onIndexChange((index - 1 + images.length) % images.length);
    }, [index, images.length, onIndexChange]);
    const goNext = useCallback(() => {
        onIndexChange((index + 1) % images.length);
    }, [index, images.length, onIndexChange]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "ArrowRight") goNext();
        };
        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose, goPrev, goNext]);

    const src = images[index];
    if (!src) return null;

    const navBtn = {
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        background: "rgba(255,255,255,0.12)",
        border: "none",
        color: "#fff",
        padding: "0.65rem",
        borderRadius: "50%",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Image en grand"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 10000,
                background: "rgba(0,0,0,0.92)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
            }}
            onClick={onClose}
        >
            <button
                type="button"
                aria-label="Fermer"
                onClick={onClose}
                style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    background: "rgba(255,255,255,0.12)",
                    border: "none",
                    color: "#fff",
                    padding: "0.5rem",
                    borderRadius: "50%",
                    cursor: "pointer",
                    display: "flex",
                }}
            >
                <IcClose />
            </button>

            {images.length > 1 && (
                <>
                    <button type="button" aria-label="Image précédente" style={{ ...navBtn, left: 16 }} onClick={(e) => { e.stopPropagation(); goPrev(); }}>
                        <IcChevL />
                    </button>
                    <button type="button" aria-label="Image suivante" style={{ ...navBtn, right: 16 }} onClick={(e) => { e.stopPropagation(); goNext(); }}>
                        <IcChevR />
                    </button>
                </>
            )}

            <img
                src={src}
                alt=""
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: "min(92vw, 1200px)",
                    maxHeight: "88vh",
                    objectFit: "contain",
                    borderRadius: 8,
                    boxShadow: "0 12px 48px rgba(0,0,0,0.45)",
                }}
            />

            {images.length > 1 && (
                <div
                    style={{
                        position: "absolute",
                        bottom: 24,
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: "#fff",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        opacity: 0.85,
                    }}
                >
                    {index + 1} / {images.length}
                </div>
            )}
        </div>
    );
}

/** Grille d’aperçu des images jointes à un message. */
export function ForumPhotosGrid({ photos = [], compact = false }) {
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const list = normalizePhotos(photos);
    if (!list.length) return null;
    const size = compact ? 72 : 120;
    return (
        <>
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginTop: list.length && compact ? "0.5rem" : "0.75rem",
                }}
            >
                {list.map((src, i) => (
                    <button
                        key={`${i}-${src.slice(0, 32)}`}
                        type="button"
                        title="Voir en grand"
                        onClick={() => setLightboxIndex(i)}
                        style={{
                            display: "block",
                            flexShrink: 0,
                            padding: 0,
                            border: "none",
                            background: "none",
                            cursor: "zoom-in",
                            borderRadius: 10,
                        }}
                    >
                        <img
                            src={src}
                            alt=""
                            style={{
                                width: size,
                                height: size,
                                objectFit: "cover",
                                borderRadius: 10,
                                border: "1px solid #EFF3F4",
                                display: "block",
                            }}
                        />
                    </button>
                ))}
            </div>
            {lightboxIndex !== null && (
                <ForumPhotoLightbox
                    images={list}
                    index={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onIndexChange={setLightboxIndex}
                />
            )}
        </>
    );
}

/**
 * Sélecteur de pièces jointes (data URLs) pour composer un message forum.
 * @param {{ photos: string[], onChange: (next: string[]) => void, disabled?: boolean }} props
 */
export function ForumPhotoPicker({ photos = [], onChange, disabled = false }) {
    const inputRef = useRef(null);

    const addFiles = async (fileList) => {
        const files = Array.from(fileList || []);
        if (files.length === 0) return;
        let next = [...photos];
        for (const file of files) {
            if (next.length >= MAX_FORUM_PHOTOS) break;
            if (!ALLOWED_IMAGE_TYPES.has(file.type)) continue;
            if (file.size > MAX_FORUM_IMAGE_BYTES) continue;
            try {
                const dataUrl = await readImageFile(file);
                if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
                    next = [...next, dataUrl];
                }
            } catch {
                /* ignore read errors */
            }
        }
        if (next.length !== photos.length || next.some((p, i) => p !== photos[i])) {
            onChange(next.slice(0, MAX_FORUM_PHOTOS));
        }
    };

    const removeAt = (index) => {
        onChange(photos.filter((_, i) => i !== index));
    };

    const atLimit = photos.length >= MAX_FORUM_PHOTOS;

    return (
        <div style={{ marginTop: "0.65rem" }}>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                disabled={disabled || atLimit}
                onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                }}
            />
            {photos.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    {photos.map((src, i) => (
                        <div key={i} style={{ position: "relative" }}>
                            <img
                                src={src}
                                alt=""
                                style={{
                                    width: 72,
                                    height: 72,
                                    objectFit: "cover",
                                    borderRadius: 10,
                                    border: "1px solid #EFF3F4",
                                }}
                            />
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => removeAt(i)}
                                    aria-label="Retirer l’image"
                                    style={{
                                        position: "absolute",
                                        top: -6,
                                        right: -6,
                                        width: 22,
                                        height: 22,
                                        borderRadius: "50%",
                                        border: "none",
                                        background: "#0F1419",
                                        color: "#fff",
                                        cursor: "pointer",
                                        fontSize: "0.85rem",
                                        lineHeight: 1,
                                        padding: 0,
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <button
                type="button"
                className="action-cta"
                disabled={disabled || atLimit}
                onClick={() => inputRef.current?.click()}
                style={{
                    fontSize: "0.8rem",
                    padding: "0.35rem 0.75rem",
                    background: "#EFF3F4",
                    color: "#0F1419",
                }}
            >
                {atLimit ? `Limite (${MAX_FORUM_PHOTOS} images)` : "Joindre des images"}
            </button>
            <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#71767B" }}>
                JPG, PNG ou WEBP · max 5 Mo · {photos.length}/{MAX_FORUM_PHOTOS}
            </span>
        </div>
    );
}
