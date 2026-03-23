/* datePopup.js
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
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Graphene from 'gi://Graphene';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { getRepublicanDate } from './republicanCalendar.js';
import { getTranslations } from './translations.js';
import { WikiImageManager } from './wikiImageManager.js';

export const DateMenuItem = GObject.registerClass(
class DateMenuItem extends PopupMenu.PopupBaseMenuItem {
    _init(settings, logger, onLinkClicked = null) {
        super._init({
            reactive: false,
            activate: false,
            can_focus: false,
        });
        this.track_hover = false;
        this.add_style_class_name('revolutionary-clock-menu-item');

        this._settings = settings;
        this._logger = logger;
        this._onLinkClicked = onLinkClicked;
        this._translations = null;

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
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: false,
            style_class: 'revolutionary-clock-day-name-label',
        });

        this._externalLinkIcon = new St.Label({
            text: '⎋',
            scale_x: -1,
            pivot_point: new Graphene.Point({ x: 0.5, y: 0.5 }),
        });

        this._externalLinkIconContainer = new St.Bin({
            x_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.START,
            style_class: 'revolutionary-clock-external-link-icon-container',
            child: this._externalLinkIcon,
            visible: false
        });

        this._dayNameRow = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            reactive: true,
            visible: false,
        });
        this._dayNameRow.add_child(this._dayNameLabel);
        this._dayNameRow.add_child(this._externalLinkIconContainer);

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
        this._contentColumn.add_child(this._dayNameRow);

        this._container.add_child(this._contentColumn);

        this._currentDayLink = null;
        this._currentImageLink = null;
        this._currentImageDayLink = null; // Track which dayLink the current image is for

        this._pointerCursor = Meta.Cursor?.POINTER ?? null;
        this._defaultCursor = Meta.Cursor?.DEFAULT ?? null;

        this._signals = [];

        this._connectSignal(this._dayNameRow, 'button-press-event', () => this._handleClick(this._currentDayLink));
        this._connectSignal(this._dayNameRow, 'enter-event', () => this._setPointerCursor(this._currentDayLink));
        this._connectSignal(this._dayNameRow, 'leave-event', () => this._setDefaultCursor());
        this._connectSignal(this._imageSlot, 'button-press-event', () => this._handleClick(this._currentImageLink));
        this._connectSignal(this._imageSlot, 'enter-event', () => this._setPointerCursor(this._currentImageLink));
        this._connectSignal(this._imageSlot, 'leave-event', () => this._setDefaultCursor());
        [
            'include-day-name',
            'include-day-name-link',
            'include-day-name-image',
            'include-date-year',
            'year-as-roman-numerals',
        ].forEach(key => {
            this._connectSignal(this._settings, `changed::${key}`, () => this.update());
        });

        // Wikipedia image management
        this._wikiImageManager = new WikiImageManager(this._settings, this._logger);
        this._wikiImage = null;

        this.add_child(this._container);
    }

    setTranslations(translations) {
        this._translations = translations;
        this.update();
    }

    /**
     * Update the date menu item with the current Republican date, including labels and images based on settings
     * @returns {void}
     */
    update() {
        try {
            const translations = getTranslations(this._translations);
            if (!translations) {
                this._weekdayLabel.text = 'French Republican Calendar';
                this._dateLabel.text = 'Loading...';
                this._dayNameRow.visible = false;
                this._imageSlot.visible = false;
                return;
            }
            const date = getRepublicanDate(new Date(), translations);
            const includeDayName = this._settings.get_boolean('include-day-name');
            const includeDayNameLink = this._settings.get_boolean('include-day-name-link');
            const includeDayNameImage = this._settings.get_boolean('include-day-name-image');
            const includeDayNameImageLink = this._settings.get_boolean('include-day-name-image-link');
            const includeYear = this._settings.get_boolean('include-date-year');
            const yearAsRoman = this._settings.get_boolean('year-as-roman-numerals');

            const yearText = includeYear ? ` ${yearAsRoman ? date.yearsRoman : date.years}` : '';

            const dayText = date.dayName?.name || date.dayName || '';
            const dayLink = date.dayName?.link || null;
            const showDayText = !!(includeDayName && dayText);
            const showLink = !!(includeDayNameLink && dayLink);
            const showImage = !!(includeDayNameImage && dayLink);
            const showImageLink = !!(includeDayNameImageLink && dayLink);

            this._currentDayLink = showLink ? dayLink : null;
            this._currentImageLink = showImageLink ? dayLink : null;

            this._weekdayLabel.text = `${date.dayOfWeek}`;
            this._dateLabel.text = `${date.dayOfMonth} ${date.monthName}${yearText}`;

            this._dayNameLabel.text = dayText;
            this._dayNameRow.visible = showDayText;
            this._externalLinkIconContainer.visible = !!(showLink && showDayText);

            // Handle image visibility and updates
            if (!showImage || dayLink !== this._currentImageDayLink) {
                // Remove image if we don't want to show it anymore, or if the dayLink changed
                if (this._wikiImage && this._wikiImage.get_parent()) {
                    this._imageSlot.remove_child(this._wikiImage);
                    this._wikiImage.destroy();
                    this._wikiImage = null;
                }
                this._currentImageDayLink = null;
            }

            this._imageSlot.visible = showImage;


            if (!showLink && !showImageLink)
                this._setDefaultCursor();

            // Load image only if it changed
            if (showImage && dayLink !== this._currentImageDayLink) {
                this._currentImageDayLink = dayLink;
                this._showWikiImageForDay(dayLink).catch(e => {
                    this._logger.error(`Failed to load wiki image for ${dayLink}: ${e.message}`);
                });
            }
        } catch (e) {
            this._logger.error(`Failed to update date popup: ${e.message}`);
            this._imageSlot.visible = false;
        }
    }

    _connectSignal(actor, signal, handler) {
        this._signals.push({actor, id: actor.connect(signal, handler)});
    }

    /**
     * Set the cursor to pointer if the link is valid, otherwise do nothing.
     * @param {*} link - The link to check.
     * @returns {number} Clutter.EVENT_PROPAGATE
     */
    _setPointerCursor(link) {
        if (!link) return Clutter.EVENT_PROPAGATE;
        this._setCursor(this._pointerCursor);
        return Clutter.EVENT_PROPAGATE;
    }

    /**
     * Set the cursor to default
     * @returns {number} Clutter.EVENT_PROPAGATE
     */
    _setDefaultCursor() {
        this._setCursor(this._defaultCursor);
        return Clutter.EVENT_PROPAGATE;
    }

    _setCursor(cursor) {
        if (cursor !== null && global.display?.set_cursor)
            global.display.set_cursor(cursor);
    }

    /**
     * Handle click events on the day name label and image slot, opening the link if valid.
     * @param {*} link 
     * @returns {number} Clutter.EVENT_PROPAGATE if no link was handled, or Clutter.EVENT_STOP if we handled the click.
     * Also calls the onLinkClicked callback if provided.
     */
    _handleClick(link) {
        if (!link)
            return Clutter.EVENT_PROPAGATE;

        Gio.AppInfo.launch_default_for_uri(link, null);
        if (this._onLinkClicked)
            this._onLinkClicked();
        return Clutter.EVENT_STOP;
    }

    /**
     * Show the Wikipedia image for the given dayLink, using cache if available, or downloading it if not.
     * @param {*} dayLink - The dayLink for which to show the Wikipedia image.
     * @returns {Promise<void>} - A promise that resolves when the image is shown.
     */
    async _showWikiImageForDay(dayLink) {
        try {
            // Check if already cached
            if (this._wikiImageManager.hasCache(dayLink)) {
                this._setWikiImageFromCache(dayLink);
                return;
            }

            // Download and cache
            const cacheFile = await this._wikiImageManager.downloadAndCache(dayLink);
            if (cacheFile && this._wikiImageManager)
                this._setWikiImageFromCache(dayLink);
        } catch (e) {
            this._logger.error(`Failed to fetch wiki image for ${dayLink}: ${e.message}`);
            throw e;
        }
    }

    /**
     * Set the Wikipedia image from the cache for the given dayLink.
     * @param {*} dayLink - The dayLink for which to set the cached image.
     * @returns {void}
     */
    _setWikiImageFromCache(dayLink) {
        if (!this._wikiImageManager) return;
        const cacheFile = this._wikiImageManager.getCachePath(dayLink);
        if (!cacheFile) {
            this._logger.info(`No cached image for dayLink: ${dayLink}`);
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
            this._wikiImage = null;
        }

        if (this._wikiImageManager) {
            this._wikiImageManager.destroy();
            this._wikiImageManager = null;
        }

        super.destroy();
    }
});
