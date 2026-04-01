import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default async function FinancesSubPage({ params }) {
    const { subpage } = await params;
    const activeModule = getModuleByKey("finances");
    const activeSub = getSubNavItem(activeModule.key, subpage);
    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub.label} />;
}
