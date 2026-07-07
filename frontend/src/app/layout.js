import "./globals.css";
import I18nProvider from "./components/i18n/I18nProvider";
import { ToastProvider } from "./components/shared/ToastContext";

export const metadata = {
    title: "UpcycleConnect – Admin",
    description: "Interface d'administration UpcycleConnect",
};

export default function RootLayout({ children }) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <head>
                <meta charSet="utf-8" />
            </head>
            <body>
                <I18nProvider>
                    <ToastProvider>
                        {children}
                    </ToastProvider>
                </I18nProvider>
            </body>
        </html>
    );
}
