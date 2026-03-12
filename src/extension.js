/* extension.js
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

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { setupLocale } from './translations.js';
import { RevolutionaryClock } from './clockIndicator.js';

export default class RevolutionaryClockExtension extends Extension {
    constructor(metadata) {
        super(metadata);

        this._enabled = false;
    }

    enable() {
        this._enabled = true;

        this._settings = this.getSettings();
        this._signals = [
            { id: this._settings.connect('changed::clock-position-in-status-bar', () => this._updatePosition()) },
            { id: this._settings.connect('changed::clock-index-in-status-bar', () => this._updatePosition()) }
        ];
        this.logger = this.getLogger();

        void this._enableAsync();
    }

    async _enableAsync() {
        try {
            // Update the translation function before doing anything else,
            // so we can fetch the localised image ASAP from the cache, or get it from the wikipedia
            await this._updateTranslationFunction();
            if (!this._enabled || !this._settings)
                return;

            this._signals.push({ id:
                this._settings.connect('changed::locale', () => {
                    void this._onLocaleChanged();
                })
            });
            this._revolutionaryClock = new RevolutionaryClock(this._settings, this.logger);
            this._setClockInMainPanel();
        } catch (e) {
            if (!this._enabled)
                return;
            this.logger.error(`Failed to enable extension: ${e.message}`);
        }
    }

    async _onLocaleChanged() {
        try {
            await this._updateTranslationFunction();
            if (!this._enabled)
                return;

            if (this._revolutionaryClock) {
                this._revolutionaryClock._updateClockLabel();
                this._revolutionaryClock._updateDateMenuItem();
            }
        } catch (e) {
            if (!this._enabled)
                return;
            this.logger.error(`Failed to update locale: ${e.message}`);
        }
    }

    /**
     * Updates the locale based on the current locale setting.
     * This is called when the extension is enabled, and also when the locale setting changes.
     */
    async _updateTranslationFunction() {
        const locale = this._settings.get_string('locale');
        await setupLocale(locale, this.logger);
    }

    /**
     * Sets the clock indicator in the main panel at the position specified in the settings.
     */
    _setClockInMainPanel() {
        const index = this._settings.get_int('clock-index-in-status-bar');
        const location = this._settings.get_string('clock-position-in-status-bar');
        Main.panel.addToStatusArea(this.uuid, this._revolutionaryClock, index, location);
    }

    /**
     * Updates the position of the clock indicator in the main panel based on the settings.
     * This is called when the clock position or index settings change.
     */
    _updatePosition() {
        if (!this._revolutionaryClock) return;
        this._revolutionaryClock.container.get_parent()?.remove_child(this._revolutionaryClock.container);
        delete Main.panel.statusArea[this.uuid];
        this._setClockInMainPanel();
    }

    disable() {
        this._enabled = false;

        this._signals.forEach(({id}) => { if (id && this._settings) this._settings.disconnect(id); });
        this._signals = [];
        
        if (this._revolutionaryClock) {
            this._revolutionaryClock.destroy();
            this._revolutionaryClock = null;
        }

        this._settings = null;
    }
}
