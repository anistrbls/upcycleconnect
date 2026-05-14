/**
 * Commission plateforme en centimes (aligné sur l'API Go : arrondi au centime sur le prix annonce).
 * @param {number|string} priceEuros
 * @param {number|string} percent
 */
export function saleCommissionFeeCents(priceEuros, percent) {
    const baseCents = Math.round(Number(priceEuros) * 100);
    if (!Number.isFinite(baseCents) || baseCents <= 0) return 0;
    const p = Number(percent);
    if (!Number.isFinite(p) || p <= 0) return 0;
    return Math.round((baseCents * p) / 100);
}

function parseSalePercent(item) {
    const raw = item?.saleCommissionPercent ?? item?.sale_commission_percent;
    const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

function isSaleCommissionAdded(item) {
    if (!item || item.type === "don") return false;
    const mode = String(item.saleCommissionMode ?? item.sale_commission_mode ?? "").toLowerCase();
    return mode === "added";
}

/**
 * Détail prix côté acheteur (centimes).
 * @returns {{ baseCents: number, feeCents: number, totalCents: number, saleModeAdded: boolean }}
 */
export function buyerPriceBreakdown(item) {
    if (!item || item.type === "don") {
        return { baseCents: 0, feeCents: 0, totalCents: 0, saleModeAdded: false };
    }
    const saleModeAdded = isSaleCommissionAdded(item);
    const salePercent = parseSalePercent(item);
    const baseCents = Math.round(Number(item.price || 0) * 100);
    const feeCents = saleModeAdded ? saleCommissionFeeCents(item.price, salePercent) : 0;
    const totalCents = saleModeAdded && feeCents > 0 ? baseCents + feeCents : baseCents;
    return { baseCents, feeCents, totalCents, saleModeAdded };
}

/** Total payé par l'acheteur (centimes). */
export function buyerTotalCentsFromItem(item) {
    return buyerPriceBreakdown(item).totalCents;
}

/** Libellé prix sur carte (vue acheteur) : GRATUIT ou montant TTC si commission « added ». */
export function formatBuyerCardPrice(item) {
    if (!item || item.type === "don") return "GRATUIT";
    const cents = buyerTotalCentsFromItem(item);
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(cents / 100);
}
