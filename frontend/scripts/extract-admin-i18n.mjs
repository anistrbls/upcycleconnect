import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scanRoots = [
    "src/app/(admin)",
    "src/app/login/page.js",
    "src/app/components/admin",
    "src/app/components/conseils",
    "src/app/components/finances",
    "src/app/components/forum",
    "src/app/components/particulier",
    "src/app/components/salarie",
    "src/app/components/shared",
    "src/app/components/user",
    "src/app/components/CityAutocomplete.js",
    "src/app/components/DepositCodeQrPanel.js",
    "src/app/lib/constants.js",
];

const localeFiles = ["fr", "en"].map((locale) => ({
    locale,
    file: path.join(frontendRoot, "public", "locales", `${locale}.json`),
}));

const curatedPhrases = {
    en: {
        "Connexion": "Login",
        "Se connecter": "Log in",
        "S'inscrire": "Sign up",
        "Votre email": "Your email",
        "Mot de passe": "Password",
        "Mot de passe oublie ?": "Forgot password?",
        "Afficher le mot de passe": "Show password",
        "Pas encore de compte ?": "No account yet?",
        "Console de gestion": "Management console",
        "Vérification de session...": "Checking session...",
        "Se déconnecter": "Log out",
        "Notifications": "Notifications",
        "Navigation principale": "Main navigation",
        "Vue globale": "Overview",
        "Annonces": "Listings",
        "Utilisateurs": "Users",
        "Paramètres": "Settings",
        "Configuration": "Configuration",
        "Préférences générales": "General preferences",
        "Langues de l'interface": "Interface languages",
        "Nouvelle langue": "New language",
        "Catégories d'objets": "Item categories",
        "États des objets": "Item conditions",
        "Matériaux": "Materials",
        "Pays": "Countries",
        "Types de points de dépôt": "Drop-off point types",
        "Catégories de prestations": "Service categories",
        "Catégories de conseils": "Advice categories",
        "Motifs de modération": "Moderation reasons",
        "Ajouter": "Add",
        "Annuler": "Cancel",
        "Enregistrer": "Save",
        "Modifier": "Edit",
        "Supprimer": "Delete",
        "Chargement...": "Loading...",
        "Aucun élément. Ajoutez-en un ci-dessus.": "No item yet. Add one above.",
    },
};

const baseCatalogs = {
    fr: {
        meta: { locale: "fr", name: "Français" },
        i18n: { language: "Langue" },
        phrases: {},
        patterns: [],
    },
    en: {
        meta: { locale: "en", name: "English" },
        i18n: { language: "Language" },
        phrases: curatedPhrases.en,
        patterns: [
            { match: "{{count}} élément", replace: "{{count}} item" },
            { match: "{{count}} éléments", replace: "{{count}} items" },
        ],
    },
};

const collator = new Intl.Collator("fr", { sensitivity: "base" });

const rejectExact = new Set([
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "Bearer",
    "Content-Type",
    "application/json",
    "include",
    "omit",
    "same-origin",
    "cors",
    "localhost",
    "transparent",
    "white",
    "black",
    "pointer",
    "none",
    "center",
    "left",
    "right",
    "flex",
    "grid",
    "block",
    "inline",
    "absolute",
    "relative",
    "fixed",
    "sticky",
    "hidden",
    "visible",
    "auto",
]);

const rejectContains = [
    "webpack-internal",
    "node_modules",
    "data:image/",
    "image/",
    "video/",
    "font/",
    "rgba(",
    "rgb(",
    "var(--",
    "@keyframes",
    "transform:",
    "display:",
    "padding:",
    "margin:",
    "border:",
    "background:",
    "font-size:",
    "fontWeight",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "console.",
    "localStorage",
    "sessionStorage",
];

const decodeEntities = (value) => value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&euro;/g, "€")
    .replace(/&hellip;/g, "…")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");

const normalizeText = (value) => decodeEntities(String(value || ""))
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const unescapeString = (raw, quote) => {
    if (quote === "`") {
        return raw.replace(/\\`/g, "`").replace(/\\\\/g, "\\");
    }

    try {
        return JSON.parse(`"${raw.replace(/"/g, "\\\"")}"`);
    } catch {
        return raw
            .replace(/\\'/g, "'")
            .replace(/\\"/g, "\"")
            .replace(/\\\\/g, "\\");
    }
};

const looksLikeSvgPath = (value) => (
    value.length > 12
    && /^[MmLlHhVvCcSsQqTtAaZz0-9,.\-\s]+$/.test(value)
    && !/[B-DFGJK-NPRUWXYb-dfgjk-npruwxyéèêàùçîô]/.test(value)
);

const looksLikeCodeToken = (value) => {
    if (/^[_a-zA-Z][\w.-]*$/.test(value) && /[_-]/.test(value)) return true;
    if (/^[A-Z0-9_]+$/.test(value) && value.length > 3) return true;
    if (/^#[0-9A-Fa-f]{3,8}$/.test(value)) return true;
    if (/^\d+(\.\d+)?(px|rem|em|vh|vw|%)$/.test(value)) return true;
    if (/^\/[a-z0-9_./?=&{}:-]+$/i.test(value)) return true;
    if (/^[a-z]+\/[a-z0-9.+-]+$/i.test(value)) return true;
    if (/^https?:\/\//i.test(value)) return true;
    if (/^[a-z0-9_.-]+\.(js|css|png|jpg|jpeg|webp|svg|json)$/i.test(value)) return true;
    return false;
};

const isHumanText = (value) => {
    const text = normalizeText(value);
    if (!text || text.length < 2 || text.length > 220) return false;
    if (!/\p{L}/u.test(text)) return false;
    if (rejectExact.has(text)) return false;
    if (rejectContains.some((part) => text.includes(part))) return false;
    if (/^--/.test(text)) return false;
    if (/^[,;:.)?}]/.test(text)) return false;
    if (/[<>{}=;]/.test(text)) return false;
    if (/\b(style|className|onClick|onChange|set[A-Z]|const|return|function)\b/.test(text)) return false;
    if (looksLikeSvgPath(text)) return false;
    if (looksLikeCodeToken(text)) return false;
    if (/^[{}\[\]().,;:!?'"`+\-*/%<>=|&\s]+$/.test(text)) return false;
    if (/^[a-z]+:[a-z0-9_.-]+$/i.test(text)) return false;
    return true;
};

const templateToPattern = (raw) => {
    let index = 0;
    const pattern = normalizeText(raw.replace(/\$\{[^}]+\}/g, () => {
        index += 1;
        return `{{value${index}}}`;
    }));
    return index > 0 && isHumanText(pattern) ? pattern : "";
};

async function pathExists(target) {
    try {
        await fs.access(target);
        return true;
    } catch {
        return false;
    }
}

async function readJSON(file) {
    try {
        return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
        return null;
    }
}

const mergePhraseMaps = (base = {}, incoming = {}) => {
    const merged = { ...base };

    Object.entries(incoming || {}).forEach(([source, translated]) => {
        if (typeof translated !== "string") return;

        const existing = merged[source];
        const incomingIsIdentity = normalizeText(source) === normalizeText(translated);
        const existingIsTranslation = typeof existing === "string" && normalizeText(existing) !== normalizeText(source);

        if (incomingIsIdentity && existingIsTranslation) return;
        merged[source] = translated;
    });

    return merged;
};

async function walk(target) {
    if (!(await pathExists(target))) return [];
    const stat = await fs.stat(target);
    if (stat.isFile()) return /\.(js|jsx|mjs|ts|tsx)$/.test(target) ? [target] : [];

    const entries = await fs.readdir(target, { withFileTypes: true });
    const files = await Promise.all(entries.map((entry) => {
        if (entry.name === "node_modules" || entry.name === ".next") return [];
        return walk(path.join(target, entry.name));
    }));
    return files.flat();
}

function extractFromSource(source, phrases, patterns) {
    const jsxTextRegex = />([^<>{}][^<>{]*?)</g;
    for (const match of source.matchAll(jsxTextRegex)) {
        const text = normalizeText(match[1]);
        if (isHumanText(text)) phrases.add(text);
    }

    const propStringRegex = /\b(?:placeholder|title|aria-label|alt|label|shortLabel|addLabel|description)\s*=\s*(["'])(.*?)\1/g;
    for (const match of source.matchAll(propStringRegex)) {
        const text = normalizeText(unescapeString(match[2], match[1]));
        if (isHumanText(text)) phrases.add(text);
    }

    const objectStringRegex = /\b(?:label|shortLabel|title|subtitle|description|message|text|action|placeholder|empty|heading|caption|name)\s*:\s*(["'])(.*?)\1/g;
    for (const match of source.matchAll(objectStringRegex)) {
        const text = normalizeText(unescapeString(match[2], match[1]));
        if (isHumanText(text)) phrases.add(text);
    }

    const callStringRegex = /\b(?:alert|confirm|showToast|setLocalError|setErrorMsg|setError|window\.alert|window\.confirm|Error)\s*\(\s*(["'])(.*?)\1/g;
    for (const match of source.matchAll(callStringRegex)) {
        const text = normalizeText(unescapeString(match[2], match[1]));
        if (isHumanText(text)) phrases.add(text);
    }

    const callTemplateRegex = /\b(?:alert|confirm|showToast|setLocalError|setErrorMsg|setError|window\.alert|window\.confirm|Error)\s*\(\s*`([\s\S]*?)`/g;
    for (const match of source.matchAll(callTemplateRegex)) {
        const pattern = templateToPattern(match[1]);
        if (pattern) patterns.add(pattern);
    }
}

const uniquePatterns = (patterns) => {
    const seen = new Set();
    return patterns.filter((pattern) => {
        if (!pattern?.match || !pattern?.replace) return false;
        const key = `${pattern.match}|||${pattern.replace}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const sortObject = (source) => Object.fromEntries(
    Object.entries(source || {}).sort(([a], [b]) => collator.compare(a, b))
);

async function main() {
    const files = (await Promise.all(scanRoots.map((root) => walk(path.join(frontendRoot, root))))).flat();
    const phrases = new Set();
    const patterns = new Set();

    for (const file of files) {
        const source = await fs.readFile(file, "utf8");
        extractFromSource(source, phrases, patterns);
    }

    const sortedPhrases = Array.from(phrases).sort(collator.compare);
    const sortedPatternItems = Array.from(patterns).sort(collator.compare).map((pattern) => ({
        match: pattern,
        replace: pattern,
    }));

    for (const { locale, file } of localeFiles) {
        const baseCatalog = structuredClone(baseCatalogs[locale]);
        const existingCatalog = await readJSON(file);
        const nextPhrases = mergePhraseMaps(existingCatalog?.phrases, baseCatalog.phrases);
        for (const phrase of sortedPhrases) {
            if (!Object.prototype.hasOwnProperty.call(nextPhrases, phrase)) {
                nextPhrases[phrase] = phrase;
            }
        }

        const existingPatterns = Array.isArray(existingCatalog?.patterns) ? existingCatalog.patterns : [];
        const basePatterns = Array.isArray(baseCatalog.patterns) ? baseCatalog.patterns : [];
        const nextPatterns = uniquePatterns([...existingPatterns, ...basePatterns, ...sortedPatternItems]);

        const nextCatalog = {
            ...baseCatalog,
            ...existingCatalog,
            meta: { ...baseCatalog.meta, ...(existingCatalog?.meta || {}) },
            i18n: { ...baseCatalog.i18n, ...(existingCatalog?.i18n || {}) },
            phrases: sortObject(nextPhrases),
            patterns: nextPatterns,
        };

        await fs.writeFile(file, `${JSON.stringify(nextCatalog, null, 2)}\n`);
        console.log(`${locale}: ${Object.keys(nextCatalog.phrases).length} phrases, ${nextCatalog.patterns.length} patterns`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
