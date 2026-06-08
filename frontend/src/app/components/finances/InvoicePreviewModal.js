"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Printer, X, Sparkles, CheckCircle } from "lucide-react";
import { jsPDF } from "jspdf";

export default function InvoicePreviewModal({ open, payment, onClose }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!open || !payment || !mounted) return null;

    const invoiceDate = new Date(payment.date || new Date());
    const year = invoiceDate.getFullYear();
    const month = String(invoiceDate.getMonth() + 1).padStart(2, "0");
    const day = String(invoiceDate.getDate()).padStart(2, "0");
    const shortRef = payment.transactionRef ? payment.transactionRef.slice(4, 12) : "000000";
    const invoiceNumber = `FA-${year}${month}${day}-${payment.sourceId || "0"}-${shortRef}`;

    const amount = Number(payment.amount) || 0;
    const rateHT = 1.20; // 20% TVA in France
    const amountHT = amount / rateHT;
    const amountTVA = amount - amountHT;

    const formatAmount = (val) =>
        new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(val);

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        
        // --- Header / Branding ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(46, 92, 96); // UpcycleConnect Signature color: #2e5c60
        doc.text("UpcycleConnect", 20, 25);
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(110, 110, 110);
        doc.text("UpcycleConnect SAS", 20, 32);
        doc.text("123 Rue de la Récupération, 75001 Paris", 20, 37);
        doc.text("SIRET: 98765432100012 | TVA Intracom: FR 88 987654321", 20, 42);
        
        // --- Document Title (Facture) ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59); // dark blue/gray
        doc.text("FACTURE", 140, 25);
        
        // --- Document Meta ---
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(`Numéro : ${invoiceNumber}`, 140, 32);
        doc.text(`Date d'émission : ${invoiceDate.toLocaleDateString("fr-FR")}`, 140, 37);
        doc.text("Moyen de paiement : Stripe", 140, 42);
        
        // Line separator
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(20, 48, 190, 48);
        
        // --- Parties info (Client / Supplier) ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text("Destinataire :", 20, 60);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(payment.userName || "Client UpcycleConnect", 20, 66);
        if (payment.userId) {
            doc.text(`ID Client : #USR-${payment.userId}`, 20, 71);
        }
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Facturé par :", 120, 60);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("UpcycleConnect France", 120, 66);
        doc.text("Relation Clients", 120, 71);
        doc.text("support@upcycleconnect.fr", 120, 76);

        // Line separator
        doc.line(20, 84, 190, 84);
        
        // --- Table Headers ---
        doc.setFillColor(241, 245, 249);
        doc.rect(20, 92, 170, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text("Désignation", 22, 97);
        doc.text("Qté", 115, 97);
        doc.text("Prix Unit. HT", 128, 97);
        doc.text("TVA", 152, 97);
        doc.text("Total TTC", 172, 97);
        
        // --- Table Rows ---
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        
        // Wrap text for designation if it's too long
        const textDesc = payment.entityName || `Prestation (${payment.source})`;
        doc.text(textDesc, 22, 107);
        doc.text("1", 117, 107);
        doc.text(`${amountHT.toFixed(2)} €`, 128, 107);
        doc.text("20 %", 152, 107);
        doc.text(`${amount.toFixed(2)} €`, 172, 107);
        
        doc.line(20, 112, 190, 112);
        
        // --- Totals ---
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text("Total Hors Taxes (HT) :", 160, 125, { align: "right" });
        doc.text(`${amountHT.toFixed(2)} €`, 190, 125, { align: "right" });
        
        doc.text("Montant TVA (20%) :", 160, 130, { align: "right" });
        doc.text(`${amountTVA.toFixed(2)} €`, 190, 130, { align: "right" });
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(46, 92, 96); // UpcycleConnect Signature color for high visibility
        doc.text("Total TTC (Payé) :", 160, 138, { align: "right" });
        doc.text(`${amount.toFixed(2)} €`, 190, 138, { align: "right" });

        // --- Status Badge on PDF ---
        doc.setFillColor(236, 253, 245); // Light green background
        doc.rect(20, 150, 45, 10, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(5, 150, 105); // Green text
        doc.text("FACTURE ACQUITTEE", 24, 156);

        // --- Footer Notice ---
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Ce document tient lieu de justificatif de paiement pour les prestations de services fournies par UpcycleConnect.", 20, 185);
        doc.text("Pour toute réclamation ou question concernant votre facturation, veuillez nous contacter à l'adresse support@upcycleconnect.fr", 20, 190);
        doc.text("UpcycleConnect SAS – Capital social de 10 000 € – R.C.S. Paris B 987 654 321", 20, 195);
        
        doc.save(`Facture_${invoiceNumber}.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="invoice-modal-overlay" onClick={onClose}>
            <div className="invoice-modal-card" onClick={(e) => e.stopPropagation()}>
                
                {/* Modal Toolbar */}
                <div className="invoice-toolbar">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div className="invoice-badge">
                            <FileText size={16} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "1rem" }}>Aperçu Facture</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{invoiceNumber}</div>
                        </div>
                    </div>
                    
                    <div className="toolbar-actions">
                        <button type="button" className="toolbar-btn primary" onClick={handleDownloadPDF} title="Télécharger en PDF">
                            <Download size={15} />
                            <span>Télécharger PDF</span>
                        </button>
                        <button type="button" className="toolbar-btn" onClick={handlePrint} title="Imprimer">
                            <Printer size={15} />
                            <span>Imprimer</span>
                        </button>
                        <button type="button" className="toolbar-close-btn" onClick={onClose} title="Fermer">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable Invoice Page Content */}
                <div className="invoice-scroll-area">
                    <div className="invoice-document" id="printable-invoice-content">
                        
                        {/* Header */}
                        <div className="invoice-doc-header">
                            <div>
                                <div className="brand-logo">
                                    <Sparkles size={20} className="brand-icon" />
                                    <span>UpcycleConnect</span>
                                </div>
                                <div className="company-details">
                                    <p className="company-name">UpcycleConnect SAS</p>
                                    <p>123 Rue de la Récupération, 75001 Paris</p>
                                    <p>SIRET : 98765432100012 | TVA Intracom : FR 88 987654321</p>
                                </div>
                            </div>
                            
                            <div style={{ textAlign: "right" }}>
                                <h2 className="doc-title">FACTURE</h2>
                                <div className="invoice-meta-grid">
                                    <div>Numéro :</div>
                                    <div style={{ fontWeight: 600 }}>{invoiceNumber}</div>
                                    <div>Date :</div>
                                    <div>{invoiceDate.toLocaleDateString("fr-FR")}</div>
                                    <div>Statut :</div>
                                    <div>
                                        <span className="pay-badge">
                                            <CheckCircle size={11} style={{ marginRight: "3px" }} />
                                            Acquittée
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="divider" />

                        {/* Bill Info */}
                        <div className="invoice-parties">
                            <div className="party-box">
                                <h4 className="party-title">Facturé à :</h4>
                                <p className="party-name">{payment.userName || "Client UpcycleConnect"}</p>
                                {payment.userId && <p className="party-detail">ID Utilisateur : #USR-{payment.userId}</p>}
                                <p className="party-detail">Relation Client UpcycleConnect</p>
                            </div>
                            
                            <div className="party-box">
                                <h4 className="party-title">Émetteur :</h4>
                                <p className="party-name">UpcycleConnect France</p>
                                <p className="party-detail">Département Facturation & Finances</p>
                                <p className="party-detail">support@upcycleconnect.fr</p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="invoice-table-wrapper">
                            <table className="invoice-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: "left" }}>Description</th>
                                        <th style={{ textAlign: "center", width: "40px" }}>Qté</th>
                                        <th style={{ textAlign: "right" }}>Prix Unit. HT</th>
                                        <th style={{ textAlign: "center", width: "80px" }}>TVA (20%)</th>
                                        <th style={{ textAlign: "right" }}>Total TTC</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ textAlign: "left", fontWeight: 600 }}>
                                            {payment.entityName || `Prestation (${payment.source})`}
                                            <div style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--text-muted)", marginTop: "2px" }}>
                                                Service / Produit issu de la plateforme UpcycleConnect (Type : {payment.source})
                                            </div>
                                        </td>
                                        <td style={{ textAlign: "center" }}>1</td>
                                        <td style={{ textAlign: "right" }}>{formatAmount(amountHT)}</td>
                                        <td style={{ textAlign: "center" }}>20%</td>
                                        <td style={{ textAlign: "right", fontWeight: 700 }}>{formatAmount(amount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Summary Grid */}
                        <div className="invoice-summary-section">
                            <div className="payment-note">
                                <h4>Informations de paiement :</h4>
                                <p>Mode de règlement : Carte Bancaire via Stripe</p>
                                {payment.transactionRef && (
                                    <p style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                        ID Transaction : {payment.transactionRef}
                                    </p>
                                )}
                                <p style={{ marginTop: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }} className="acquittee-banner">
                                    <CheckCircle size={13} /> Facture réglée en totalité le {invoiceDate.toLocaleDateString("fr-FR")}
                                </p>
                            </div>
                            
                            <div className="totals-table">
                                <div className="totals-row">
                                    <span>Total Hors Taxes (HT) :</span>
                                    <span>{formatAmount(amountHT)}</span>
                                </div>
                                <div className="totals-row">
                                    <span>TVA (20.00%) :</span>
                                    <span>{formatAmount(amountTVA)}</span>
                                </div>
                                <hr className="summary-divider" />
                                <div className="totals-row total-ttc">
                                    <span>Total TTC (Acquitté) :</span>
                                    <span>{formatAmount(amount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer legal notes */}
                        <div className="invoice-footer">
                            <p>Pour toute question concernant cette facture, contactez notre équipe support@upcycleconnect.fr</p>
                            <p style={{ marginTop: "0.25rem", fontWeight: 500 }}>
                                UpcycleConnect SAS – Capital de 10 000 € – R.C.S. Paris B 987 654 321
                            </p>
                            <p style={{ fontSize: "0.7rem", marginTop: "0.5rem" }}>
                                Merci d'avoir choisi UpcycleConnect pour un avenir plus circulaire et responsable ! 🌿
                            </p>
                        </div>

                    </div>
                </div>
            </div>

            <style jsx>{`
                .invoice-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.25s ease-out;
                    padding: 1.5rem;
                }
                .invoice-modal-card {
                    background: var(--surface-main, #ffffff);
                    width: 100%;
                    max-width: 840px;
                    height: calc(100vh - 3rem);
                    max-height: 940px;
                    border-radius: 24px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    border: 1px solid var(--border-color, #e2e8f0);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .invoice-toolbar {
                    padding: 1rem 1.5rem;
                    background: var(--surface-main, #ffffff);
                    border-bottom: 1px solid var(--border-color, #e2e8f0);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                }
                .invoice-badge {
                    padding: 8px;
                    background: #ecfdf5;
                    color: #059669;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .toolbar-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .toolbar-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: 999px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    background: var(--surface-sunken, #f8fafc);
                    color: var(--text-main, #0f172a);
                    border: 1px solid var(--border-color, #cbd5e1);
                    transition: all 0.2s;
                }
                .toolbar-btn:hover {
                    background: var(--surface-hover, #f1f5f9);
                }
                .toolbar-btn.primary {
                    background: #2e5c60;
                    color: #ffffff;
                    border-color: #2e5c60;
                }
                .toolbar-btn.primary:hover {
                    background: #23474a;
                    border-color: #23474a;
                }
                .toolbar-close-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted, #64748b);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                .toolbar-close-btn:hover {
                    background: rgba(0, 0, 0, 0.05);
                }
                
                .invoice-scroll-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 2rem;
                    background: #f1f5f9;
                }
                
                /* Invoice Sheet (A4 styling) */
                .invoice-document {
                    background: #ffffff;
                    width: 100%;
                    min-height: 800px;
                    margin: 0 auto;
                    padding: 3rem;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    color: #0f172a;
                    font-family: 'Inter', -apple-system, sans-serif;
                    box-sizing: border-box;
                    border-radius: 8px;
                }
                .invoice-doc-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2rem;
                }
                .brand-logo {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #2e5c60;
                    margin-bottom: 0.75rem;
                }
                .brand-icon {
                    color: #2e5c60;
                }
                .company-details p {
                    margin: 0;
                    font-size: 0.82rem;
                    color: #64748b;
                    line-height: 1.4;
                }
                .company-details .company-name {
                    font-weight: 700;
                    color: #0f172a;
                }
                .doc-title {
                    font-size: 1.75rem;
                    font-weight: 900;
                    color: #1e293b;
                    margin: 0 0 0.5rem;
                    letter-spacing: 0.05em;
                }
                .invoice-meta-grid {
                    display: grid;
                    grid-template-columns: auto auto;
                    gap: 0.35rem 1rem;
                    font-size: 0.82rem;
                    color: #64748b;
                }
                .pay-badge {
                    display: inline-flex;
                    align-items: center;
                    background: #ecfdf5;
                    color: #059669;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                }
                .divider {
                    border: none;
                    border-top: 1px solid #cbd5e1;
                    margin: 1.5rem 0;
                }
                
                .invoice-parties {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                    margin-bottom: 2.5rem;
                }
                .party-box {
                    background: #f8fafc;
                    padding: 1.25rem;
                    border-radius: 16px;
                    border: 1px solid #f1f5f9;
                }
                .party-title {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    margin: 0 0 0.5rem 0;
                    letter-spacing: 0.05em;
                }
                .party-name {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0 0 0.35rem 0;
                }
                .party-detail {
                    font-size: 0.82rem;
                    color: #64748b;
                    margin: 0;
                    line-height: 1.4;
                }
                
                .invoice-table-wrapper {
                    margin-bottom: 2rem;
                }
                .invoice-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .invoice-table th {
                    background: #f1f5f9;
                    color: #475569;
                    padding: 0.75rem 1rem;
                    font-size: 0.78rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    border-bottom: 2px solid #cbd5e1;
                }
                .invoice-table td {
                    padding: 1.25rem 1rem;
                    font-size: 0.88rem;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                .invoice-summary-section {
                    display: flex;
                    justify-content: space-between;
                    gap: 2rem;
                    margin-bottom: 3rem;
                }
                .payment-note {
                    flex: 1;
                    max-width: 50%;
                }
                .payment-note h4 {
                    font-size: 0.82rem;
                    margin: 0 0 0.5rem;
                }
                .payment-note p {
                    font-size: 0.82rem;
                    color: #64748b;
                    margin: 0 0 0.25rem;
                }
                .acquittee-banner {
                    color: #059669;
                    background: #ecfdf5;
                    font-weight: 700;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 0.78rem;
                }
                .totals-table {
                    width: 280px;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .totals-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.85rem;
                    color: #64748b;
                }
                .totals-row span:last-child {
                    font-weight: 600;
                    color: #0f172a;
                }
                .summary-divider {
                    border: none;
                    border-top: 1px solid #e2e8f0;
                    margin: 0.25rem 0;
                }
                .totals-row.total-ttc {
                    font-size: 1.05rem;
                    font-weight: 800;
                    color: #0f172a;
                }
                .totals-row.total-ttc span:last-child {
                    font-size: 1.15rem;
                    font-weight: 900;
                    color: #2e5c60;
                }
                
                .invoice-footer {
                    text-align: center;
                    border-top: 1px solid #cbd5e1;
                    padding-top: 2rem;
                    color: #94a3b8;
                    font-size: 0.75rem;
                }
                .invoice-footer p {
                    margin: 0;
                    line-height: 1.4;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                /* Print Stylesheet */
                @media print {
                    .invoice-modal-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: #ffffff !important;
                        padding: 0 !important;
                    }
                    .invoice-modal-card {
                        border: none !important;
                        box-shadow: none !important;
                        height: auto !important;
                        max-height: none !important;
                        width: 100% !important;
                        max-width: none !important;
                        overflow: visible !important;
                    }
                    .invoice-toolbar {
                        display: none !important;
                    }
                    .invoice-scroll-area {
                        background: #ffffff !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    .invoice-document {
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: 0 !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #printable-invoice-content, #printable-invoice-content * {
                        visibility: visible;
                    }
                    #printable-invoice-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
