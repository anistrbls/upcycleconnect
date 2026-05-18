"use client";

import { Suspense, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import ServiceBookingWeekView from "../../../../../components/user/prestations/ServiceBookingWeekView";
import { useCatalogueReadOnly } from "../../../../../lib/useCatalogueReadOnly";

function BookingWeekContent({ serviceId }) {
    return <ServiceBookingWeekView serviceId={serviceId} />;
}

export default function ServiceBookingPage({ params }) {
    const { id } = use(params);
    const router = useRouter();
    const { readOnly, checked } = useCatalogueReadOnly();

    useEffect(() => {
        if (checked && readOnly) {
            router.replace(`/prestations/catalogue/${id}`);
        }
    }, [checked, readOnly, id, router]);

    if (!checked || readOnly) {
        return <p style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Chargement…</p>;
    }

    return (
        <Suspense fallback={<p style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Chargement du planning…</p>}>
            <BookingWeekContent serviceId={id} />
        </Suspense>
    );
}
