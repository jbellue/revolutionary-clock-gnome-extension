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

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

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

function getLocaleLabel(localeCode) {
    if (localeCode === 'system')
        return 'System Default';
    return localeCode;
}

export default class RevolutionaryClockPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Create a preferences page
        const page = new Adw.PreferencesPage();
        window.add(page);

        const localeGroup = new Adw.PreferencesGroup();
        page.add(localeGroup);

        const clockGroup = new Adw.PreferencesGroup({
            title: 'Customizing the Clock',
        });
        page.add(clockGroup);

        const dateGroup = new Adw.PreferencesGroup({
            title: 'Customizing the Date',
        });
        page.add(dateGroup);

        // Locale selection
        const localeRow = new Adw.ComboRow({
            title: 'Calendar Language',
            subtitle: 'Language for calendar names',
        });

        const localeModel = new Gtk.StringList();
        const localeValues = [...getAvailableLocales(this.path), 'system'];
        localeValues.forEach(localeCode => {
            localeModel.append(getLocaleLabel(localeCode));
        });
        localeRow.model = localeModel;

        const localeValue = settings.get_string('locale');
        const selectedIndex = localeValues.indexOf(localeValue);
        localeRow.selected = selectedIndex >= 0 ? selectedIndex : localeValues.indexOf('system');

        localeRow.connect('notify::selected', (widget) => {
            const selected = widget.selected;
            settings.set_string('locale', localeValues[selected] || 'system');
        });

        localeGroup.add(localeRow);

        // Clock decoration entry
        const decorationBeforeClockRow = new Adw.SwitchRow({
            title: 'Include the Text Before the Clock',
            active: settings.get_boolean('decoration-before-clock'),
        });
        decorationBeforeClockRow.connect('notify::active', (widget) => {
            settings.set_boolean('decoration-before-clock', widget.active);
        });
        clockGroup.add(decorationBeforeClockRow);

        const decorationAfterClockRow = new Adw.SwitchRow({
            title: 'Include the Text After the Clock',
            active: settings.get_boolean('decoration-after-clock'),
        });
        decorationAfterClockRow.connect('notify::active', (widget) => {
            settings.set_boolean('decoration-after-clock', widget.active);
        });
        clockGroup.add(decorationAfterClockRow);

        const clockDecorationRow = new Adw.EntryRow({
            title: 'Clock Decoration',
            text: settings.get_string('clock-decoration'),
        });

        clockDecorationRow.connect('changed', (widget) => {
            settings.set_string('clock-decoration', widget.text);
        });
        clockGroup.add(clockDecorationRow);

        const includeDayNameRow = new Adw.SwitchRow({
            title: 'Include Day Name',
            subtitle: 'Show the day name in the date menu',
            active: settings.get_boolean('include-day-name'),
        });

        const includeDayNameLinkRow = new Adw.SwitchRow({
            title: 'Day Name Link',
            subtitle: 'Make day name clickable when link data is available',
            active: settings.get_boolean('include-day-name-link'),
            sensitive: settings.get_boolean('include-day-name'),
        });

        includeDayNameRow.connect('notify::active', (widget) => {
            settings.set_boolean('include-day-name', widget.active);
            includeDayNameLinkRow.sensitive = widget.active;
        });

        includeDayNameLinkRow.connect('notify::active', (widget) => {
            settings.set_boolean('include-day-name-link', widget.active);
        });

        dateGroup.add(includeDayNameRow);
        dateGroup.add(includeDayNameLinkRow);
    }
}
