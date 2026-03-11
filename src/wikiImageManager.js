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

import { CacheManager } from './cacheManager.js';

export class WikiImageManager {
    #userAgent = 'RevolutionaryClock/1.0 (https://github.com/jbellue/revolutionary-clock)';

    constructor(settings, logger) {
        this._settings = settings;
        this._logger = logger;
        this._cacheManager = new CacheManager(logger);
        this._soup = new Soup.Session();
        this._soup.user_agent = this.#userAgent;

        this._cacheDir = this._cacheManager.getCacheFolderPath();
        GLib.mkdir_with_parents(this._cacheDir, 0o755);
        this._imageCache = new Map();  // URL → local path
    }

    /**
     * Checks if the image for the given dayLink is already cached
     * @param {string} dayLink - The dayLink for which to check the cache.
     * @returns {boolean} - True if the image is cached, false otherwise.
     */
    hasCache(dayLink) {
        return this._cacheManager.hasCache(this._imageCache, dayLink);
    }

    /**
     * Gets the cache path for the given dayLink.
     * @param {string} dayLink - The dayLink for which to get the cache path.
     * @returns {string|null} - The cache path if available, null otherwise.
     */
    getCachePath(dayLink) {
        return this._cacheManager.getCachePath(this._imageCache, dayLink);
    }

    /**
     * Downloads and caches the image for the given dayLink.
     * @param {string} dayLink - The dayLink for which to download and cache the image.
     * @returns {Promise<string|null>} - The cache path if successful, null otherwise.
     */
    async downloadAndCache(dayLink) {
        try {
            const cacheFile = this._cacheManager.getCacheFilePath(dayLink);
            let file = Gio.File.new_for_path(cacheFile);

            if (file.query_exists(null)) {
                this._imageCache.set(dayLink, cacheFile);
                return cacheFile;
            }

            const url = await this.fetchWikipediaImageUrl(dayLink);
            if (!url) {
                this._logger.warn(`No Wikipedia image URL found for: ${dayLink}`);
                return null;
            }

            let result = await this._downloadImage(url, dayLink);
            if (result && result.bytes && result.contentType && result.status === 200 && result.contentType.startsWith('image/')) {
                const stream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                stream.write_all(result.bytes.get_data(), null);
                stream.close(null);

                // After saving the new image, clean up old cache files based on settings
                const maxAgeDays = this._settings.get_int('delete-cache-older-than-days');
                this._cacheManager.cleanupExpiredCacheFiles(maxAgeDays);
            } else {
                this._logger.warn(`Failed to download image for ${dayLink}`);
                return null;
            }

            this._imageCache.set(dayLink, cacheFile);
            return cacheFile;
        } catch (e) {
            this._logger.error(`Error in downloadAndCache: ${e}`);
            return null;
        }
    }

    /**
     * Fetches the Wikipedia image URL for the given wiki URL.
     * @param {string} wikiUrl - The Wikipedia URL for which to fetch the image.
     * @returns {Promise<string|null>} - The image URL if found, null otherwise.
     */
    async fetchWikipediaImageUrl(wikiUrl) {
        // Extract the host and article title from the URL
        const urlMatch = wikiUrl.match(/^https?:\/\/(\w+\.wikipedia\.org)\/wiki\/([^#?]+)/);
        if (!urlMatch)
            return null;
            
        const host = urlMatch[1];
        const title = decodeURIComponent(urlMatch[2]);

        const apiUrl = `https://${host}/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pilicense=any&redirects=true&format=json&pithumbsize=320&origin=*`;

        return new Promise((resolve, _reject) => {
            const message = Soup.Message.new('GET', apiUrl);
            this._soup.send_and_read_async(message, 0, null, (soup, res) => {
                try {
                    const bytes = soup.send_and_read_finish(res);
                    const decoder = new TextDecoder('utf-8');
                    const response = decoder.decode(bytes.get_data());
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
                    this._logger.warn(`No thumbnail found in API response for: ${wikiUrl}`);
                    resolve(null);
                } catch (e) {
                    this._logger.error(`Error fetching Wikipedia image for: ${wikiUrl}, Error: ${e}`);
                    resolve(null);
                }
            });
        });
    }

    /**
     * Creates an image actor from the cached file.
     * @param {string|Gio.File} cacheFile - The cached file path or Gio.File object.
     * @param {number} targetWidth - The target width for the image.
     * @returns {St.Widget|null} - The created image actor or null if failed.
     */
    createImageActor(cacheFile, targetWidth = 320) {
        try {
            let file = typeof cacheFile === 'string' ? Gio.File.new_for_path(cacheFile) : cacheFile;
            let filePath = file.get_path();

            if (!file.query_exists(null)) {
                this._logger.warn(`Cached file missing: ${filePath}`);
                return null;
            }

            this._logger.log(`Set image from file: ${filePath}`);

            let targetHeight = 300;

            try {
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file(filePath);
                const sourceWidth = pixbuf.get_width();
                const sourceHeight = pixbuf.get_height();
                targetHeight = Math.max(1, Math.round((sourceHeight * targetWidth) / sourceWidth));
            } catch (e) {
                this._logger.warn(`Pixbuf dimension read failed, using default size fallback: ${e}`);
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
            this._logger.error(`Failed to create image actor: ${e}`);
            return null;
        }
    }

    /**
     * Downloads an image from the given URL.
     * @param {string} url - The URL of the image to download.
     * @param {string|null} referer - The referer URL, if any.
     * @returns {Promise<{bytes: Uint8Array, contentType: string, status: number}|null>} - The downloaded image data or null if failed.
     */
    _downloadImage(url, referer = null) {
        return new Promise((resolve) => {
            let session = this._soup;
            let msg = Soup.Message.new('GET', url);
            msg.request_headers.replace('User-Agent', this.#userAgent);
            if (referer) {
                msg.request_headers.append('Referer', referer);
            }

            session.send_and_read_async(msg, 0, null, (session, res) => {
                try {
                    const bytes = session.send_and_read_finish(res);
                    const contentType = msg.response_headers?.get_one('Content-Type') || '';
                    const status = msg.status_code;
                    resolve({ bytes, contentType, status });
                } catch (e) {
                    this._logger.error(`Failed to download image: ${e}`);
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
