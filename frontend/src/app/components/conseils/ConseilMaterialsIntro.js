"use client";

import { Fragment } from "react";

/** Phrase « Vous aurez besoin de… » avec matériaux en gras. */
export default function ConseilMaterialsIntro({ materials }) {
    const items = (materials || []).map((m) => String(m).trim()).filter(Boolean);
    if (!items.length) return null;

    if (items.length === 1) {
        return (
            <>
                Vous aurez besoin de <strong>{items[0]}</strong>.
            </>
        );
    }
    if (items.length === 2) {
        return (
            <>
                Vous aurez besoin de <strong>{items[0]}</strong> et de <strong>{items[1]}</strong>.
            </>
        );
    }
    const last = items[items.length - 1];
    const rest = items.slice(0, -1);
    return (
        <>
            Vous aurez besoin de{" "}
            {rest.map((m, i) => (
                <Fragment key={`${m}-${i}`}>
                    {i > 0 ? ", " : null}
                    <strong>{m}</strong>
                </Fragment>
            ))}
            {" et de "}
            <strong>{last}</strong>.
        </>
    );
}
