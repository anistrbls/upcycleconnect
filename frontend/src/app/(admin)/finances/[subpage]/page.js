"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PaymentsAdminView from "../../../components/admin/finances/PaymentsAdminView";
import CommissionsAdminView from "../../../components/admin/finances/CommissionsAdminView";
import SubscriptionsAdminView from "../../../components/admin/finances/SubscriptionsAdminView";
import FinancialOverviewView from "../../../components/admin/finances/FinancialOverviewView";
import MyPaymentsView from "../../../components/finances/MyPaymentsView";
import MySubscriptionView from "../../../components/finances/MySubscriptionView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";
import { getRoleFromToken } from "../../../lib/api";

export default function FinancesSubPage() {
    const params = useParams();
    const router = useRouter();
    const subpage = typeof params?.subpage === "string" ? params.subpage : "";
    const [role, setRole] = useState(null);

    useEffect(() => {
        setRole(getRoleFromToken());
    }, []);

    useEffect(() => {
        if (role === null) return;
        if (subpage === "factures") {
            router.replace("/finances/paiements");
        }
        if ((subpage === "commissions" || subpage === "abonnements" || subpage === "vue-financiere") && role !== "admin") {
            router.replace("/finances/paiements");
        }
        if (subpage === "abonnement" && role !== "professionnel") {
            router.replace("/finances/paiements");
        }
    }, [role, subpage, router]);

    if (role === null) {
        return <div className="panel" style={{ padding: "2.5rem", textAlign: "center" }}>Chargement…</div>;
    }

    if (subpage === "vue-financiere") {
        return <FinancialOverviewView />;
    }

    if (subpage === "paiements") {
        return role === "admin" ? <PaymentsAdminView /> : <MyPaymentsView />;
    }

    if (subpage === "commissions") {
        return <CommissionsAdminView />;
    }

    if (subpage === "abonnements") {
        return <SubscriptionsAdminView />;
    }

    if (subpage === "abonnement") {
        return <MySubscriptionView />;
    }

    const activeModule = getModuleByKey("finances");
    const activeSub = getSubNavItem(activeModule.key, subpage);
    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub?.label || subpage} />;
}
