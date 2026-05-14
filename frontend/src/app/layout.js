import "./globals.css";

export const metadata = {
    title: "UpcycleConnect – Admin",
    description: "Interface d'administration UpcycleConnect",
};

export default function RootLayout({ children }) {
    return (
        <html lang="fr">
            <head>
                <meta charSet="utf-8" />
            </head>
            <body>{children}</body>
        </html>
    );
}
