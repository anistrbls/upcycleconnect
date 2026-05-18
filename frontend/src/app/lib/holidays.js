/**
 * Calcule les jours fériés français pour une année donnée.
 */
export function getFrenchPublicHolidays(year) {
    const holidays = {};

    // Dates fixes
    holidays[`${year}-01-01`] = "Jour de l'an";
    holidays[`${year}-05-01`] = "Fête du Travail";
    holidays[`${year}-05-08`] = "Victoire 1945";
    holidays[`${year}-07-14`] = "Fête Nationale";
    holidays[`${year}-08-15`] = "Assomption";
    holidays[`${year}-11-01`] = "Toussaint";
    holidays[`${year}-11-11`] = "Armistice 1918";
    holidays[`${year}-12-25`] = "Noël";

    // Dates mobiles (basées sur Pâques)
    const easter = getEasterDate(year);
    
    // Lundi de Pâques (Pâques + 1 jour)
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    holidays[formatDate(easterMonday)] = "Lundi de Pâques";

    // Ascension (Pâques + 39 jours)
    const ascension = new Date(easter);
    ascension.setDate(easter.getDate() + 39);
    holidays[formatDate(ascension)] = "Ascension";

    // Lundi de Pentecôte (Pâques + 50 jours)
    const pentecostMonday = new Date(easter);
    pentecostMonday.setDate(easter.getDate() + 50);
    holidays[formatDate(pentecostMonday)] = "Lundi de Pentecôte";

    // Gestion des reports (si dimanche -> lundi férié aussi)
    const finalHolidays = { ...holidays };
    Object.keys(holidays).forEach(dateStr => {
        // On crée la date en local pour éviter les décalages
        const parts = dateStr.split("-");
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        
        if (d.getDay() === 0) { // Dimanche
            const monday = new Date(d);
            monday.setDate(d.getDate() + 1);
            finalHolidays[formatDate(monday)] = holidays[dateStr];
        }
    });

    return finalHolidays;
}

function formatDate(date) {
    if (!date) return "";
    const Y = date.getFullYear();
    const M = String(date.getMonth() + 1).padStart(2, "0");
    const D = String(date.getDate()).padStart(2, "0");
    return `${Y}-${M}-${D}`;
}

// Algorithme de Butcher-Meeus pour le calcul de Pâques
function getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}
