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
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class RevolutionaryClockPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Create a preferences page
        const page = new Adw.PreferencesPage();
        window.add(page);

        // Create a preference group for appearance
        const group = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Customize the revolutionary clock appearance',
        });
        page.add(group);

        // Locale selection
        const localeRow = new Adw.ComboRow({
            title: 'Locale',
            subtitle: 'Language for calendar names',
        });

        const localeModel = new Gtk.StringList();
        localeModel.append('French');
        localeModel.append('English');
        localeModel.append('System Default');
        localeRow.model = localeModel;

        // Map settings values to combo box indices
        const localeValue = settings.get_string('locale');
        if (localeValue === 'fr') {
            localeRow.selected = 0;
        } else if (localeValue === 'en') {
            localeRow.selected = 1;
        } else {
            localeRow.selected = 2;
        }

        localeRow.connect('notify::selected', (widget) => {
            const selected = widget.selected;
            if (selected === 0) {
                settings.set_string('locale', 'fr');
            } else if (selected === 1) {
                settings.set_string('locale', 'en');
            } else {
                settings.set_string('locale', 'system');
            }
        });

        group.add(localeRow);

        // Clock emoji entry
        const emojiRow = new Adw.EntryRow({
            title: 'Clock Emoji',
            text: settings.get_string('clock-emoji'),
        });

        emojiRow.connect('changed', (widget) => {
            settings.set_string('clock-emoji', widget.text);
        });

        group.add(emojiRow);

        // Add some example emojis as a hint
        const hintLabel = new Gtk.Label({
            label: 'Examples: 🇫🇷 ⚜️ 🗼 🥖 (leave empty to disable)',
            wrap: true,
            xalign: 0,
            margin_start: 12,
            margin_top: 6,
            margin_bottom: 12,
        });
        hintLabel.add_css_class('dim-label');
        hintLabel.add_css_class('caption');
        group.add(hintLabel);
    }
}
