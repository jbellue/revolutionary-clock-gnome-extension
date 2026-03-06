/* translations.js
 *
 * Calendar name translations loader
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
