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

import { setTranslationFunction } from './revdate.js';
import { setupLocale, translate } from './translations.js';
import { RevolutionaryClock } from './clockIndicator.js';


export default class RevolutionaryClockExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._signals = [
            { id: this._settings.connect('changed::clock-position-in-status-bar', () => this._updatePosition()) },
            { id: this._settings.connect('changed::clock-index-in-status-bar', () => this._updatePosition()) }
        ];


        this._updateTranslationFunction().then(() => {
            this._signals.push({ id: 
                this._settings.connect('changed::locale', () => {
                this._updateTranslationFunction().then(() => {
                    if (this._revolutionaryClock) {
                        this._revolutionaryClock._updateClockLabel();
                        this._revolutionaryClock._updateDateMenuItem();
                    }
                })
                })
            });

            this._createClockInMainPanel();
        }).catch(e => {
            console.error(`[Revolutionary Clock] Failed to enable extension: ${e.message}`);
        });
    }

    async _updateTranslationFunction() {
        const locale = this._settings.get_string('locale');
        await setupLocale(locale, this.dir);
        setTranslationFunction(translate);
    }

    _createClockInMainPanel() {
            const index = this._settings.get_int('clock-index-in-status-bar');
            const location = this._settings.get_string('clock-position-in-status-bar');
            this._revolutionaryClock = new RevolutionaryClock(this._settings);
            Main.panel.addToStatusArea(this.uuid, this._revolutionaryClock, index, location);
    }

    _updatePosition() {
        if (!this._revolutionaryClock) return;
        this._revolutionaryClock.destroy();
        this._createClockInMainPanel();
    }

    disable() {
        this._signals.forEach(({id}) => { if (id) this._settings.disconnect(id); });
        this._signals = [];
        
        if (this._revolutionaryClock) {
            this._revolutionaryClock.destroy();
            this._revolutionaryClock = null;
        }

        this._settings = null;
    }
}
