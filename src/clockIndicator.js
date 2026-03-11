/* clockIndicator.js
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

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import { getRepublicanClock } from './revdate.js';
import { DateMenuItem } from './dateMenuItem.js';

export const RevolutionaryClock = GObject.registerClass(
class RevolutionaryClock extends PanelMenu.Button {
    _init(settings, logger) {
        super._init(0.5, 'Revolutionary Clock', false);

        this._settings = settings;

        this._clockLabel = new St.Label({
            text: '',
            style_class: 'panel-label',
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
        });
        this.add_child(this._clockLabel);

        this._clockTimeout = 0;
        this._updateClockLabel();
        this._startClockTimer();

        this._dateMenuItem = new DateMenuItem(settings, logger, () => this.menu.close());
        this.menu.addMenuItem(this._dateMenuItem.item);
        this.menu.actor.add_style_class_name('revolutionary-clock-menu-popup');
        this._updateDateMenuItem();

        const clockKeys = new Set(['clock-decoration', 'decoration-before-clock', 'decoration-after-clock']);
        this._settingsSignal = this._settings.connect('changed', (_, key) => {
            if (clockKeys.has(key))
                this._updateClockLabel();
        });

        this._menuSignal = this.menu.connect('open-state-changed', (_, isOpen) => {
            if (isOpen)
                this._updateDateMenuItem();
        });
    }

    /**
     * Updates the date menu item with the current date.
     * This is called when the menu is opened,
     * and also when the locale changes (to update the date format and translation).
     */
    _updateDateMenuItem() {
        this._dateMenuItem.update();
    }

    /**
     * Updates the clock label with the current time in the French Republican Calendar.
     */
    _updateClockLabel() {
        this._clockLabel.set_text(
            this._formatNow(getRepublicanClock(new Date()))
        );
    }

    /**
     * Starts a timer that updates the clock label every second.
     */
    _startClockTimer() {
        this._clockTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this._updateClockLabel();
            return GLib.SOURCE_CONTINUE;
        });
    }

    /**
     * Formats the current time in the French Republican Calendar.
     * @param {*} clock - The clock object containing hours and minutes.
     * @returns {string} - The formatted time string.
     */
    _formatNow(clock) {
        const pad2 = n => String(Math.floor(n)).padStart(2, '0');
        const clockDecoration = this._settings.get_string('clock-decoration');
        const decorationBefore = this._settings.get_boolean('decoration-before-clock');
        const decorationAfter = this._settings.get_boolean('decoration-after-clock');

        const timeStr = `${pad2(clock.hours)}:${pad2(clock.minutes)}`;
        if (!clockDecoration)
            return timeStr;

        const parts = [];
        if (decorationBefore)
            parts.push(clockDecoration);
        parts.push(timeStr);
        if (decorationAfter)
            parts.push(clockDecoration);

        return parts.join(' ');
    }

    destroy() {
        if (this._clockTimeout) {
            GLib.Source.remove(this._clockTimeout);
            this._clockTimeout = 0;
        }

        this._dateMenuItem.destroy();

        this._settings.disconnect(this._settingsSignal);
        this.menu.disconnect(this._menuSignal);

        super.destroy();
    }
});
