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

const Gettext = imports.gettext;
const _ = Gettext.domain('revolutionary-clock').gettext;

function getAvailableLocales(extensionPath) {
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
        console.warn(`[Revolutionary Clock] Could not list locales in ${localeDirPath}: ${e.message}`);
    }

    locales.sort();
    return locales;
}

function getLocaleLabel(localeCode, _) {
    if (localeCode === 'system')
        return _('System Default');
    return localeCode;
}

export default class RevolutionaryClockPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

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
        const localeValues = [...getAvailableLocales(this.path), 'system'];
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

        // Add all pages to the window
        window.add(builder.get_object('clock_settings_page'));
        window.add(builder.get_object('calendar_settings_page'));
    }
}
