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
        clockPositionIndex.set_value(settings.get_int('clock-index-in-status-bar'));
        clockPositionIndex.connect('notify::value', w => {
            settings.set_int('clock-index-in-status-bar', w.get_value());
        });

        const clockPositionGroup = builder.get_object('clockPositionGroup');
        clockPositionGroup.set_active_name(settings.get_string('clock-position-in-status-bar'));
        clockPositionGroup.connect('notify::active-name', w => {
            settings.set_string('clock-position-in-status-bar', w.get_active_name());
        });

        const decorationBeforeClockRow = builder.get_object('decorationBeforeClockRow');
        decorationBeforeClockRow.set_active(settings.get_boolean('decoration-before-clock'));
        decorationBeforeClockRow.connect('notify::active', w => {
            settings.set_boolean('decoration-before-clock', w.get_active());
        });

        const decorationAfterClockRow = builder.get_object('decorationAfterClockRow');
        decorationAfterClockRow.set_active(settings.get_boolean('decoration-after-clock'));
        decorationAfterClockRow.connect('notify::active', w => {
            settings.set_boolean('decoration-after-clock', w.get_active());
        });

        const clockDecorationRow = builder.get_object('clockDecorationRow');
        clockDecorationRow.set_text(settings.get_string('clock-decoration'));
        clockDecorationRow.connect('notify::text', w => {
            settings.set_string('clock-decoration', w.get_text());
        });

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
        includeYearRow.set_active(settings.get_boolean('include-date-year'));
        includeYearRow.connect('notify::active', w => {
            settings.set_boolean('include-date-year', w.get_active());
        });

        const yearAsRomanNumeralsRow = builder.get_object('yearAsRomanNumeralsRow');
        yearAsRomanNumeralsRow.set_active(settings.get_boolean('year-as-roman-numerals'));
        yearAsRomanNumeralsRow.set_sensitive(settings.get_boolean('include-date-year'));
        yearAsRomanNumeralsRow.connect('notify::active', w => {
            settings.set_boolean('year-as-roman-numerals', w.get_active());
        });
        includeYearRow.connect('notify::active', w => {
            yearAsRomanNumeralsRow.set_sensitive(w.get_active());
        });

        const includeDayNameRow = builder.get_object('includeDayNameRow');
        includeDayNameRow.set_active(settings.get_boolean('include-day-name'));
        includeDayNameRow.connect('notify::active', w => {
            settings.set_boolean('include-day-name', w.get_active());
            includeDayNameLinkRow.set_sensitive(w.get_active());
        });

        const includeDayNameLinkRow = builder.get_object('includeDayNameLinkRow');
        includeDayNameLinkRow.set_active(settings.get_boolean('include-day-name-link'));
        includeDayNameLinkRow.set_sensitive(settings.get_boolean('include-day-name'));
        includeDayNameLinkRow.connect('notify::active', w => {
            settings.set_boolean('include-day-name-link', w.get_active());
        });

        const includeDayNameImageRow = builder.get_object('includeDayNameImageRow');
        includeDayNameImageRow.set_active(settings.get_boolean('include-day-name-image'));
        includeDayNameImageRow.connect('notify::active', w => {
            settings.set_boolean('include-day-name-image', w.get_active());
            includeDayNameImageLinkRow.set_sensitive(w.get_active());
        });

        const includeDayNameImageLinkRow = builder.get_object('includeDayNameImageLinkRow');
        includeDayNameImageLinkRow.set_active(settings.get_boolean('include-day-name-image-link'));
        includeDayNameImageLinkRow.set_sensitive(settings.get_boolean('include-day-name-image'));
        includeDayNameImageLinkRow.connect('notify::active', w => {
            settings.set_boolean('include-day-name-image-link', w.get_active());
        });

        // Add all pages to the window
        window.add(builder.get_object('clock_settings_page'));
        window.add(builder.get_object('calendar_settings_page'));
    }
}
