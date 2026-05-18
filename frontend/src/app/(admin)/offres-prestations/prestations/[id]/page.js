"use client";

import { use } from "react";
import ServiceConsultationView from "../../../../components/admin/offers/ServiceConsultationView";

export default function ServiceConsultationPage({ params }) {
    const { id } = use(params);
    return <ServiceConsultationView serviceId={id} />;
}
