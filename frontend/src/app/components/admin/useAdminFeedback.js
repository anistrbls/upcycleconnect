"use client";

import { useCallback, useRef, useState } from "react";
import AdminConfirmModal from "./AdminConfirmModal";
import AdminToast from "./AdminToast";

export function useAdminFeedback() {
    const [toast, setToast] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const toastTimerRef = useRef(null);

    const showToast = useCallback((message, variant = "success") => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ message, variant });
        toastTimerRef.current = setTimeout(() => setToast(null), 4000);
    }, []);

    const closeConfirm = useCallback(() => setConfirm(null), []);

    const askConfirm = useCallback(({ title, message, confirmLabel, cancelLabel, tone, onConfirm }) => {
        setConfirm({ title, message, confirmLabel, cancelLabel, tone, onConfirm });
    }, []);

    const FeedbackUI = (
        <>
            <AdminToast open={Boolean(toast)} message={toast?.message} variant={toast?.variant} />
            <AdminConfirmModal
                open={Boolean(confirm)}
                title={confirm?.title || ""}
                message={confirm?.message || ""}
                confirmLabel={confirm?.confirmLabel}
                cancelLabel={confirm?.cancelLabel}
                tone={confirm?.tone}
                onClose={closeConfirm}
                onConfirm={confirm?.onConfirm}
            />
        </>
    );

    return { showToast, askConfirm, closeConfirm, FeedbackUI };
}
