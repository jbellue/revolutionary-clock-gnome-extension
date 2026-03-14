/* republicanClock.js
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
 * Get Republican decimal time from a standard Date object
 * Returns the decimal clock (10 hours/day, 100 minutes/hour, 100 seconds/minute)
 */
export function getRepublicanTime(date) {
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
        minutes: Math.floor((decimalTotal % 10000) / 100), // 0..99
        seconds: Math.floor(decimalTotal % 100) // 0..99
    };
}
