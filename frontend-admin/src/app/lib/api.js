export const TOKEN_KEY = "uc_admin_token";

const getApiBaseUrl = () => {
    const fallback = "/api";
    const rawValue = (process.env.NEXT_PUBLIC_API_URL || "").trim();
    const cleanedValue = rawValue.replace(/^['\"]|['\"]$/g, "").replace(/\/+$/, "");

    if (!cleanedValue) {
        return fallback;
    }

    if (/^https?:\/\//i.test(cleanedValue) || cleanedValue.startsWith("/")) {
        return cleanedValue;
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
