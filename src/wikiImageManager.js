/* wikiImageManager.js
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

import { CACHE_DIR, USER_AGENT, LOG_PREFIX } from './constants.js';
import { cleanupExpiredCacheFiles, getCacheFilePath, hasCache, getCachePath } from './cacheUtils.js';

export class WikiImageManager {
    constructor(settings = null) {
        this._settings = settings;
        this._soup = new Soup.Session();
        this._soup.user_agent = USER_AGENT;

        this._cacheDir = CACHE_DIR;
        GLib.mkdir_with_parents(this._cacheDir, 0o755);
        this._imageCache = new Map();  // URL → local path
    }

    // Thin wrapper methods that delegate to cacheUtils
    hasCache(dayLink) {
        return hasCache(this._imageCache, dayLink);
    }

    getCachePath(dayLink) {
        return getCachePath(this._imageCache, dayLink);
    }

    async downloadAndCache(dayLink) {
        try {
            const cacheFile = getCacheFilePath(dayLink);
            let file = Gio.File.new_for_path(cacheFile);

            if (file.query_exists(null)) {
                this._imageCache.set(dayLink, cacheFile);
                return cacheFile;
            }

            const url = await this.fetchWikipediaImageUrl(dayLink);
            if (!url) {
                log(`${LOG_PREFIX} No Wikipedia image URL found for: ${dayLink}`);
                return null;
            }

            let result = await this._downloadImage(url, dayLink);
            if (result && result.bytes && result.contentType && result.status === 200 && result.contentType.startsWith('image/')) {
                let stream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                stream.write_all(result.bytes.get_data(), null);
                stream.close(null);
                const maxAgeDays = this._settings ? this._settings.get_int('delete-cache-older-than-days') : 0;
                cleanupExpiredCacheFiles(maxAgeDays);
                log(`${LOG_PREFIX} Downloaded and saved image for ${dayLink} to ${cacheFile}`);
            } else {
                log(`${LOG_PREFIX} Failed to download image for ${dayLink}`);
                return null;
            }

            this._imageCache.set(dayLink, cacheFile);
            return cacheFile;
        } catch (e) {
            log(`${LOG_PREFIX} Error in downloadAndCache: ${e}`);
            return null;
        }
    }

    async fetchWikipediaImageUrl(wikiUrl) {
        // Extract the host and article title from the URL
        const urlMatch = wikiUrl.match(/^https?:\/\/(\w+\.wikipedia\.org)\/wiki\/([^#?]+)/);
        if (!urlMatch)
            return null;
            
        const host = urlMatch[1];
        const title = decodeURIComponent(urlMatch[2]);

        const apiUrl = `https://${host}/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pilicense=any&redirects=true&format=json&pithumbsize=320&origin=*`;

        return new Promise((resolve, reject) => {
            const message = Soup.Message.new('GET', apiUrl);
            this._soup.send_and_read_async(message, 0, null, (soup, res) => {
                try {
                    const bytes = soup.send_and_read_finish(res);
                    const response = imports.byteArray.toString(bytes.get_data());
                    const data = JSON.parse(response);
                    const pages = data.query && data.query.pages;
                    if (pages) {
                        for (const pageId in pages) {
                            const page = pages[pageId];
                            if (page.thumbnail && page.thumbnail.source) {
                                resolve(page.thumbnail.source);
                                return;
                            }
                        }
                    }
                    log(`${LOG_PREFIX} No thumbnail found in API response for: ${wikiUrl}`);
                    resolve(null);
                } catch (e) {
                    log(`${LOG_PREFIX} Error fetching Wikipedia image for: ${wikiUrl}, Error: ${e}`);
                    resolve(null);
                }
            });
        });
    }

    createImageActor(cacheFile, targetWidth = 320) {
        try {
            let file = typeof cacheFile === 'string' ? Gio.File.new_for_path(cacheFile) : cacheFile;
            let filePath = file.get_path();

            if (!file.query_exists(null)) {
                log(`${LOG_PREFIX} Cached file missing: ${filePath}`);
                return null;
            }

            log(`${LOG_PREFIX} Set image from file: ${filePath}`);

            let targetHeight = 300;

            try {
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file(filePath);
                const sourceWidth = pixbuf.get_width();
                const sourceHeight = pixbuf.get_height();
                targetHeight = Math.max(1, Math.round((sourceHeight * targetWidth) / sourceWidth));
            } catch (e) {
                log(`${LOG_PREFIX} Pixbuf dimension read failed, using default size fallback: ${e}`);
            }

            const uri = file.get_uri();
            const escapedUri = uri.replace(/"/g, '\\"');

            return new St.Widget({
                width: targetWidth,
                height: targetHeight,
                x_expand: true,
                x_align: Clutter.ActorAlign.START,
                style: `background-image: url("${escapedUri}"); background-size: ${targetWidth}px ${targetHeight}px; background-repeat: no-repeat;`,
            });
        } catch (e) {
            log(`${LOG_PREFIX} Failed to create image actor: ${e}`);
            return null;
        }
    }

    _downloadImage(url, referer = null) {
        return new Promise((resolve) => {
            let session = this._soup;
            let msg = Soup.Message.new('GET', url);
            msg.request_headers.replace('User-Agent', USER_AGENT);
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
        if (this._soup) {
            this._soup.abort();
            this._soup = null;
        }

        if (this._imageCache) {
            this._imageCache.clear();
            this._imageCache = null;
        }
    }
}
