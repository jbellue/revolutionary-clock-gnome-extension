/* extension.js
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

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {getRepublicanClock, getRepublicanDate, setTranslationFunction} from './revdate.js';
import {setupLocale, translate} from './translations.js';

const RevolutionaryClock = GObject.registerClass(
class RevolutionaryClock extends PanelMenu.Button {
    _init(settings) {
        super._init(0.5, 'Revolutionary Clock', false);
        
        this._settings = settings;

        this._label = new St.Label({
            text: '',
            style_class: 'panel-label',
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
        });

        this.add_child(this._label);

        // initialise the timer so we know if we need to clean it up later
        this._timeout = 0;
        this._update();
        this._startTimer();

        // Create the date menu item
        this._dateMenuItem = new PopupMenu.PopupMenuItem('');
        this._updateDateMenuItem();
        this.menu.addMenuItem(this._dateMenuItem);

        // Update date when menu opens
        this.menu.connect('open-state-changed', (_, isOpen) => {
            if (isOpen) {
                this._updateDateMenuItem();
            }
        });

        // Listen for emoji changes
        this._settingsChangedId = this._settings.connect('changed::clock-emoji', () => {
            this._update();
        });
    }

    _updateDateMenuItem() {
        const date = getRepublicanDate(new Date());
        
        // Handle day as string or object {name, link}
        let dayText = date.dayName;
        let dayLink = null;
        
        if (typeof date.dayName === 'object' && date.dayName !== null) {
            dayText = date.dayName.name || date.dayName;
            dayLink = date.dayName.link;
        }
        
        this._dateMenuItem.label.text = `${date.dayOfWeek} ${date.dayOfMonth} ${date.monthName} (${dayText})`;
        
        // Add click handler if there's a link
        if (this._dayLinkHandler) {
            this._dateMenuItem.disconnect(this._dayLinkHandler);
            this._dayLinkHandler = null;
        }
        
        if (dayLink) {
            this._dayLinkHandler = this._dateMenuItem.connect('activate', () => {
                Gio.AppInfo.launch_default_for_uri(dayLink, null);
            });
        }
    }

    _update() {
        this._label.set_text(this._formatNow());
    }

    _startTimer() {
        // Update every second; decimal minutes change ~every 86.4s
        this._timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this._update();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _formatNow() {
        const pad2 = n => String(Math.floor(n)).padStart(2, '0');

        const clock = getRepublicanClock(new Date());
        const emoji = this._settings.get_string('clock-emoji');

        const timeStr = `${pad2(clock.hours)}:${pad2(clock.minutes)}`;
        if (emoji) {
            return `${emoji} ${timeStr} ${emoji}`;
        } else {
            return timeStr;
        }
    }

    destroy() {
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = 0;
        }
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        super.destroy();
    }
});

export default class RevolutionaryClockExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        // Set up translation function for revdate.js
        this._updateTranslationFunction().then(() => {
            // Listen for locale changes
            this._localeChangedId = this._settings.connect('changed::locale', () => {
                this._updateTranslationFunction().then(() => {
                    if (this._revolutionaryClock) {
                        this._revolutionaryClock._update();
                        this._revolutionaryClock._updateDateMenuItem();
                    }
                });
            });

            this._revolutionaryClock = new RevolutionaryClock(this._settings);
            Main.panel.addToStatusArea(this.uuid, this._revolutionaryClock);
        });
    }

    async _updateTranslationFunction() {
        const locale = this._settings.get_string('locale');
        await setupLocale(locale, this.dir);
        setTranslationFunction(translate);
    }

    disable() {
        if (this._localeChangedId) {
            this._settings.disconnect(this._localeChangedId);
            this._localeChangedId = null;
        }
        this._revolutionaryClock.destroy();
        this._revolutionaryClock = null;
        this._settings = null;
    }
}
