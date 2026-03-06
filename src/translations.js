/* translations.js
 *
 * Calendar name translations loader
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GLib from 'gi://GLib';
import { LOG_PREFIX } from './constants.js';

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
        log(`${LOG_PREFIX} Detected system locale: ${targetLocale}`);
    }
    
    // Load translations for the locale (including French)
    try {
        const module = await import(`./locale/${targetLocale}.js`);
        localeTranslations = module.translations;
        log(`${LOG_PREFIX} Loaded calendar translations for ${targetLocale}`);
    } catch (e) {
        log(`${LOG_PREFIX} Could not load calendar translations for ${targetLocale}, falling back to French: ${e.message}`);
        // Fallback to French
        try {
            const module = await import(`./locale/fr.js`);
            localeTranslations = module.translations;
        } catch (err) {
            log(`${LOG_PREFIX} Could not load French fallback: ${err.message}`);
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
