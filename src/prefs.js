/* prefs.js
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

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { CACHE_DIR } from './constants.js';
import { CacheManager } from './cacheManager.js';

const _ = imports.gettext.domain('revolutionary-clock').gettext;
const ngettext = imports.gettext.domain('revolutionary-clock').ngettext;

/**
 * Retrieves the list of available locales for the calendar formatting.
 * It looks for .js files in the "locales" or "locale" subdirectory of the extension.
 * The locale code is derived from the filename (e.g. "en.js" -> "en").
 * The "system" locale is also added as an option to use the system default locale.
 * @param {*} extensionPath - The path to the extension directory.
 * @returns {string[]} - An array of available locale codes.
 */
function getAvailableLocales(extensionPath, logger) {
    const locales = [];
    const candidateDirs = ['locales', 'locale'];

    let localeDirPath = null;
    let localeDir = null;
    for (const dirName of candidateDirs) {
        const dirPath = GLib.build_filenamev([extensionPath, dirName]);
        const dirFile = Gio.File.new_for_path(dirPath);
        if (dirFile.query_exists(null)) {
            localeDirPath = dirPath;
            localeDir = dirFile;
            break;
        }
    }

    if (!localeDir)
        return locales;

    try {
        const enumerator = localeDir.enumerate_children(
            'standard::name,standard::type',
            Gio.FileQueryInfoFlags.NONE,
            null
        );

        let info;
        while ((info = enumerator.next_file(null)) !== null) {
            if (info.get_file_type() !== Gio.FileType.REGULAR)
                continue;

            const fileName = info.get_name();
            if (!fileName.endsWith('.js'))
                continue;

            const localeCode = fileName.slice(0, -3);
            if (localeCode)
                locales.push(localeCode);
        }

        enumerator.close(null);
    } catch (e) {
        logger.warn(`Could not list locales in ${localeDirPath}: ${e.message}`);
    }

    locales.sort();
    return locales;
}

/**
 * Retrieves the label for a given locale code.
 * @param {string} localeCode - The locale code (e.g., "en", "fr").
 * @param {*} _ - The gettext function for translations.
 * @returns {string} - The label for the locale.
 */
function getLocaleLabel(localeCode, _) {
    if (localeCode === 'system')
        return _('System Default');
    return localeCode;
}

export default class RevolutionaryClockPreferences extends ExtensionPreferences {
    /**
     * Fills the preferences window with the UI elements and binds them to the settings.
     * @param {*} window - The preferences window.
     */
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const logger = this.getLogger();
        const cacheManager = new CacheManager(logger);

        // Load UI from .ui file
        const builder = new Gtk.Builder();
        builder.add_from_file(this.dir.get_path() + '/ui/prefs.ui');

        // Clock settings
        const clockPositionIndex = builder.get_object('clockPositionIndex');
        settings.bind('clock-index-in-status-bar', clockPositionIndex, 'value', Gio.SettingsBindFlags.DEFAULT);

        const clockPositionGroup = builder.get_object('clockPositionGroup');
        clockPositionGroup.set_active_name(settings.get_string('clock-position-in-status-bar'));
        clockPositionGroup.connect('notify::active-name', w => {
            settings.set_string('clock-position-in-status-bar', w.get_active_name());
        });

        const decorationBeforeClockRow = builder.get_object('decorationBeforeClockRow');
        settings.bind('decoration-before-clock', decorationBeforeClockRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const decorationAfterClockRow = builder.get_object('decorationAfterClockRow');
        settings.bind('decoration-after-clock', decorationAfterClockRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const clockDecorationRow = builder.get_object('clockDecorationRow');
        settings.bind('clock-decoration', clockDecorationRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        // Calendar settings
        const localeValue = builder.get_object('localeValue');
        const localeModel = new Gtk.StringList();
        const localeValues = [...getAvailableLocales(this.path, logger), 'system'];
        localeValues.forEach(localeCode => {
            localeModel.append(getLocaleLabel(localeCode, _));
        });
        localeValue.set_model(localeModel);
        let selectedIndex = localeValues.indexOf(settings.get_string('locale'));
        localeValue.set_selected(selectedIndex >= 0 ? selectedIndex : localeValues.indexOf('system'));
        localeValue.connect('notify::selected', w => {
            settings.set_string('locale', localeValues[w.get_selected()] || 'system');
        });

        const includeYearRow = builder.get_object('includeYearRow');
        settings.bind('include-date-year', includeYearRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const yearAsRomanNumeralsRow = builder.get_object('yearAsRomanNumeralsRow');
        settings.bind('year-as-roman-numerals', yearAsRomanNumeralsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('include-date-year', yearAsRomanNumeralsRow, 'sensitive', Gio.SettingsBindFlags.GET);

        const includeDayNameRow = builder.get_object('includeDayNameRow');
        settings.bind('include-day-name', includeDayNameRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const includeDayNameLinkRow = builder.get_object('includeDayNameLinkRow');
        settings.bind('include-day-name-link', includeDayNameLinkRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('include-day-name', includeDayNameLinkRow, 'sensitive', Gio.SettingsBindFlags.GET);

        const includeDayNameImageRow = builder.get_object('includeDayNameImageRow');
        settings.bind('include-day-name-image', includeDayNameImageRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const includeDayNameImageLinkRow = builder.get_object('includeDayNameImageLinkRow');
        settings.bind('include-day-name-image-link', includeDayNameImageLinkRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('include-day-name-image', includeDayNameImageLinkRow, 'sensitive', Gio.SettingsBindFlags.GET);

        // Cache management
        const cacheStatsRow = builder.get_object('cacheStatsRow');
        const clearCacheButton = builder.get_object('clearCacheButton');
        const browseCacheButton = builder.get_object('browseCacheButton');
        const deleteCacheOlderThanRow = builder.get_object('deleteCacheOlderThanRow');
        settings.bind('delete-cache-older-than-days', deleteCacheOlderThanRow, 'value', Gio.SettingsBindFlags.DEFAULT);

        // Update cache stats
        const updateCacheStats = async () => {
            cacheStatsRow.set_subtitle('...');
            const stats = await cacheManager.getCacheStats();
            const sizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);
            const filesText = ngettext(
                '%d file, %d MB',
                '%d files, %d MB',
                stats.fileCount
            ).format(stats.fileCount, sizeMB);
            cacheStatsRow.set_subtitle(filesText);
        };
        updateCacheStats();

        // Clear cache button
        clearCacheButton.connect('clicked', async () => {
            const filesDeleted = cacheManager.clearAllCacheFiles();
            await updateCacheStats();
            
            const secondaryText = ngettext(
                `Deleted %d cached image`,
                `Deleted %d cached images`,
                filesDeleted
            ).format(filesDeleted);
            // Show a toast notification if available
            const dialog = new Gtk.MessageDialog({
                text: _('Cache Cleared'),
                secondary_text: secondaryText,
                buttons: Gtk.ButtonsType.OK,
                modal: true,
                transient_for: window,
            });
            dialog.connect('response', () => dialog.destroy());
            dialog.show();
        });

        // Browse cache folder button
        browseCacheButton.connect('clicked', () => {
            const uri = GLib.filename_to_uri(CACHE_DIR, null);
            try {
                Gio.AppInfo.launch_default_for_uri(uri, null);
            } catch (e) {
                logger.error(`Failed to open cache directory: ${e.message}`);
            }
        });

        // Add all pages to the window
        window.add(builder.get_object('clock_settings_page'));
        window.add(builder.get_object('calendar_settings_page'));
        window.add(builder.get_object('cache_settings_page'));
        window.add(builder.get_object('about_page'));
    }
}
