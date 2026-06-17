"use client";

import { useI18n } from "./I18nProvider";

export default function LanguageSwitcher({ variant = "topbar" }) {
    const { locale, languages, setLocale, t } = useI18n();
    const selected = languages.find((language) => language.code === locale) || languages[0];
    const compact = variant === "topbar";

    return (
        <label
            className={`language-switcher language-switcher--${variant}`}
            title={t("i18n.language", "Langue")}
            data-i18n-skip="true"
        >
            <span className="language-switcher__label">
                {compact ? selected?.code?.toUpperCase() : t("i18n.language", "Langue")}
            </span>
            <select
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
                aria-label={t("i18n.language", "Langue")}
            >
                {languages.map((language) => (
                    <option key={language.code} value={language.code}>
                        {compact ? language.code.toUpperCase() : language.nativeLabel || language.label || language.code}
                    </option>
                ))}
            </select>
        </label>
    );
}
