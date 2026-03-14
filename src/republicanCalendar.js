/* republicanCalendar.js
 *
 * French Republican Calendar calculations
 * Based on the calendar adopted during the French Revolution (1792)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

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
 * Convert an integer to Roman numerals
 * @param {number} num - Positive integer to convert
 * @returns {string} Roman numeral string
 */
function toRomanNumerals(num) {
    const values  = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    for (let i = 0; i < values.length; i++) {
        while (num >= values[i]) {
            result += symbols[i];
            num -= values[i];
        }
    }
    return result;
}

/**
 * Get Republican calendar date from a standard Date object
 * Returns the date, month, year, day name, etc.
 * Uses the actual autumn equinox date for each year
 * @param {Date} date - The date to convert
 * @param {Object} translations - The translations object containing calendar names
 */
export function getRepublicanDate(date, translations) {
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

    const dayOfMonth = (yeardays % 30) + 1; // day of month, 1-based
    const monthName = translations.months[Math.floor(yeardays / 30)];
    const dayName = translations.days[yeardays];
    const dayOfWeek = translations.weekdays[(dayOfMonth - 1) % 10];
    
    return {
        years: republicanYear,
        yearsRoman: toRomanNumerals(republicanYear),
        dayOfMonth,
        monthName,
        dayName,
        dayOfWeek
    };
}
