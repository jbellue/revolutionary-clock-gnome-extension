/* constants.js
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

import GLib from 'gi://GLib';

const CACHE_DIR_NAME = 'revolutionaryclock';
export const CACHE_DIR = `${GLib.get_user_cache_dir()}/${CACHE_DIR_NAME}/`;
export const LOG_DIR = `${CACHE_DIR}logs/`;
export const LOG_FILE_PATH = `${LOG_DIR}extension.log`;
export const USER_AGENT = 'RevolutionaryClock/1.0 (https://github.com/jbellue/revolutionary-clock)';
export const LOG_PREFIX = '[RevolutionaryClock]';
