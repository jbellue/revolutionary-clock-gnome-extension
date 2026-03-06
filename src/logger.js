/* logger.js
 *
 * Shared logger for extension and prefs.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { LOG_DIR, LOG_FILE_PATH, LOG_PREFIX } from './constants.js';

const MAX_LOG_LINES_IN_MEMORY = 300;
const MAX_LOG_FILE_SIZE_BYTES = 1024 * 1024;

let memoryLogs = [];

function ensureLogStorage() {
    GLib.mkdir_with_parents(LOG_DIR, 0o755);
}

function safeShellLog(message) {
    try {
        log(message);
    } catch (_e) {
    }
}

function appendToFile(line) {
    try {
        ensureLogStorage();
        const file = Gio.File.new_for_path(LOG_FILE_PATH);
        const stream = file.append_to(Gio.FileCreateFlags.NONE, null);
        stream.write_all(`${line}\n`, null);
        stream.close(null);
        rotateIfNeeded();
    } catch (e) {
        safeShellLog(`${LOG_PREFIX} Logger file write failed: ${e.message || e}`);
    }
}

function rotateIfNeeded() {
    try {
        const file = Gio.File.new_for_path(LOG_FILE_PATH);
        if (!file.query_exists(null))
            return;

        const info = file.query_info('standard::size', Gio.FileQueryInfoFlags.NONE, null);
        const size = Number(info.get_size());
        if (!Number.isFinite(size) || size <= MAX_LOG_FILE_SIZE_BYTES)
            return;

        const lines = getRecentLogEntries(2000);
        const tail = lines.slice(-800).join('\n');
        GLib.file_set_contents(LOG_FILE_PATH, tail ? `${tail}\n` : '');
    } catch (e) {
        safeShellLog(`${LOG_PREFIX} Logger rotation failed: ${e.message || e}`);
    }
}

function formatLine(level, message) {
    const now = new Date().toISOString();
    const text = typeof message === 'string' ? message : String(message);
    // Always prefix with LOG_PREFIX
    const shellLine = `${LOG_PREFIX} ${text}`;
    return {
        shellLine,
        fileLine: `${now} [${level}] ${shellLine}`,
    };
}

function decodeBytes(bytes) {
    try {
        return imports.byteArray.toString(bytes);
    } catch (_e) {
        try {
            return new TextDecoder().decode(bytes);
        } catch (_err) {
            return '';
        }
    }
}

function addToMemory(line) {
    memoryLogs.push(line);
    if (memoryLogs.length > MAX_LOG_LINES_IN_MEMORY)
        memoryLogs = memoryLogs.slice(-MAX_LOG_LINES_IN_MEMORY);
}

export function logMessage(message, level = 'INFO') {
    const { shellLine, fileLine } = formatLine(level, message);
    safeShellLog(shellLine);
    addToMemory(fileLine);
    appendToFile(fileLine);
}

export function info(message) {
    logMessage(message, 'INFO');
}

export function warn(message) {
    logMessage(message, 'WARN');
}

export function error(message) {
    logMessage(message, 'ERROR');
}

export function getRecentLogEntries(maxLines = 200) {
    try {
        const file = Gio.File.new_for_path(LOG_FILE_PATH);
        if (!file.query_exists(null))
            return [];

        const [, content] = file.load_contents(null);
        const text = decodeBytes(content);
        return text
            .split('\n')
            .filter(line => line.length > 0)
            .slice(-Math.max(1, maxLines));
    } catch (_e) {
        return [];
    }
}

export function getRecentInMemoryEntries(maxLines = 200) {
    return memoryLogs.slice(-Math.max(1, maxLines));
}

export function clearLogFile() {
    ensureLogStorage();
    GLib.file_set_contents(LOG_FILE_PATH, '');
}

export function ensureLogFileExists() {
    ensureLogStorage();
    const file = Gio.File.new_for_path(LOG_FILE_PATH);
    if (!file.query_exists(null))
        GLib.file_set_contents(LOG_FILE_PATH, '');
}

export function getLogFilePath() {
    return LOG_FILE_PATH;
}
