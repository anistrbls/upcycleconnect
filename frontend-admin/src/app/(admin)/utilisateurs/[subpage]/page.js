"use client";

import { use } from "react";
import UsersAdminView from "../../../components/admin/users/UsersAdminView";

export default function UsersSubPage({ params }) {
    const { subpage } = use(params);
    return <UsersAdminView subpage={subpage} />;
}
