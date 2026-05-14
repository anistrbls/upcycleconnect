/** Médias annonce : nombre max total (photos + vidéos). */
export const MAX_ANNONCE_MEDIA = 10;
/** Une seule vidéo par annonce. */
export const MAX_ANNONCE_VIDEOS = 1;
/** Durée max vidéo (secondes). */
export const MAX_VIDEO_DURATION_SEC = 15;
/** Poids max fichier vidéo (octets) — court métrage, évite les très gros uploads. */
export const MAX_VIDEO_FILE_BYTES = 25 * 1024 * 1024;

export function previewLooksLikeVideo(preview) {
    return typeof preview === "string" && /^data:video\//i.test(preview);
}

/**
 * Durée lue côté navigateur (metadata). À utiliser avant encodage base64.
 * @param {File} file
 * @returns {Promise<number>} durée en secondes
 */
export function getVideoDurationFromFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        const cleanup = () => {
            URL.revokeObjectURL(url);
            video.removeAttribute("src");
            video.load();
        };
        video.onloadedmetadata = () => {
            const d = video.duration;
            cleanup();
            if (Number.isFinite(d) && d > 0) resolve(d);
            else reject(new Error("duration"));
        };
        video.onerror = () => {
            cleanup();
            reject(new Error("load"));
        };
        video.src = url;
    });
}
