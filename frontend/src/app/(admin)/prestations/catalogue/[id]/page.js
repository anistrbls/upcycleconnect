"use client";

import { use } from "react";
import ServiceCatalogueDetailView from "../../../../components/user/prestations/ServiceCatalogueDetailView";
import { useCatalogueReadOnly } from "../../../../lib/useCatalogueReadOnly";

export default function PrestationCatalogueDetailPage({ params }) {
    const { id } = use(params);
    const { readOnly } = useCatalogueReadOnly();
    return <ServiceCatalogueDetailView serviceId={id} readOnly={readOnly} />;
}
