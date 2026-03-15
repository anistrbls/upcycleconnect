import ModulePlaceholder from "../../../components/admin/ModulePlaceholder";
import { getModuleByKey, getSubNavItem } from "../../../lib/constants";

export default async function OperationsSubPage({ params }) {
    const { subpage } = await params;
    const activeModule = getModuleByKey("operations");
    const activeSub = getSubNavItem(activeModule.key, subpage);
    return <ModulePlaceholder moduleLabel={activeModule.label} subLabel={activeSub.label} />;
}
