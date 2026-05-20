"use client";

import { useState } from "react";

/** Image principale + vignettes si plusieurs photos. */
export default function ConseilDetailHero({ item }) {
    const photos = (item?.photos || []).filter((p) => String(p).trim());
    const list = photos.length ? photos : (item?.imageUrl ? [item.imageUrl] : []);
    const initial = list.findIndex((p) => p === item?.imageUrl);
    const [active, setActive] = useState(initial >= 0 ? initial : 0);

    if (!list.length) return null;
    const main = list[active] || list[0];

    return (
        <div className="conseil-detail__hero-block">
            <div className="conseil-detail__hero">
                <img src={main} alt={item?.title || ""} />
            </div>
            {list.length > 1 && (
                <div className="conseil-detail__hero-thumbs">
                    {list.map((url, idx) => (
                        <button
                            key={`${url}-${idx}`}
                            type="button"
                            className={`conseil-detail__hero-thumb${idx === active ? " conseil-detail__hero-thumb--active" : ""}`}
                            onClick={() => setActive(idx)}
                            title={idx === initial ? "Image principale" : "Voir cette image"}
                        >
                            <img src={url} alt="" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
