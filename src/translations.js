/* translations.js
 *
 * Calendar name translations loader
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

import GLib from 'gi://GLib';
import { logMessage } from './logger.js';

let localeTranslations = null;

function getSystemLocale() {
    // Get system locale from environment
    const lang = GLib.getenv('LANG') || GLib.getenv('LANGUAGE') || 'fr';
    // Extract language code (e.g., 'en_US.UTF-8' -> 'en')
    return lang.split('_')[0].split('.')[0];
}

export async function setupLocale(locale, extensionDir) {
    let targetLocale = locale;
    
    if (locale === 'system') {
        targetLocale = getSystemLocale();
        logMessage(`Detected system locale: ${targetLocale}`);
    }
    
    // Load translations for the locale (including French)
    try {
        const module = await import(`./locale/${targetLocale}.js`);
        localeTranslations = module.translations;
        logMessage(`Loaded calendar translations for ${targetLocale}`);
    } catch (e) {
        logMessage(`Could not load calendar translations for ${targetLocale}, falling back to French: ${e.message}`, 'WARN');
        // Fallback to French
        try {
            const module = await import(`./locale/fr.js`);
            localeTranslations = module.translations;
        } catch (err) {
            logMessage(`Could not load French fallback: ${err.message}`, 'ERROR');
            localeTranslations = null;
        }
    }
}

export function translate(text) {
    if (!localeTranslations) {
        return text; // Fallback if no translations loaded
    }
    
    return localeTranslations[text] || text;
}
