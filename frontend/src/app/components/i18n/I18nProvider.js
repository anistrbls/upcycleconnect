"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../../lib/api";

const STORAGE_KEY = "uc_locale";
const DEFAULT_LOCALE = "fr";
const LOCALES_BASE_PATH = "/locales";
export const I18N_REFRESH_EVENT = "upcycle:i18n-refresh";

const DEFAULT_LANGUAGES = [
    { code: "fr", label: "Français", nativeLabel: "Français", dir: "ltr" },
    { code: "en", label: "Anglais", nativeLabel: "English", dir: "ltr" },
];

const TRANSLATABLE_ATTRIBUTES = ["placeholder", "title", "aria-label", "alt", "data-tooltip"];
const RUNTIME_TRANSLATION_BATCH_SIZE = 60;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "CANVAS"]);
const originalTextNodes = new WeakMap();
const translatedTextNodes = new WeakMap();

const I18nContext = createContext({
    locale: DEFAULT_LOCALE,
    languages: DEFAULT_LANGUAGES,
    isReady: false,
    setLocale: () => {},
    t: (_key, fallback = "") => fallback,
    translateText: (value) => value,
});

const normalizeText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const interpolate = (value, variables = {}) => (
    String(value ?? "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
        const replacement = variables[key];
        return replacement === undefined || replacement === null ? "" : String(replacement);
    })
);

const getNestedValue = (source, path) => {
    if (!source || !path) return undefined;
    return String(path).split(".").reduce((acc, part) => {
        if (acc && Object.prototype.hasOwnProperty.call(acc, part)) return acc[part];
        return undefined;
    }, source);
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const patternToRegex = (pattern) => {
    const names = [];
    const parts = String(pattern).split(/(\{\{\s*[a-zA-Z0-9_]+\s*\}\})/g);
    const body = parts.map((part) => {
        const match = part.match(/^\{\{\s*([a-zA-Z0-9_]+)\s*\}\}$/);
        if (!match) return escapeRegex(part);
        names.push(match[1]);
        return "(.+?)";
    }).join("");
    return { regex: new RegExp(`^${body}$`), names };
};

const translatePattern = (source, messages) => {
    const patterns = Array.isArray(messages?.patterns) ? messages.patterns : [];
    for (const item of patterns) {
        if (!item?.match || !item?.replace) continue;
        const { regex, names } = patternToRegex(item.match);
        const match = normalizeText(source).match(regex);
        if (!match) continue;
        const values = names.reduce((acc, name, index) => ({ ...acc, [name]: match[index + 1] }), {});
        return interpolate(item.replace, values);
    }
    return null;
};

const preserveSpacing = (source, translated) => {
    const value = String(source ?? "");
    const leading = value.match(/^\s*/)?.[0] ?? "";
    const trailing = value.match(/\s*$/)?.[0] ?? "";
    return `${leading}${translated}${trailing}`;
};

const findStaticTranslation = (value, messages = {}) => {
    const source = String(value ?? "");
    if (!source.trim()) return { found: false, translated: source };

    const phrases = messages.phrases || {};
    const translationMemory = messages.translationMemory || {};
    const normalized = normalizeText(source);
    const sourceKey = translationMemory[normalized] || translationMemory[source] || source;
    const normalizedSourceKey = normalizeText(sourceKey);
    const phraseKeys = [source, normalized, sourceKey, normalizedSourceKey];

    for (const key of phraseKeys) {
        if (Object.prototype.hasOwnProperty.call(phrases, key) && typeof phrases[key] === "string" && phrases[key].trim()) {
            return { found: true, translated: preserveSpacing(source, phrases[key]) };
        }
    }

    const patternTranslation = translatePattern(sourceKey, messages);
    if (patternTranslation) {
        return { found: true, translated: preserveSpacing(source, patternTranslation) };
    }

    if (sourceKey !== source && normalizedSourceKey !== normalized) {
        return { found: true, translated: preserveSpacing(source, sourceKey) };
    }

    return { found: false, translated: source };
};

export const translateStaticText = (value, messages = {}) => findStaticTranslation(value, messages).translated;

const isRuntimeTranslatableText = (value) => {
    const text = normalizeText(value);
    if (!text || text.length > 700) return false;
    if (/^(https?:\/\/|mailto:|tel:)/i.test(text)) return false;
    return /\p{L}/u.test(text);
};

const collectMissingTranslation = (source, lookup, missingSet, locale, defaultLocale) => {
    if (!missingSet || locale === defaultLocale || lookup.found) return;
    const text = normalizeText(source);
    if (isRuntimeTranslatableText(text)) missingSet.add(text);
};

const shouldSkipElement = (element) => {
    if (!element) return true;
    if (element.closest("[data-i18n-skip]")) return true;
    return SKIP_TAGS.has(element.tagName);
};

const sourceAttributeName = (attr) => `data-i18n-source-${attr.replace(/[^a-zA-Z0-9]/g, "-")}`;
const translatedAttributeName = (attr) => `data-i18n-translated-${attr.replace(/[^a-zA-Z0-9]/g, "-")}`;

const translateElementAttributes = (element, messages, missingSet, locale, defaultLocale) => {
    if (!element || shouldSkipElement(element)) return;

    TRANSLATABLE_ATTRIBUTES.forEach((attr) => {
        if (!element.hasAttribute(attr)) return;
        const current = element.getAttribute(attr) || "";
        if (!current.trim()) return;

        const sourceAttr = sourceAttributeName(attr);
        const translatedAttr = translatedAttributeName(attr);
        const previousSource = element.getAttribute(sourceAttr);
        const previousTranslated = element.getAttribute(translatedAttr);
        const source = (!previousSource || (current !== previousSource && current !== previousTranslated))
            ? current
            : previousSource;
        const lookup = findStaticTranslation(source, messages);
        const translated = lookup.translated;

        element.setAttribute(sourceAttr, source);
        element.setAttribute(translatedAttr, translated);
        collectMissingTranslation(source, lookup, missingSet, locale, defaultLocale);
        if (current !== translated) element.setAttribute(attr, translated);
    });
};

const translateTextNode = (node, messages, missingSet, locale, defaultLocale) => {
    const parent = node.parentElement;
    if (shouldSkipElement(parent)) return;

    const current = node.nodeValue || "";
    if (!current.trim()) return;

    const previousSource = originalTextNodes.get(node);
    const previousTranslated = translatedTextNodes.get(node);
    const source = (!previousSource || (current !== previousSource && current !== previousTranslated))
        ? current
        : previousSource;
    originalTextNodes.set(node, source);

    const lookup = findStaticTranslation(source, messages);
    const translated = lookup.translated;
    translatedTextNodes.set(node, translated);
    collectMissingTranslation(source, lookup, missingSet, locale, defaultLocale);
    if (current !== translated) node.nodeValue = translated;
};

const translateTree = (root, messages, { locale = DEFAULT_LOCALE, defaultLocale = DEFAULT_LOCALE, missingSet = new Set() } = {}) => {
    if (!root) return missingSet;

    if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root, messages, missingSet, locale, defaultLocale);
        return missingSet;
    }

    if (root.nodeType !== Node.ELEMENT_NODE) return missingSet;
    translateElementAttributes(root, messages, missingSet, locale, defaultLocale);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => shouldSkipElement(node.parentElement)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
    });

    let node = walker.nextNode();
    while (node) {
        translateTextNode(node, messages, missingSet, locale, defaultLocale);
        node = walker.nextNode();
    }

    root.querySelectorAll?.("*").forEach((element) => translateElementAttributes(element, messages, missingSet, locale, defaultLocale));
    return missingSet;
};

function RuntimeTranslator({ messages, isReady, locale, defaultLocale, onRuntimeTranslations }) {
    const requestedRef = useRef(new Set());
    const pendingRef = useRef(new Set());
    const inFlightRef = useRef(false);

    useEffect(() => {
        requestedRef.current = new Set();
        pendingRef.current = new Set();
        inFlightRef.current = false;
    }, [locale]);

    useEffect(() => {
        if (!isReady || typeof window === "undefined" || !document.body) return undefined;

        let scheduled = false;
        let applying = false;

        const requestMissingTranslations = async (missingSet) => {
            if (locale === defaultLocale || !missingSet?.size) return;

            const nextTexts = Array.from(missingSet).filter((text) => !requestedRef.current.has(text));
            if (!nextTexts.length) return;

            nextTexts.forEach((text) => {
                requestedRef.current.add(text);
                pendingRef.current.add(text);
            });

            if (inFlightRef.current) return;
            inFlightRef.current = true;

            try {
                while (pendingRef.current.size) {
                    const batch = Array.from(pendingRef.current).slice(0, RUNTIME_TRANSLATION_BATCH_SIZE);
                    batch.forEach((text) => pendingRef.current.delete(text));

                    const response = await fetch(apiUrl("/i18n/translate"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ targetLocale: locale, texts: batch }),
                    });

                    if (!response.ok) {
                        const data = await response.json().catch(() => ({}));
                        console.warn("Runtime translation failed", data?.error || response.statusText);
                        continue;
                    }

                    const data = await response.json().catch(() => ({}));
                    if (data?.phrases && typeof data.phrases === "object") {
                        onRuntimeTranslations(locale, data.phrases);
                    }
                }
            } catch (error) {
                console.warn("Runtime translation failed", error);
            } finally {
                inFlightRef.current = false;
            }
        };

        const applyTranslations = () => {
            scheduled = false;
            if (applying) return;
            applying = true;
            const missingSet = translateTree(document.body, messages, { locale, defaultLocale });
            applying = false;
            requestMissingTranslations(missingSet);
        };

        const scheduleApply = () => {
            if (scheduled) return;
            scheduled = true;
            window.requestAnimationFrame(applyTranslations);
        };

        scheduleApply();

        const observer = new MutationObserver((mutations) => {
            if (applying) return;
            const shouldApply = mutations.some((mutation) => (
                mutation.type === "childList"
                || mutation.type === "characterData"
                || TRANSLATABLE_ATTRIBUTES.includes(mutation.attributeName)
            ));
            if (shouldApply) scheduleApply();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: TRANSLATABLE_ATTRIBUTES,
        });

        return () => observer.disconnect();
    }, [defaultLocale, isReady, locale, messages, onRuntimeTranslations]);

    return null;
}

const DIALOG_PATCH_KEY = "__upcycleI18nDialogPatch";

function DialogTranslator({ messages, isReady }) {
    useEffect(() => {
        if (!isReady || typeof window === "undefined") return undefined;

        const state = window[DIALOG_PATCH_KEY] || {
            alert: window.alert.bind(window),
            confirm: window.confirm.bind(window),
        };

        window[DIALOG_PATCH_KEY] = state;
        state.messages = messages;

        window.alert = (message) => state.alert(translateStaticText(message, state.messages));
        window.confirm = (message) => state.confirm(translateStaticText(message, state.messages));

        return () => {
            window.alert = state.alert;
            window.confirm = state.confirm;
        };
    }, [messages, isReady]);

    return null;
}

const loadJSON = async (path) => {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Cannot load ${path}`);
    return response.json();
};

const loadOptionalJSON = async (path) => {
    try {
        return await loadJSON(path);
    } catch {
        return null;
    }
};

const normalizeLanguage = (language) => {
    if (!language?.code) return null;
    return {
        code: String(language.code).trim().toLowerCase(),
        label: String(language.label || language.nativeLabel || language.code).trim(),
        nativeLabel: String(language.nativeLabel || language.label || language.code).trim(),
        dir: language.dir === "rtl" ? "rtl" : "ltr",
    };
};

const mergeLanguages = (...languageLists) => {
    const byCode = new Map();

    languageLists.flat().forEach((language) => {
        const normalized = normalizeLanguage(language);
        if (!normalized) return;
        byCode.set(normalized.code, { ...(byCode.get(normalized.code) || {}), ...normalized });
    });

    return Array.from(byCode.values());
};

const emptyCatalog = { phrases: {}, patterns: [] };

const normalizeCatalog = (catalog) => ({
    meta: catalog?.meta || {},
    i18n: catalog?.i18n || {},
    phrases: catalog?.phrases && typeof catalog.phrases === "object" && !Array.isArray(catalog.phrases)
        ? catalog.phrases
        : {},
    patterns: Array.isArray(catalog?.patterns) ? catalog.patterns : [],
});

const loadLanguageCatalog = async (locale) => {
    const apiCatalog = await loadOptionalJSON(apiUrl(`/i18n/messages/${locale}`));
    if (apiCatalog) return normalizeCatalog(apiCatalog);

    const staticCatalog = await loadOptionalJSON(`${LOCALES_BASE_PATH}/${locale}.json`);
    return normalizeCatalog(staticCatalog || emptyCatalog);
};

const findLanguage = (languages, candidate) => {
    const normalized = String(candidate || "").toLowerCase();
    if (!normalized) return null;
    return languages.find((language) => language.code.toLowerCase() === normalized)
        || languages.find((language) => language.code.toLowerCase().split("-")[0] === normalized.split("-")[0])
        || null;
};

const resolveInitialLocale = (languages, defaultLocale) => {
    if (typeof window === "undefined") return defaultLocale;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    const storedLanguage = findLanguage(languages, stored);
    if (storedLanguage) return storedLanguage.code;

    const browserLanguages = window.navigator.languages?.length ? window.navigator.languages : [window.navigator.language];
    for (const browserLanguage of browserLanguages) {
        const match = findLanguage(languages, browserLanguage);
        if (match) return match.code;
    }

    return defaultLocale;
};

const buildTranslationMemory = (catalogs) => {
    const memory = {};

    Object.values(catalogs || {}).forEach((catalog) => {
        Object.entries(catalog?.phrases || {}).forEach(([source, translated]) => {
            const normalizedSource = normalizeText(source);
            if (normalizedSource && !memory[normalizedSource]) {
                memory[normalizedSource] = source;
            }

            if (typeof translated === "string") {
                const normalizedTranslated = normalizeText(translated);
                if (normalizedTranslated && !memory[normalizedTranslated]) {
                    memory[normalizedTranslated] = source;
                }
            }
        });
    });

    return memory;
};

export default function I18nProvider({ children }) {
    const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
    const [defaultLocale, setDefaultLocale] = useState(DEFAULT_LOCALE);
    const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
    const [messages, setMessages] = useState({ phrases: {}, patterns: [] });
    const [catalogs, setCatalogs] = useState({});
    const [isReady, setIsReady] = useState(false);
    const [refreshToken, setRefreshToken] = useState(0);
    const localeRef = useRef(locale);

    useEffect(() => {
        localeRef.current = locale;
    }, [locale]);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const refresh = () => setRefreshToken((value) => value + 1);
        window.addEventListener(I18N_REFRESH_EVENT, refresh);
        return () => window.removeEventListener(I18N_REFRESH_EVENT, refresh);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadLanguageConfig() {
            const staticConfig = await loadOptionalJSON(`${LOCALES_BASE_PATH}/languages.json`);
            const apiConfig = await loadOptionalJSON(apiUrl("/i18n/languages"));
            if (cancelled) return;

            const staticLanguages = Array.isArray(staticConfig?.locales) && staticConfig.locales.length
                ? staticConfig.locales
                : DEFAULT_LANGUAGES;
            const apiLanguages = Array.isArray(apiConfig?.locales) ? apiConfig.locales : [];
            const configuredLanguages = mergeLanguages(staticLanguages, apiLanguages);
            const configuredDefault = apiConfig?.defaultLocale || staticConfig?.defaultLocale || DEFAULT_LOCALE;

            setLanguages(configuredLanguages.length ? configuredLanguages : DEFAULT_LANGUAGES);
            setDefaultLocale(configuredDefault);
            setLocaleState(resolveInitialLocale(configuredLanguages.length ? configuredLanguages : DEFAULT_LANGUAGES, configuredDefault));
        }

        loadLanguageConfig();
        return () => { cancelled = true; };
    }, [refreshToken]);

    useEffect(() => {
        let cancelled = false;

        async function loadCatalogs() {
            const entries = await Promise.all(languages.map(async (language) => {
                try {
                    return [language.code, await loadLanguageCatalog(language.code)];
                } catch {
                    return [language.code, { phrases: {}, patterns: [] }];
                }
            }));

            if (!cancelled) setCatalogs(Object.fromEntries(entries));
        }

        loadCatalogs();
        return () => { cancelled = true; };
    }, [languages, refreshToken]);

    useEffect(() => {
        let cancelled = false;

        async function loadMessages() {
            setIsReady(false);
            try {
                const data = await loadLanguageCatalog(locale);
                if (!cancelled) setMessages(data);
            } catch {
                if (!cancelled) setMessages({ phrases: {}, patterns: [] });
            } finally {
                if (!cancelled) setIsReady(true);
            }
        }

        loadMessages();
        return () => { cancelled = true; };
    }, [locale, refreshToken]);

    useEffect(() => {
        if (typeof document === "undefined") return;
        const language = findLanguage(languages, locale);
        document.documentElement.lang = locale;
        document.documentElement.dir = language?.dir || "ltr";
    }, [languages, locale]);

    const changeLocale = useCallback((nextLocale) => {
        const language = findLanguage(languages, nextLocale);
        const resolvedLocale = language?.code || nextLocale || defaultLocale;
        setLocaleState(resolvedLocale);

        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, resolvedLocale);
            document.cookie = `${STORAGE_KEY}=${resolvedLocale}; path=/; max-age=31536000; SameSite=Lax`;
        }
    }, [defaultLocale, languages]);

    const translationMemory = useMemo(() => buildTranslationMemory(catalogs), [catalogs]);

    const activeMessages = useMemo(() => ({
        ...messages,
        translationMemory,
    }), [messages, translationMemory]);

    const mergeRuntimeTranslations = useCallback((targetLocale, phrases) => {
        if (!phrases || typeof phrases !== "object") return;

        const cleanPhrases = Object.entries(phrases).reduce((acc, [source, translated]) => {
            const key = normalizeText(source);
            if (key && typeof translated === "string" && translated.trim()) {
                acc[key] = translated;
            }
            return acc;
        }, {});

        if (!Object.keys(cleanPhrases).length) return;

        setCatalogs((currentCatalogs) => {
            const currentCatalog = normalizeCatalog(currentCatalogs[targetLocale] || emptyCatalog);
            return {
                ...currentCatalogs,
                [targetLocale]: {
                    ...currentCatalog,
                    phrases: { ...currentCatalog.phrases, ...cleanPhrases },
                },
            };
        });

        if (targetLocale === localeRef.current) {
            setMessages((currentMessages) => ({
                ...currentMessages,
                phrases: { ...(currentMessages.phrases || {}), ...cleanPhrases },
            }));
        }
    }, []);

    const t = useCallback((key, fallback = key, variables = {}) => {
        const translated = getNestedValue(messages, key);
        return interpolate(typeof translated === "string" ? translated : fallback, variables);
    }, [messages]);

    const translateText = useCallback((value, variables = {}) => {
        const translated = translateStaticText(value, activeMessages);
        return interpolate(translated, variables);
    }, [activeMessages]);

    const contextValue = useMemo(() => ({
        locale,
        languages,
        isReady,
        setLocale: changeLocale,
        t,
        translateText,
    }), [changeLocale, isReady, languages, locale, t, translateText]);

    return (
        <I18nContext.Provider value={contextValue}>
            {children}
            <DialogTranslator messages={activeMessages} isReady={isReady} />
            <RuntimeTranslator
                messages={activeMessages}
                isReady={isReady}
                locale={locale}
                defaultLocale={defaultLocale}
                onRuntimeTranslations={mergeRuntimeTranslations}
            />
        </I18nContext.Provider>
    );
}

export const useI18n = () => useContext(I18nContext);
