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

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {getRepublicanClock, getRepublicanDate, setTranslationFunction} from './revdate.js';

const RevolutionaryClock = GObject.registerClass(
class RevolutionaryClock extends PanelMenu.Button {
    _init() {
        super._init(0.5, 'Revolutionary Clock', false);

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
    }

    _updateDateMenuItem() {
        const date = getRepublicanDate(new Date());
        this._dateMenuItem.label.text = `${date.dayOfWeek} ${date.dayOfMonth} ${date.monthName} (${date.dayName})`;
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

        // Show only hours and minutes (no seconds)
        return `🇫🇷 ${pad2(clock.hours)}:${pad2(clock.minutes)} 🇫🇷`;
    }

    destroy() {
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = 0;
        }
        super.destroy();
    }
});

export default class RevolutionaryClockExtension extends Extension {
    enable() {
        // Set up translation function for revdate.js
        setTranslationFunction(this.gettext.bind(this));

        this._revolutionaryClock = new RevolutionaryClock();
        Main.panel.addToStatusArea(this.uuid, this._revolutionaryClock);
    }

    disable() {
        this._revolutionaryClock.destroy();
        this._revolutionaryClock = null;
    }
}
