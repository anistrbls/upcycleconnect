"use client";

import ConseilMaterialsIntro from "./ConseilMaterialsIntro";

/** Corps du conseil (intro matériaux + texte). */
export default function ConseilDetailBody({ item }) {
    const body = (item?.body || "").trim();
    const hasMaterials = (item?.materials || []).some((m) => String(m).trim());

    if (!body && !hasMaterials) return null;

    return (
        <div className="conseil-detail__article">
            {hasMaterials && (
                <p className="conseil-detail__materials-intro">
                    <ConseilMaterialsIntro materials={item.materials} />
                </p>
            )}
            {body && <p className="conseil-detail__body">{body}</p>}
        </div>
    );
}
