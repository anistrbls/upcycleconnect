"use client";

import { useState, useEffect, useRef } from "react";
import { apiUrl } from "../lib/api";

/**
 * CityAutocomplete - Composant réutilisable pour l'autocomplétion Ville / Code Postal
 * 
 * Props:
 *   - label: string - libellé du label
 *   - placeholder: string - placeholder input
 *   - value: string - valeur actuelle
 *   - onChange: function(newValue) - callback quand l'utilisateur sélectionne ou tape
 *   - country: string - pays pour filtrer les suggestions
 *   - disabled: boolean - disabled le champ
 *   - style: object - style inline additionnel
 *   - onSelectSuggestion: function(suggestion) - callback spécifique si une suggestion est sélectionnée (ville + code postal)
 */
export function CityAutocomplete({
    label,
    placeholder,
    value,
    onChange,
    country = "France",
    disabled = false,
    style = {},
    onSelectSuggestion,
    isZipCode = false,
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);

    const baseInputStyle = {
        padding: "0.8rem 1rem",
        borderRadius: "14px",
        border: "none",
        fontSize: "0.95rem",
        outline: "none",
        transition: "all 0.2s ease",
        background: "#FFFFFF",
        color: "var(--text-main)",
        fontFamily: "inherit",
        width: "100%",
        ...style,
    };

    const handleInputChange = (e) => {
        const newVal = e.target.value;
        onChange(newVal);

        // Debounce API call
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (newVal.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `${apiUrl("/cities-search")}?q=${encodeURIComponent(newVal)}&country=${encodeURIComponent(country)}`
                );
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data.results || []);
                    setShowSuggestions(true);
                } else {
                    setSuggestions([]);
                }
            } catch (err) {
                console.error("City search error:", err);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 300);
    };

    const handleSelectSuggestion = (suggestion) => {
        onChange(isZipCode ? suggestion.zip_code : suggestion.city);
        setSuggestions([]);
        setShowSuggestions(false);

        // Callback spécifique si fourni
        if (onSelectSuggestion) {
            onSelectSuggestion(suggestion);
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem", position: "relative" }} ref={containerRef}>
            {label && (
                <label style={{ fontSize: "0.85rem", fontWeight: "500", color: "var(--text-muted)", marginLeft: "0.2rem" }}>
                    {label}
                </label>
            )}
            <div style={{ position: "relative" }}>
                <input
                    style={baseInputStyle}
                    placeholder={placeholder}
                    value={value}
                    onChange={handleInputChange}
                    disabled={disabled}
                    autoComplete="off"
                />
                {loading && (
                    <div style={{
                        position: "absolute",
                        right: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        animation: "spin 1s linear infinite"
                    }}>
                        ⟳
                    </div>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 0.5rem)",
                    left: 0,
                    right: 0,
                    background: "#FFFFFF",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    zIndex: 100,
                    maxHeight: "240px",
                    overflowY: "auto",
                }}>
                    {suggestions.map((suggestion, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSuggestion(suggestion)}
                            style={{
                                display: "block",
                                width: "100%",
                                padding: "0.75rem 1rem",
                                textAlign: "left",
                                border: "none",
                                background: idx === 0 ? "rgba(62,104,108,0.06)" : "transparent",
                                cursor: "pointer",
                                transition: "background 0.15s ease",
                                fontSize: "0.9rem",
                                color: "var(--text-main)",
                                borderBottom: idx < suggestions.length - 1 ? "1px solid rgba(35,59,61,0.04)" : "none",
                                fontFamily: "inherit",
                            }}
                            onMouseEnter={(e) => e.target.style.background = "rgba(62,104,108,0.06)"}
                            onMouseLeave={(e) => e.target.style.background = idx === 0 ? "rgba(62,104,108,0.06)" : "transparent"}
                        >
                            <strong>{isZipCode ? suggestion.zip_code : suggestion.city}</strong>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: "0.5rem" }}>
                                {suggestion.full_text.split(" ").slice(-2).join(" ")}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {showSuggestions && suggestions.length === 0 && value.length >= 2 && !loading && (
                <div style={{
                    position: "absolute",
                    top: "calc(100% + 0.5rem)",
                    left: 0,
                    right: 0,
                    background: "#FFFFFF",
                    borderRadius: "14px",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    zIndex: 100,
                    padding: "1rem",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                }}>
                    Aucun résultat trouvé
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: translateY(-50%) rotate(0deg); }
                    to { transform: translateY(-50%) rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
