/* dateMenuItem.js
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

import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { getRepublicanDate } from './revdate.js';
import { DayLinkButton } from './dayLinkButton.js';

export class DateMenuItem {
    constructor(settings) {
        this._settings = settings;

        this.item = new PopupMenu.PopupBaseMenuItem({
            reactive: true,
            activate: false,
            can_focus: false,
        });
        this.item.track_hover = false;

        this._container = new St.BoxLayout({
            vertical: false,
            x_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._dateLabel = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.START,
            x_expand: false,
        });
        this._container.add_child(this._dateLabel);

        this._dayLinkButton = new DayLinkButton();

        this.item.add_child(this._container);
    }

    update() {
        const date = getRepublicanDate(new Date());
        const includeDayName = this._settings.get_boolean('include-day-name');
        const includeDayNameLink = this._settings.get_boolean('include-day-name-link');
        const includeYear = this._settings.get_boolean('include-date-year');
        const yearAsRoman = this._settings.get_boolean('year-as-roman-numerals');

        const yearText = includeYear ? ` ${yearAsRoman ? date.yearsRoman : date.years}` : '';

        const dayText = date.dayName?.name || date.dayName || '';
        const dayLink = date.dayName?.link || null;
        const showDayText = includeDayName && dayText;
        const showLink = showDayText && includeDayNameLink && dayLink;

        this._dateLabel.text = `${date.dayOfWeek} ${date.dayOfMonth} ${date.monthName}${yearText}`;
        if (showDayText && !showLink)
            this._dateLabel.text += ` — ${dayText}`;

        if (this._dayLinkButton.get_parent())
            this._container.remove_child(this._dayLinkButton);

        this._dayLinkButton.teardown();

        if (showLink) {
            this._dayLinkButton.setup(dayLink, dayText);
            this._container.add_child(this._dayLinkButton);
        }
    }

    destroy() {
        if (this._dayLinkButton.get_parent())
            this._container.remove_child(this._dayLinkButton);
        this._dayLinkButton.destroy();
        this.item.destroy();
    }
}
