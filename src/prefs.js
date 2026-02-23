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

        // Create a preferences page
        const page = new Adw.PreferencesPage();
        window.add(page);

        const localeGroup = new Adw.PreferencesGroup();
        page.add(localeGroup);

        const clockGroup = new Adw.PreferencesGroup({
            title: _('Customizing the Clock'),
        });
        page.add(clockGroup);

        const dateGroup = new Adw.PreferencesGroup({
            title: _('Customizing the Date'),
        });
        page.add(dateGroup);

        // Locale selection
        const localeRow = new Adw.ComboRow({
            title: _('Calendar Language'),
            subtitle: _('Language for calendar names'),
        });

        const localeModel = new Gtk.StringList();
        const localeValues = [...getAvailableLocales(this.path), 'system'];
        localeValues.forEach(localeCode => {
            localeModel.append(getLocaleLabel(localeCode, _));
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
        const savedIndex = settings.get_int('clock-index-in-status-bar');
        const indexRow = new Adw.SpinRow({
            title: 'Index in Panel',
            adjustment: new Gtk.Adjustment({
                lower: -1,
                upper: 5,
                value: savedIndex,
                'page-increment': 1,
                'step-increment': 1,
            }),
        });
        indexRow.connect('changed', (widget) => {
            settings.set_int('clock-index-in-status-bar', widget.value);
        });

        clockGroup.add(indexRow);
        const positionGroup = new Adw.ToggleGroup({
            homogeneous: true,
            orientation: Gtk.Orientation.HORIZONTAL,
            can_shrink: true,
        });
        positionGroup.add_css_class('flat');
        const leftPosition = new Adw.Toggle({
            name: 'left',
            child: new Gtk.Label({ label: 'Left' }),
        })
        const centerPosition = new Adw.Toggle({
            name: 'center',
            child: new Gtk.Label({ label: 'Center' }),
        })
        const rightPosition = new Adw.Toggle({
            name: 'right',
            child: new Gtk.Label({ label: 'Right' }),
        })
        positionGroup.add(leftPosition);
        positionGroup.add(centerPosition);
        positionGroup.add(rightPosition);
        positionGroup.connect('notify::active-name', (group) => {
            const activeName = group.get_active_name();
            if (activeName) {
                settings.set_string('clock-position-in-status-bar', activeName);
            }
        });
        const savedPosition = settings.get_string('clock-position-in-status-bar');
        if (savedPosition && ['left', 'center', 'right'].includes(savedPosition)) {
            positionGroup.set_active_name(savedPosition);
        }
        const positionRow = new Adw.ActionRow({
            title: 'Position in Panel',
        });
        positionRow.add_suffix(positionGroup);
        clockGroup.add(positionRow);

        const decorationBeforeClockRow = new Adw.SwitchRow({
            title: _('Include the Text Before the Clock'),
            active: settings.get_boolean('decoration-before-clock'),
        });
        decorationBeforeClockRow.connect('notify::active', (widget) => {
            settings.set_boolean('decoration-before-clock', widget.active);
        });
        clockGroup.add(decorationBeforeClockRow);

        const decorationAfterClockRow = new Adw.SwitchRow({
            title: _('Include the Text After the Clock'),
            active: settings.get_boolean('decoration-after-clock'),
        });
        decorationAfterClockRow.connect('notify::active', (widget) => {
            settings.set_boolean('decoration-after-clock', widget.active);
        });
        clockGroup.add(decorationAfterClockRow);

        const clockDecorationRow = new Adw.EntryRow({
            title: _('Clock Decoration'),
            text: settings.get_string('clock-decoration'),
        });

        clockDecorationRow.connect('changed', (widget) => {
            settings.set_string('clock-decoration', widget.text);
        });
        clockGroup.add(clockDecorationRow);

        const includeDayNameRow = new Adw.SwitchRow({
            title: _('Include Day Name'),
            subtitle: _('Show the day name in the date menu'),
            active: settings.get_boolean('include-day-name'),
        });

        const includeYearRow = new Adw.SwitchRow({
            title: _('Include Year'),
            subtitle: _('Show the year in the date menu'),
            active: settings.get_boolean('include-date-year'),
        });

        const yearAsRomanNumeralsRow = new Adw.SwitchRow({
            title: _('Year as Roman Numerals'),
            subtitle: _('Display the year in Roman numerals (e.g. CCXXXIV)'),
            active: settings.get_boolean('year-as-roman-numerals'),
            sensitive: settings.get_boolean('include-date-year'),
        });

        const includeDayNameLinkRow = new Adw.SwitchRow({
            title: _('Day Name Link'),
            subtitle: _('Make day name clickable when link data is available'),
            active: settings.get_boolean('include-day-name-link'),
            sensitive: settings.get_boolean('include-day-name'),
        });

        includeDayNameRow.connect('notify::active', (widget) => {
            settings.set_boolean('include-day-name', widget.active);
            includeDayNameLinkRow.sensitive = widget.active;
        });

        includeYearRow.connect('notify::active', (widget) => {
            settings.set_boolean('include-date-year', widget.active);
            yearAsRomanNumeralsRow.sensitive = widget.active;
        });

        yearAsRomanNumeralsRow.connect('notify::active', (widget) => {
            settings.set_boolean('year-as-roman-numerals', widget.active);
        });

        includeDayNameLinkRow.connect('notify::active', (widget) => {
            settings.set_boolean('include-day-name-link', widget.active);
        });

        dateGroup.add(includeYearRow);
        dateGroup.add(yearAsRomanNumeralsRow);
        dateGroup.add(includeDayNameRow);
        dateGroup.add(includeDayNameLinkRow);
    }
}
