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
import Soup from 'gi://Soup';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import Meta from 'gi://Meta';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { getRepublicanDate } from './revdate.js';

import { fetchWikipediaImageUrl } from './wikipediaImage.js';

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

        // Image for Wikipedia
        this._soup = new Soup.Session();
        this._soup.user_agent = 'RevolutionaryClock/1.0 (https://github.com/jbellue/revolutionary-clock)';
        this._wikiImage = null;

        // Extension cache directory
        this._cacheDir = `${GLib.get_user_cache_dir()}/revolutionaryclock/`;
        GLib.mkdir_with_parents(this._cacheDir, 0o755);
        this._imageCache = new Map();  // URL → local path

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
            this.showWikiImageForDay(dayLink);
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

    async downloadAndCacheWikiImage(dayLink) {
        // Fetch the image URL for the dayLink, download, and cache it
        try {
            const url = await fetchWikipediaImageUrl(this._soup, dayLink);
            if (!url) {
                log(`[RevolutionaryClock] No Wikipedia image URL found for: ${dayLink}`);
                return null;
            }
            // Generate cache filename from dayLink hash and preserve extension
            let hash = new GLib.Checksum(GLib.ChecksumType.MD5);
            hash.update(dayLink);
            let extMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
            let ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
            if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) ext = 'jpg';
            let cacheFile = `${this._cacheDir}${hash.get_string()}.${ext}`;
            let file = Gio.File.new_for_path(cacheFile);
            // Download image if not already present
            if (!file.query_exists(null)) {
                let result = await this._downloadImage(url, dayLink);
                if (result && result.bytes && result.contentType && result.status === 200 && result.contentType.startsWith('image/')) {
                    let stream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                    stream.write_all(result.bytes.get_data(), null);
                    stream.close(null);
                    log(`[RevolutionaryClock] Downloaded and saved image for ${dayLink} to ${cacheFile}`);
                } else {
                    log(`[RevolutionaryClock] Failed to download image for ${dayLink}`);
                    return null;
                }
            }
            this._imageCache.set(dayLink, cacheFile);
            return cacheFile;
        } catch (e) {
            log(`[RevolutionaryClock] Error in downloadAndCacheWikiImage: ${e}`);
            return null;
        }
    }

    setWikiImageFromCache(dayLink) {
        const cacheFile = this._imageCache.get(dayLink);
        if (!cacheFile) {
            log(`[RevolutionaryClock] No cached image for dayLink: ${dayLink}`);
            return;
        }
        let file = Gio.File.new_for_path(cacheFile);
        if (!file.query_exists(null)) {
            log(`[RevolutionaryClock] Cached file missing for dayLink: ${dayLink}`);
            return;
        }
        this._wikiImage = this._setWikiImageFromFile(file);
        if (!this._wikiImage)
            return;
        this._wikiImage.add_style_class_name('revolutionary-clock-day-image');
        this._imageSlot.add_child(this._wikiImage);
    }

    async showWikiImageForDay(dayLink) {
        if (this._imageCache.has(dayLink)) {
            this.setWikiImageFromCache(dayLink);
            return;
        }
        const cacheFile = await this.downloadAndCacheWikiImage(dayLink);
        if (cacheFile) {
            this.setWikiImageFromCache(dayLink);
        }
    }

    _setWikiImageFromFile(filePathOrFile) {
        try {
            let file = typeof filePathOrFile === 'string' ? Gio.File.new_for_path(filePathOrFile) : filePathOrFile;
            let filePath = file.get_path();
            log(`[RevolutionaryClock] Set image from file: ${filePath}`);

            const targetWidth = this._contentColumn.width || 320;
            let targetHeight = 300;

            try {
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file(filePath);
                const sourceWidth = pixbuf.get_width();
                const sourceHeight = pixbuf.get_height();
                targetHeight = Math.max(1, Math.round((sourceHeight * targetWidth) / sourceWidth));
            } catch (e) {
                log(`[RevolutionaryClock] Pixbuf dimension read failed, using default size fallback: ${e}`);
            }

            const uri = file.get_uri();
            const escapedUri = uri.replace(/"/g, '\\"');

            this._imageActor = new St.Widget({
                width: targetWidth,
                height: targetHeight,
                x_expand: true,
                x_align: Clutter.ActorAlign.START,
                style: `background-image: url("${escapedUri}"); background-size: ${targetWidth}px ${targetHeight}px; background-repeat: no-repeat;`,
            });

            return this._imageActor;
        } catch (e) {
            log(`[RevolutionaryClock] Failed to set image from file: ${filePathOrFile}, error: ${e}`);
            return null;
        }
    }

    _downloadImage(url, referer = null) {
        return new Promise((resolve) => {
            let session = this._soup;
            let msg = Soup.Message.new('GET', url);
            // Explicitly set User-Agent header for Wikimedia
            msg.request_headers.replace('User-Agent', 'RevolutionaryClock/1.0 (https://github.com/jbellue/revolutionary-clock)');
            if (referer) {
                msg.request_headers.append('Referer', referer);
            }
            session.send_and_read_async(msg, 0, null, (session, res) => {
                try {
                    const bytes = session.send_and_read_finish(res);
                    const contentType = msg.response_headers?.get_one('Content-Type') || '';
                    const status = msg.status_code;
                    // Collect all headers for logging
                    let headers = {};
                    if (msg.response_headers) {
                        msg.response_headers.foreach((name, value) => { headers[name] = value; });
                    }
                    // Try to get body as text for error logging
                    let bodyText = null;
                    try {
                        if (bytes && bytes.get_data) {
                            const byteArray = imports.byteArray.toString(bytes.get_data());
                            bodyText = byteArray;
                        }
                    } catch (e) {}
                    resolve({ bytes, contentType, status, headers, bodyText });
                } catch (e) {
                    resolve(null);
                }
            });
        });
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

        if (this._soup) {
            this._soup.abort();
            this._soup = null;
        }

        if (this._imageCache) {
            this._imageCache.clear();
            this._imageCache = null;
        }

        this.item.destroy();
    }
}
