export const TOKEN_KEY = "uc_admin_token";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const isLocalHostname = (hostname = "") => LOCAL_HOSTNAMES.has(String(hostname).toLowerCase());

const getApiBaseUrl = () => {
    const fallback = "/api";
    const rawValue = (process.env.NEXT_PUBLIC_API_URL || "").trim();
    const cleanedValue = rawValue.replace(/^['\"]|['\"]$/g, "").replace(/\/+$/, "");

    if (!cleanedValue) {
        return fallback;
    }

    if (cleanedValue.startsWith("/")) {
        return cleanedValue;
    }

    if (/^https?:\/\//i.test(cleanedValue)) {
        if (typeof window === "undefined") {
            return cleanedValue;
        }

        try {
            const configuredUrl = new URL(cleanedValue, window.location.origin);
            if (isLocalHostname(configuredUrl.hostname) && !isLocalHostname(window.location.hostname)) {
                return fallback;
            }

            return cleanedValue;
        } catch {
            return fallback;
        }
    }

    return fallback;
};

export const API_BASE_URL = getApiBaseUrl();

export const apiUrl = (path) => {
    const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    if (normalizedBase.endsWith("/api")) {
        return `${normalizedBase}${normalizedPath}`;
    }

    return `${normalizedBase}/api${normalizedPath}`;
};

export const buildAuthHeaders = (extra = {}) => {
    const token = typeof window !== "undefined" ? (window.localStorage.getItem(TOKEN_KEY) || "") : "";
    return { Authorization: `Bearer ${token}`, ...extra };
};

/** Rôle JWT (`particulier`, `professionnel`, etc.) ou null si absent / illisible. */
export const getRoleFromToken = () => {
    if (typeof window === "undefined") return null;
    try {
        const t = window.localStorage.getItem(TOKEN_KEY);
        if (!t) return null;
        const parts = t.split(".");
        if (parts.length < 2) return null;
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "===".slice((b64.length + 3) % 4);
        const payload = JSON.parse(atob(padded));
        return typeof payload.role === "string" ? payload.role : null;
    } catch {
        return null;
    }
};

export const fetchWithTimeout = async (input, init = {}, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
};
