"use client";

import React, { useState, useEffect, useRef } from "react";
import { apiUrl, buildAuthHeaders } from "../../lib/api";

export default function MentionTextarea({ value, onChange, placeholder, rows = 5, style, autoFocus, ...props }) {
    const [mentionSearch, setMentionSearch] = useState(null); // { query: "", startIndex: 0 }
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const textareaRef = useRef(null);

    // Fetch users with debounce
    useEffect(() => {
        if (!mentionSearch) {
            setUsers([]);
            return;
        }
        const timer = setTimeout(async () => {
            if (mentionSearch.query.length < 1) {
                setUsers([]);
                return;
            }
            setLoading(true);
            try {
                const res = await fetch(apiUrl(`/forum/users/search?q=${encodeURIComponent(mentionSearch.query)}`), {
                    headers: buildAuthHeaders()
                });
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data.items || []);
                    setSelectedIndex(0);
                }
            } catch (err) {
                console.error("Erreur recherche mentions:", err);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [mentionSearch?.query]);

    // Track input
    const handleChange = (e) => {
        const val = e.target.value;
        const cursorPosition = e.target.selectionStart;
        onChange(e);

        // Check if cursor is right after a word starting with @
        const textBeforeCursor = val.substring(0, cursorPosition);
        const match = textBeforeCursor.match(/@([a-zA-ZÀ-ÿ-]*)$/);

        if (match) {
            setMentionSearch({ query: match[1], startIndex: cursorPosition - match[1].length - 1 });
        } else {
            setMentionSearch(null);
        }
    };

    const insertMention = (user) => {
        if (!mentionSearch) return;
        const textBefore = value.substring(0, mentionSearch.startIndex);
        // Replace spaces by dashes or just use firstname if we prefer exact match for the parser
        // Our Go regex is `@([a-zA-ZÀ-ÿ-]+)`
        const mentionText = `@${user.firstname.replace(/\s+/g, "-")} `;
        const textAfter = value.substring(textareaRef.current.selectionStart);
        
        const newVal = textBefore + mentionText + textAfter;
        onChange({ target: { value: newVal } });
        setMentionSearch(null);
        
        // Restore focus
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newPos = textBefore.length + mentionText.length;
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const handleKeyDown = (e) => {
        if (mentionSearch && users.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % users.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                insertMention(users[selectedIndex]);
            } else if (e.key === "Escape") {
                setMentionSearch(null);
            }
        }
    };

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
                style={{ ...style, position: "relative", zIndex: 1 }}
                autoFocus={autoFocus}
                {...props}
            />
            {mentionSearch && (users.length > 0 || loading) && (
                <div style={{
                    position: "absolute",
                    top: "100%", // Display just below the textarea
                    left: 0,
                    width: "250px",
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    zIndex: 1000,
                    marginTop: "4px",
                    overflow: "hidden"
                }}>
                    {loading && users.length === 0 ? (
                        <div style={{ padding: "8px 12px", fontSize: "0.85rem", color: "#666" }}>Recherche...</div>
                    ) : (
                        <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "200px", overflowY: "auto" }}>
                            {users.map((u, idx) => (
                                <li
                                    key={u.id}
                                    onClick={() => insertMention(u)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    style={{
                                        padding: "8px 12px",
                                        cursor: "pointer",
                                        background: selectedIndex === idx ? "#f0f4f8" : "transparent",
                                        color: "#333",
                                        fontSize: "0.85rem",
                                        borderBottom: "1px solid #f0f0f0"
                                    }}
                                >
                                    <span style={{ fontWeight: 600 }}>{u.firstname}</span> {u.lastname}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
