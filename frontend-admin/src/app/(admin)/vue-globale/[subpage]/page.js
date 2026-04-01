import DashboardModuleView from "../../../components/admin/dashboard/DashboardModuleView";
import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default async function GlobalSubPage({ params }) {
    const { subpage } = await params;
    const activeModule = getModuleByKey("vue-globale");
    const activeSub = getSubNavItem(activeModule.key, subpage);

    if (["vue-generale", "kpis-stats", "activite-temps-reel", "alertes"].includes(subpage)) {
        return <DashboardModuleView subpage={subpage} title={activeSub.label} />;
    }

    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub.label} />;
}
