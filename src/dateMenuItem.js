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
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { getRepublicanDate } from './revdate.js';
import { WikiImageManager } from './wikiImageManager.js';

export class DateMenuItem {
    constructor(settings) {
        this._settings = settings;

        this.item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            activate: false,
            can_focus: false,
        });
        this.item.track_hover = false;
        this.item.add_style_class_name('revolutionary-clock-menu-item');

        this._container = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_align: Clutter.ActorAlign.START,
            style_class: 'revolutionary-clock-card',
        });

        this._contentColumn = new St.BoxLayout({
            vertical: true,
            x_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            width: 320,
        });

        this._weekdayLabel = new St.Label({
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.START,
            x_expand: true,
            style_class: 'revolutionary-clock-weekday-label',
        });

        this._dateLabel = new St.Label({
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.START,
            x_expand: true,
            style_class: 'revolutionary-clock-date-label',
        });

        this._dayNameLabel = new St.Label({
            y_align: Clutter.ActorAlign.START,
            x_align: Clutter.ActorAlign.START,
            x_expand: true,
            reactive: true,
            style_class: 'revolutionary-clock-day-name-label',
            visible: false,
        });

        this._imageSlot = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.START,
            reactive: true,
            style_class: 'revolutionary-clock-image-slot',
        });

        this._contentColumn.add_child(this._weekdayLabel);
        this._contentColumn.add_child(this._dateLabel);
        this._contentColumn.add_child(this._imageSlot);
        this._contentColumn.add_child(this._dayNameLabel);

        this._container.add_child(this._contentColumn);

        this._currentDayLink = null;
        this._currentImageLink = null;
        this._pointerCursor = this._resolveCursor(['POINTING_HAND', 'POINTER', 'HAND']);
        this._defaultCursor = this._resolveCursor(['DEFAULT', 'ARROW']);

        this._signals = [
            {actor: this._dayNameLabel, id: this._dayNameLabel.connect('button-press-event', () => this._openLink(this._currentDayLink))},
            {actor: this._dayNameLabel, id: this._dayNameLabel.connect('enter-event', () => this._setPointerCursor(this._currentDayLink))},
            {actor: this._dayNameLabel, id: this._dayNameLabel.connect('leave-event', () => this._setDefaultCursor())},
            {actor: this._imageSlot, id: this._imageSlot.connect('button-press-event', () => this._openLink(this._currentImageLink))},
            {actor: this._imageSlot, id: this._imageSlot.connect('enter-event', () => this._setPointerCursor(this._currentImageLink))},
            {actor: this._imageSlot, id: this._imageSlot.connect('leave-event', () => this._setDefaultCursor())},
        ];

        // Wikipedia image management
        this._wikiImageManager = new WikiImageManager();
        this._wikiImage = null;

        this.item.add_child(this._container);
    }

    async update() {
        const date = getRepublicanDate(new Date());
        const includeDayName = this._settings.get_boolean('include-day-name');
        const includeDayNameLink = this._settings.get_boolean('include-day-name-link');
        const includeDayNameImage = this._settings.get_boolean('include-day-name-image');
        const includeDayNameImageLink = this._settings.get_boolean('include-day-name-image-link');
        const includeYear = this._settings.get_boolean('include-date-year');
        const yearAsRoman = this._settings.get_boolean('year-as-roman-numerals');

        const yearText = includeYear ? ` ${yearAsRoman ? date.yearsRoman : date.years}` : '';

        const dayText = date.dayName?.name || date.dayName || '';
        const dayLink = date.dayName?.link || null;
        const showDayText = includeDayName && dayText;
        const showLink = includeDayNameLink && dayLink;
        const showImage = includeDayNameImage && dayLink;
        const showImageLink = includeDayNameImageLink && dayLink;

        this._currentDayLink = showLink ? dayLink : null;
        this._currentImageLink = showImageLink ? dayLink : null;

        this._weekdayLabel.text = `${date.dayOfWeek}`;
        this._dateLabel.text = `${date.dayOfMonth} ${date.monthName}${yearText}`;

        this._dayNameLabel.text = dayText;
        this._dayNameLabel.visible = showDayText;

        // Remove previous image if any
        if (this._wikiImage && this._wikiImage.get_parent()) {
            this._imageSlot.remove_child(this._wikiImage);
            this._wikiImage.destroy();
            this._wikiImage = null;
        }

        this._imageSlot.visible = showImage;

        if (!showLink && !showImageLink) {
            this._setDefaultCursor();
        }

        if (showImage) {
            this._showWikiImageForDay(dayLink);
        }
    }

    _resolveCursor(names) {
        if (!Meta?.Cursor)
            return null;

        for (const name of names) {
            if (name in Meta.Cursor && typeof Meta.Cursor[name] === 'number' &&
                (!('INVALID' in Meta.Cursor) || Meta.Cursor[name] !== Meta.Cursor.INVALID))
                return Meta.Cursor[name];
        }
        return null;
    }

    _setPointerCursor(link) {
        if (!link)
            return Clutter.EVENT_PROPAGATE;

        if (this._pointerCursor !== null && global.display?.set_cursor)
            global.display.set_cursor(this._pointerCursor);
        return Clutter.EVENT_PROPAGATE;
    }

    _setDefaultCursor() {
        if (this._defaultCursor !== null && global.display?.set_cursor)
            global.display.set_cursor(this._defaultCursor);
        return Clutter.EVENT_PROPAGATE;
    }

    _openLink(link) {
        if (!link)
            return Clutter.EVENT_PROPAGATE;

        Gio.AppInfo.launch_default_for_uri(link, null);
        return Clutter.EVENT_STOP;
    }

    async _showWikiImageForDay(dayLink) {
        // Check if already cached
        if (this._wikiImageManager.hasCache(dayLink)) {
            this._setWikiImageFromCache(dayLink);
            return;
        }

        // Download and cache
        const cacheFile = await this._wikiImageManager.downloadAndCache(dayLink);
        if (cacheFile) {
            this._setWikiImageFromCache(dayLink);
        }
    }

    _setWikiImageFromCache(dayLink) {
        const cacheFile = this._wikiImageManager.getCachePath(dayLink);
        if (!cacheFile) {
            log(`[RevolutionaryClock] No cached image for dayLink: ${dayLink}`);
            return;
        }

        const targetWidth = this._contentColumn.width || 320;
        this._wikiImage = this._wikiImageManager.createImageActor(cacheFile, targetWidth);
        if (!this._wikiImage)
            return;

        this._wikiImage.add_style_class_name('revolutionary-clock-day-image');
        this._imageSlot.add_child(this._wikiImage);
    }

    destroy() {
        // Disconnect all signals
        this._signals.forEach(({actor, id}) => actor.disconnect(id));
        this._signals = [];

        this._setDefaultCursor();

        if (this._wikiImage) {
            if (this._wikiImage.get_parent())
                this._imageSlot.remove_child(this._wikiImage);
            this._wikiImage.destroy();
        }

        if (this._wikiImageManager) {
            this._wikiImageManager.destroy();
            this._wikiImageManager = null;
        }

        this.item.destroy();
    }
}
