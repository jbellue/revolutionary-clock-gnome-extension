/* cacheUtils.js
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

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { CACHE_DIR, LOG_PREFIX } from './constants.js';

/**
 * Gets the cache file path for a given dayLink.
 * @param {string} dayLink - The day link to hash
 * @returns {string} - The cache file path
 */
export function getCacheFilePath(dayLink) {
    let hash = new GLib.Checksum(GLib.ChecksumType.MD5);
    hash.update(dayLink);
    return `${CACHE_DIR}${hash.get_string()}.img`;
}

/**
 * Checks if a dayLink is in the cache map.
 * @param {Map} cache - The cache map
 * @param {string} dayLink - The day link to check
 * @returns {boolean} - true if cached
 */
export function hasCache(cache, dayLink) {
    return cache.has(dayLink);
}

/**
 * Gets the cached file path for a dayLink from the cache map.
 * @param {Map} cache - The cache map
 * @param {string} dayLink - The day link to retrieve
 * @returns {string|undefined} - The cached file path or undefined
 */
export function getCachePath(cache, dayLink) {
    return cache.get(dayLink);
}

/**
 * Enumerates cache files and executes a callback for each file.
 * Callback receives (file, info) and should return true to continue, false to stop.
 * @param {Function} callback - Function to call for each file
 * @returns {boolean} - true if enumeration completed successfully
 */
function enumerateCacheFiles(callback) {
    try {
        const cacheDir = Gio.File.new_for_path(CACHE_DIR);
        if (!cacheDir.query_exists(null))
            return true;

        const enumerator = cacheDir.enumerate_children(
            'standard::name,standard::type,standard::size,time::modified',
            Gio.FileQueryInfoFlags.NONE,
            null
        );

        let info;
        while ((info = enumerator.next_file(null)) !== null) {
            if (info.get_file_type() !== Gio.FileType.REGULAR)
                continue;

            const file = cacheDir.get_child(info.get_name());
            if (!callback(file, info))
                break;
        }

        enumerator.close(null);
        return true;
    } catch (e) {
        log(`${LOG_PREFIX} Error enumerating cache: ${e}`);
        return false;
    }
}

/**
 * Gets all cache files as an array of {file, info} objects.
 * @returns {Array} - Array of {file, info} objects
 */
function getCacheFiles() {
    const files = [];
    enumerateCacheFiles((file, info) => {
        files.push({ file, info });
        return true;
    });
    return files;
}

/**
 * Deletes a file and returns success status.
 * @param {Gio.File} file - File to delete
 * @returns {boolean} - true if deleted successfully
 */
function deleteFile(file) {
    try {
        return file.delete(null);
    } catch (e) {
        log(`${LOG_PREFIX} Failed to delete ${file.get_basename()}: ${e}`);
        return false;
    }
}

/**
 * Deletes cache files older than specified days.
 * @param {number} maxAgeDays - Maximum age in days (0 or negative disables cleanup)
 * @returns {number} - Number of files deleted
 */
export function cleanupExpiredCacheFiles(maxAgeDays) {
    try {
        if (maxAgeDays <= 0)
            return 0;

        const nowSeconds = Math.floor(Date.now() / 1000);
        const cutoffSeconds = nowSeconds - (maxAgeDays * 24 * 60 * 60);
        const files = getCacheFiles();

        let deletedCount = 0;
        for (const { file, info } of files) {
            const modified = Number(info.get_attribute_uint64('time::modified'));
            if (!Number.isFinite(modified) || modified >= cutoffSeconds)
                continue;

            if (deleteFile(file))
                deletedCount++;
        }

        if (deletedCount > 0)
            log(`${LOG_PREFIX} Deleted ${deletedCount} expired cached image${deletedCount !== 1 ? 's' : ''}`);

        return deletedCount;
    } catch (e) {
        log(`${LOG_PREFIX} Error while cleaning expired cache files: ${e}`);
        return 0;
    }
}

/**
 * Deletes all cache files.
 * @returns {number} - Number of files deleted
 */
export function clearAllCacheFiles() {
    try {
        const files = getCacheFiles();
        if (files.length === 0) {
            log(`${LOG_PREFIX} Cache directory is empty`);
            return 0;
        }

        let filesDeleted = 0;
        for (const { file } of files) {
            if (deleteFile(file))
                filesDeleted++;
        }

        log(`${LOG_PREFIX} Cleared cache: deleted ${filesDeleted} files`);
        return filesDeleted;
    } catch (e) {
        log(`${LOG_PREFIX} Error clearing cache: ${e}`);
        return 0;
    }
}

/**
 * Gets cache statistics (file count and total size).
 * @returns {Object} - Object with fileCount and totalSize properties
 */
export function getCacheStats() {
    try {
        const files = getCacheFiles();
        let totalSize = 0;
        for (const { info } of files) {
            totalSize += info.get_size();
        }
        return { fileCount: files.length, totalSize };
    } catch (e) {
        log(`${LOG_PREFIX} Error getting cache stats: ${e}`);
        return { fileCount: 0, totalSize: 0 };
    }
}
