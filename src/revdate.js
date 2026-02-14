/* revdate.js
 *
 * French Republican Calendar calculations
 * Based on the calendar adopted during the French Revolution (1792)
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

// Translation function - will be set by setTranslationFunction()
let _ = (str) => str;

/**
 * Set the translation function for translatable strings
 * @param {Function} gettext - The gettext function from Extension
 */
export function setTranslationFunction(gettext) {
    _ = gettext;
}

/**
 * Get translated month names
 */
function getMonthNames() {
    return [
        _("Vendémiaire"), _("Brumaire"), _("Frimaire"),
        _("Nivôse"), _("Pluviôse"), _("Ventôse"),
        _("Germinal"), _("Floréal"), _("Prairial"),
        _("Messidor"), _("Thermidor"), _("Fructidor"),
        _("Sansculottides")
    ];
}

/**
 * Get translated day names
 */
function getDayNames() {
    return [
        _("Raisin"), _("Safran"), _("Châtaigne"), _("Colchique"), _("Cheval"), _("Balsamine"), _("Carotte"), _("Amaranthe"), _("Panais"), _("Cuve"),
        _("Pomme de terre"), _("Immortelle"), _("Potiron"), _("Réséda"), _("Âne"), _("Belle de nuit"), _("Citrouille"), _("Sarrasin"), _("Tournesol"), _("Pressoir"),
        _("Chanvre"), _("Pêche"), _("Navet"), _("Amaryllis"), _("Bœuf"), _("Aubergine"), _("Piment"), _("Tomate"), _("Orge"), _("Tonneau"),
        _("Pomme"), _("Céleri"), _("Poire"), _("Betterave"), _("Oie"), _("Héliotrope"), _("Figue"), _("Scorsonère"), _("Alisier"), _("Charrue"),
        _("Salsifis"), _("Mâcre"), _("Topinambour"), _("Endive"), _("Dindon"), _("Chervis"), _("Cresson"), _("Dentelaire"), _("Grenade"), _("Herse"),
        _("Bacchante"), _("Azerole"), _("Garance"), _("Orange"), _("Faisan"), _("Pistache"), _("Macjonc"), _("Coing"), _("Cormier"), _("Rouleau"),
        _("Raiponce"), _("Turneps"), _("Chicorée"), _("Nèfle"), _("Cochon"), _("Mâche"), _("Chou-fleur"), _("Miel"), _("Genièvre"), _("Pioche"),
        _("Cire"), _("Raifort"), _("Cèdre"), _("Sapin"), _("Chevreuil"), _("Ajonc"), _("Cyprès"), _("Lierre"), _("Sabine"), _("Hoyau"),
        _("Érable à sucre"), _("Bruyère"), _("Roseau"), _("Oseille"), _("Grillon"), _("Pignon"), _("Liège"), _("Truffe"), _("Olive"), _("Pelle"),
        _("Tourbe"), _("Houille"), _("Bitume"), _("Soufre"), _("Chien"), _("Lave"), _("Terre végétale"), _("Fumier"), _("Salpêtre"), _("Fléau"),
        _("Granit"), _("Argile"), _("Ardoise"), _("Grès"), _("Lapin"), _("Silex"), _("Marne"), _("Pierre à chaux"), _("Marbre"), _("Van"),
        _("Pierre à plâtre"), _("Sel"), _("Fer"), _("Cuivre"), _("Chat"), _("Étain"), _("Plomb"), _("Zinc"), _("Mercure"), _("Crible"),
        _("Lauréole"), _("Mousse"), _("Fragon"), _("Perce-neige"), _("Taureau"), _("Laurier-thym"), _("Amadouvier"), _("Mézéréon"), _("Peuplier"), _("Coignée"),
        _("Ellébore"), _("Brocoli"), _("Laurier"), _("Avelinier"), _("Vache"), _("Buis"), _("Lichen"), _("If"), _("Pulmonaire"), _("Serpette"),
        _("Thlaspi"), _("Thimelé"), _("Chiendent"), _("Trainasse"), _("Lièvre"), _("Guède"), _("Noisetier"), _("Cyclamen"), _("Chélidoine"), _("Traîneau"),
        _("Tussilage"), _("Cornouiller"), _("Violier"), _("Troène"), _("Bouc"), _("Asaret"), _("Alaterne"), _("Violette"), _("Marceau"), _("Bêche"),
        _("Narcisse"), _("Orme"), _("Fumeterre"), _("Vélar"), _("Chèvre"), _("Épinard"), _("Doronic"), _("Mouron"), _("Cerfeuil"), _("Cordeau"),
        _("Mandragore"), _("Persil"), _("Cochléaria"), _("Pâquerette"), _("Thon"), _("Pissenlit"), _("Sylvie"), _("Capillaire"), _("Frêne"), _("Plantoir"),
        _("Primevère"), _("Platane"), _("Asperge"), _("Tulipe"), _("Poule"), _("Bette"), _("Bouleau"), _("Jonquille"), _("Aulne"), _("Couvoir"),
        _("Pervenche"), _("Charme"), _("Morille"), _("Hêtre"), _("Abeille"), _("Laitue"), _("Mélèze"), _("Ciguë"), _("Radis"), _("Ruche"),
        _("Gainier"), _("Romaine"), _("Marronnier"), _("Roquette"), _("Pigeon"), _("Lilas"), _("Anémone"), _("Pensée"), _("Myrtille"), _("Greffoir"),
        _("Rose"), _("Chêne"), _("Fougère"), _("Aubépine"), _("Rossignol"), _("Ancolie"), _("Muguet"), _("Champignon"), _("Hyacinthe"), _("Râteau"),
        _("Rhubarbe"), _("Sainfoin"), _("Bâton d'or"), _("Chamerisier"), _("Ver à soie"), _("Consoude"), _("Pimprenelle"), _("Corbeille d'or"), _("Arroche"), _("Sarcloir"),
        _("Statice"), _("Fritillaire"), _("Bourrache"), _("Valériane"), _("Carpe"), _("Fusain"), _("Civette"), _("Buglosse"), _("Sénevé"), _("Houlette"),
        _("Luzerne"), _("Hémérocalle"), _("Trèfle"), _("Angélique"), _("Canard"), _("Mélisse"), _("Fromental"), _("Martagon"), _("Serpolet"), _("Faux"),
        _("Fraise"), _("Bétoine"), _("Pois"), _("Acacia"), _("Caille"), _("Œillet"), _("Sureau"), _("Pavot"), _("Tilleul"), _("Fourche"),
        _("Barbeau"), _("Camomille"), _("Chèvrefeuille"), _("Caille-lait"), _("Tanche"), _("Jasmin"), _("Verveine"), _("Thym"), _("Pivoine"), _("Chariot"),
        _("Seigle"), _("Avoine"), _("Oignon"), _("Véronique"), _("Mulet"), _("Romarin"), _("Concombre"), _("Échalote"), _("Absinthe"), _("Faucille"),
        _("Coriandre"), _("Artichaut"), _("Girofle"), _("Lavande"), _("Chamois"), _("Tabac"), _("Groseille"), _("Gesse"), _("Cerise"), _("Parc"),
        _("Menthe"), _("Cumin"), _("Haricot"), _("Orcanète"), _("Pintade"), _("Sauge"), _("Ail"), _("Vesce"), _("Blé"), _("Chalémie"),
        _("Épeautre"), _("Bouillon blanc"), _("Melon"), _("Ivraie"), _("Bélier"), _("Prêle"), _("Armoise"), _("Carthame"), _("Mûre"), _("Arrosoir"),
        _("Panic"), _("Salicorne"), _("Abricot"), _("Basilic"), _("Brebis"), _("Guimauve"), _("Lin"), _("Amande"), _("Gentiane"), _("Écluse"),
        _("Carline"), _("Câprier"), _("Lentille"), _("Aunée"), _("Loutre"), _("Myrte"), _("Colza"), _("Lupin"), _("Coton"), _("Moulin"),
        _("Prune"), _("Millet"), _("Lycoperdon"), _("Escourgeon"), _("Saumon"), _("Tubéreuse"), _("Sucrion"), _("Apocyn"), _("Réglisse"), _("Échelle"),
        _("Pastèque"), _("Fenouil"), _("Épine vinette"), _("Noix"), _("Truite"), _("Citron"), _("Cardère"), _("Nerprun"), _("Tagette"), _("Hotte"),
        _("Églantier"), _("Noisette"), _("Houblon"), _("Sorgho"), _("Écrevisse"), _("Bigarade"), _("Verge d'or"), _("Maïs"), _("Marron"), _("Panier"),
        _("la Vertu"), _("Génie"), _("Travail"), _("l'Opinion"), _("Récompenses"), _("la Révolution")
    ];
}

/**
 * Get translated weekday names
 */
function getWeekdayNames() {
    return [
        _("Décadi"), _("Primidi"), _("Duodi"), _("Tridi"), _("Quartidi"),
        _("Quintidi"), _("Sextidi"), _("Septidi"), _("Octidi"), _("Nonidi")
    ];
}

/**
 * Converts Julian Day to JavaScript Date (UTC)
 */
function julianDayToDate(julianDay) {
    const integerPart = Math.floor(julianDay + 0.5);
    const fractionalPart = julianDay + 0.5 - integerPart;

    let gregorianAdjustment = integerPart;
    if (integerPart >= 2299161) {
        const centuryCorrection = Math.floor((integerPart - 1867216.25) / 36524.25);
        gregorianAdjustment = integerPart + 1 + centuryCorrection - Math.floor(centuryCorrection / 4);
    }

    const temp = gregorianAdjustment + 1524;
    const yearApprox = Math.floor((temp - 122.1) / 365.25);
    const yearDays = Math.floor(365.25 * yearApprox);
    const monthApprox = Math.floor((temp - yearDays) / 30.6001);

    const day = temp - yearDays - Math.floor(30.6001 * monthApprox) + fractionalPart;
    const month = monthApprox < 14 ? monthApprox - 1 : monthApprox - 13;
    const year = month > 2 ? yearApprox - 4716 : yearApprox - 4715;

    return new Date(Date.UTC(year, month - 1, Math.floor(day)));
}

/**
 * Returns the UTC date of the September equinox for a given year
 * Uses Meeus polynomial (valid for years 1583–2999)
 */
function getAutumnEquinoxDate(year) {
    if (year < 1583 || year > 2999) {
        throw new Error("Year must be between 1583 and 2999");
    }

    // Julian millennia since J2000.0
    const millenniaSinceJ2000 = (year - 2000) / 1000;

    // Calculate the September equinox using Meeus polynomial
    const julianEphemerisDay =
        2451810.21715 +
        365242.01767 * millenniaSinceJ2000 +
        0.11575 * millenniaSinceJ2000 * millenniaSinceJ2000 -
        0.00337 * millenniaSinceJ2000 * millenniaSinceJ2000 * millenniaSinceJ2000 -
        0.00078 * millenniaSinceJ2000 * millenniaSinceJ2000 * millenniaSinceJ2000 * millenniaSinceJ2000;

    // Convert Julian Day to UTC Date
    return julianDayToDate(julianEphemerisDay);
}

/**
 * Get Republican decimal time from a standard Date object
 * Returns the decimal clock (10 hours/day, 100 minutes/hour, 100 seconds/minute)
 */
export function getRepublicanClock(date) {
    // Seconds since local midnight (fractional)
    const secondsSinceMidnight =
        date.getHours() * 3600 +
        date.getMinutes() * 60 +
        date.getSeconds() +
        date.getMilliseconds() / 1000;

    // Map 86400 SI seconds to 100000 decimal seconds
    const DECIMAL_SECONDS_PER_DAY = 100000;
    const siSecondsPerDay = 86400;
    const decimalTotal = secondsSinceMidnight / siSecondsPerDay * DECIMAL_SECONDS_PER_DAY;
    return {
        hours: Math.floor(decimalTotal / 10000), // 0..9
        minutes: Math.floor((decimalTotal % 10000) / 100) // 0..99
    };
}


/**
 * Get Republican calendar date from a standard Date object
 * Returns the date, month, year, day name, etc.
 * Uses the actual autumn equinox date for each year
 */
export function getRepublicanDate(date) {
    const currentYear = date.getFullYear();
    
    // Get equinox dates for current and previous year
    const currentEquinox = getAutumnEquinoxDate(currentYear);
    
    // Determine which Republican year we're in
    let firstDayOfRepYear;
    let republicanYear = currentYear - 1792; // Base year for Republican calendar
    if (date >= currentEquinox) {
        // On or after this year's equinox
        firstDayOfRepYear = currentEquinox;
        republicanYear += 1;
    } else {
        // Before this year's equinox, use previous year
        firstDayOfRepYear = getAutumnEquinoxDate(currentYear - 1);
    }
    
    // Calculate days since start of Republican year
    const MS_PER_DAY = 86400000;
    
    // Calculate the number of days since the start of the Republican year
    const yeardays = Math.floor((date.getTime() - firstDayOfRepYear.getTime()) / MS_PER_DAY);

    const monthNames = getMonthNames();
    const dayNames = getDayNames();
    const weekdayNames = getWeekdayNames();

    const dayOfMonth = (yeardays % 30) + 1; // day of month, 1-based
    const monthName = monthNames[Math.floor(yeardays / 30)];
    const dayName = dayNames[yeardays];
    const dayOfWeek = weekdayNames[dayOfMonth % 10];
    
    return {
        years: republicanYear,
        yeardays,
        dayOfMonth,
        monthName,
        dayName,
        dayOfWeek
    };
}


