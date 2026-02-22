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
    _init(settings) {
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

        this._dateMenuItem = new DateMenuItem(settings);
        this.menu.addMenuItem(this._dateMenuItem.item);
        this.menu.actor.add_style_class_name('revolutionary-clock-menu-popup');
        this._updateDateMenuItem();

        this._includeDayNameChangedId = this._settings.connect('changed::include-day-name', () => this._updateDateMenuItem());
        this._includeDayNameLinkChangedId = this._settings.connect('changed::include-day-name-link', () => this._updateDateMenuItem());
        this._includeYearChangedId = this._settings.connect('changed::include-date-year', () => this._updateDateMenuItem());
        this._yearAsRomanNumeralsChangedId = this._settings.connect('changed::year-as-roman-numerals', () => this._updateDateMenuItem());

        this.menu.connect('open-state-changed', (_, isOpen) => {
            if (isOpen)
                this._updateDateMenuItem();
        });

        this._settingsChangedId = this._settings.connect('changed::clock-decoration', () => this._updateClockLabel());
        this._decorationBeforeChangedId = this._settings.connect('changed::decoration-before-clock', () => this._updateClockLabel());
        this._decorationAfterChangedId = this._settings.connect('changed::decoration-after-clock', () => this._updateClockLabel());
    }

    _updateDateMenuItem() {
        this._dateMenuItem?.update();
    }

    _updateClockLabel() {
        this._clockLabel.set_text(this._formatNow());
    }

    _startClockTimer() {
        this._clockTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this._updateClockLabel();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _formatNow() {
        const pad2 = n => String(Math.floor(n)).padStart(2, '0');
        const clock = getRepublicanClock(new Date());
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

        this._dateMenuItem?.destroy();
        this._dateMenuItem = null;

        const ids = [
            '_settingsChangedId',
            '_decorationBeforeChangedId',
            '_decorationAfterChangedId',
            '_includeDayNameChangedId',
            '_includeDayNameLinkChangedId',
            '_includeYearChangedId',
            '_yearAsRomanNumeralsChangedId',
        ];
        for (const idName of ids) {
            if (this[idName]) {
                this._settings.disconnect(this[idName]);
                this[idName] = null;
            }
        }
        super.destroy();
    }
});
