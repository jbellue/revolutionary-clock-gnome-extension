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

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { getRepublicanDate } from './revdate.js';

import { DayLinkButton } from './dayLinkButton.js';
import { fetchWikipediaImageUrl } from './wikipediaImage.js';

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

        // Remove previous image if any
        if (this._wikiImage && this._wikiImage.get_parent()) {
            this._container.remove_child(this._wikiImage);
            this._wikiImage = null;
        }

        if (this._dayLinkButton.get_parent())
            this._container.remove_child(this._dayLinkButton);

        this._dayLinkButton.teardown();

        if (showLink) {
            this._dayLinkButton.setup(dayLink, dayText);
            this._container.add_child(this._dayLinkButton);
            if (dayLink) {
                this.showWikiImageForDay(dayLink);
            }
        }
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
        this._wikiImage = new St.Icon();
        this._setWikiImageFromFile(file);
        this._container.insert_child_at_index(
            this._wikiImage,
            this._container.get_n_children() - 1
        );
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
            let gicon = new Gio.FileIcon({ file });
            this._wikiImage?.set_gicon(gicon);
            log(`[RevolutionaryClock] Set icon from file: ${file.get_path()}`);
        } catch (e) {
            log(`[RevolutionaryClock] Failed to set gicon from file: ${filePathOrFile}, error: ${e}`);
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
        if (this._dayLinkButton.get_parent())
            this._container.remove_child(this._dayLinkButton);
        this._dayLinkButton.destroy();
        if (this._wikiImage) {
            if (this._wikiImage.get_parent())
                this._container.remove_child(this._wikiImage);
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
