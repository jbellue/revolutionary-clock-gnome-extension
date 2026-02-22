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

import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { getRepublicanClock, getRepublicanDate, setTranslationFunction } from './revdate.js';
import { setupLocale, translate } from './translations.js';


const RevolutionaryClock = GObject.registerClass(
class RevolutionaryClock extends PanelMenu.Button {
    _init(settings) {
        super._init(0.5, 'Revolutionary Clock', false);

        this._settings = settings;
        this._pointerCursor = this._resolveCursor(['POINTING_HAND', 'POINTER', 'HAND']);
        this._defaultCursor = this._resolveCursor(['DEFAULT', 'ARROW']);

        this._clockLabel = new St.Label({
            text: '',
            style_class: 'panel-label',
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
        });
        this.add_child(this._clockLabel);

        this._clockTimeout = 0;
        this._updateClockLabel();
        this._startClockTimer();

        // --- Create date menu item now ---
        this._dateMenuItem = new PopupMenu.PopupBaseMenuItem({
            reactive: true,
            activate: false,
            can_focus: false,
        });
        this._dateMenuItem.track_hover = false;

        // Container to eliminate spacing issues
        this._dateContainer = new St.BoxLayout({
            vertical: false,
            x_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
        });

        // Label for the date
        this._dateLabel = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.START,
            x_expand: false,
        });
        this._dateContainer.add_child(this._dateLabel);

        // --- Day name link button ---
        this._dateDayLinkButton = new St.Button({
            style_class: 'button revolutionary-clock-day-link-button',
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._dateDayLinkContent = new St.BoxLayout({
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._dateDayLinkIcon = new St.Icon({
            icon_name: 'system-search-symbolic',
            style_class: 'popup-menu-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._dateDayLinkLabel = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._dateDayLinkContent.add_child(this._dateDayLinkIcon);
        this._dateDayLinkContent.add_child(this._dateDayLinkLabel);
        this._dateDayLinkButton.set_child(this._dateDayLinkContent);

        // Add container to menu item, then to menu
        this._dateMenuItem.add_child(this._dateContainer);
        this.menu.addMenuItem(this._dateMenuItem);
        this.menu.actor.add_style_class_name('revolutionary-clock-menu-popup');

        // Now safe to update the date
        this._updateDateMenuItem();

        // --- setting signals ---
        this._includeDayNameChangedId = this._settings.connect('changed::include-day-name', () => {
            this._updateDateMenuItem();
        });
        this._includeDayNameLinkChangedId = this._settings.connect('changed::include-day-name-link', () => {
            this._updateDateMenuItem();
        });
        this._includeYearChangedId = this._settings.connect('changed::include-date-year', () => {
            this._updateDateMenuItem();
        });
        this._yearAsRomanNumeralsChangedId = this._settings.connect('changed::year-as-roman-numerals', () => {
            this._updateDateMenuItem();
        });
        this.menu.connect('open-state-changed', (_, isOpen) => {
            if (isOpen)
                this._updateDateMenuItem();
        });

        this._settingsChangedId = this._settings.connect('changed::clock-decoration', () => this._updateClockLabel());
        this._decorationBeforeChangedId = this._settings.connect('changed::decoration-before-clock', () => this._updateClockLabel());
        this._decorationAfterChangedId = this._settings.connect('changed::decoration-after-clock', () => this._updateClockLabel());
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

    _updateDateMenuItem() {
        // Guard against race during initialization
        if (!this._dateMenuItem || !this._dateContainer)
            return;

        const date = getRepublicanDate(new Date());
        const includeDayName = this._settings.get_boolean('include-day-name');
        const includeDayNameLink = this._settings.get_boolean('include-day-name-link');
        const includeYear = this._settings.get_boolean('include-date-year');
        const yearAsRoman = this._settings.get_boolean('year-as-roman-numerals');

        // Format date label
        const yearText = includeYear ? ` ${yearAsRoman ? date.yearsRoman : date.years}` : '';

        const dayText = date.dayName?.name || date.dayName || '';
        const dayLink = date.dayName?.link || null;
        const showDayText = includeDayName && dayText;
        const showLink = showDayText && includeDayNameLink && dayLink;

        this._dateLabel.text = `${date.dayOfWeek} ${date.dayOfMonth} ${date.monthName}${yearText}`;
        if (showDayText && !showLink)
            this._dateLabel.text += ` — ${dayText}`;

        // Remove old button if present
        if (this._dateDayLinkButton.get_parent())
            this._dateContainer.remove_child(this._dateDayLinkButton);

        this._teardownDayLinkButton();

        if (showLink) {
            this._dateDayLinkLabel.text = dayText;
            this._dateContainer.add_child(this._dateDayLinkButton);
            this._setUpDayLinkButton(dayLink);
        }
    }

    _setUpDayLinkButton(link) {
        this._dayLinkHandler = this._dateDayLinkButton.connect('clicked', () => {
            Gio.AppInfo.launch_default_for_uri(link, null);
        });

        if (this._pointerCursor !== null && this._defaultCursor !== null && global.display?.set_cursor) {
            this._dayHoverEnterHandler = this._dateDayLinkButton.connect('enter-event', () => {
                global.display.set_cursor(this._pointerCursor);
                return Clutter.EVENT_PROPAGATE;
            });
            this._dayHoverLeaveHandler = this._dateDayLinkButton.connect('leave-event', () => {
                global.display.set_cursor(this._defaultCursor);
                return Clutter.EVENT_PROPAGATE;
            });
        }

        this._dateDayLinkButton.reactive = true;
        this._dateDayLinkButton.can_focus = true;
        this._dateDayLinkButton.track_hover = true;
    }

    _teardownDayLinkButton() {
        if (this._dayLinkHandler) {
            this._dateDayLinkButton.disconnect(this._dayLinkHandler);
            this._dayLinkHandler = null;
        }
        if (this._dayHoverEnterHandler) {
            this._dateDayLinkButton.disconnect(this._dayHoverEnterHandler);
            this._dayHoverEnterHandler = null;
        }
        if (this._dayHoverLeaveHandler) {
            this._dateDayLinkButton.disconnect(this._dayHoverLeaveHandler);
            this._dayHoverLeaveHandler = null;
        }
        if (this._defaultCursor !== null && global.display?.set_cursor)
            global.display.set_cursor(this._defaultCursor);
    }

    _updateClockLabel() {
        this._clockLabel.set_text(this._formatNow());
    }

    _startClockTimer() {
        this._clockTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this._updateClockLabel();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _formatNow() {
        const pad2 = n => String(Math.floor(n)).padStart(2, '0');
        const clock = getRepublicanClock(new Date());
        const clockDecoration = this._settings.get_string('clock-decoration');
        const decorationBefore = this._settings.get_boolean('decoration-before-clock');
        const decorationAfter = this._settings.get_boolean('decoration-after-clock');

        const timeStr = `${pad2(clock.hours)}:${pad2(clock.minutes)}`;
        if (!clockDecoration)
            return timeStr;

        const parts = [];
        if (decorationBefore)
            parts.push(clockDecoration);
        parts.push(timeStr);
        if (decorationAfter)
            parts.push(clockDecoration);

        return parts.join(' ');
    }

    destroy() {
        if (this._clockTimeout) {
            GLib.Source.remove(this._clockTimeout);
            this._clockTimeout = 0;
        }
        this._teardownDayLinkButton();

        if (this._defaultCursor !== null && global.display?.set_cursor)
            global.display.set_cursor(this._defaultCursor);

        const ids = [
            '_settingsChangedId',
            '_decorationBeforeChangedId',
            '_decorationAfterChangedId',
            '_includeDayNameChangedId',
            '_includeDayNameLinkChangedId',
            '_includeYearChangedId',
            '_yearAsRomanNumeralsChangedId',
        ];
        for (const idName of ids) {
            if (this[idName]) {
                this._settings.disconnect(this[idName]);
                this[idName] = null;
            }
        }
        super.destroy();
    }
});


export default class RevolutionaryClockExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        this._updateTranslationFunction().then(() => {
            this._localeChangedId = this._settings.connect('changed::locale', () => {
                this._updateTranslationFunction().then(() => {
                    if (this._revolutionaryClock) {
                        this._revolutionaryClock._updateClockLabel();
                        this._revolutionaryClock._updateDateMenuItem();
                    }
                });
            });

            this._revolutionaryClock = new RevolutionaryClock(this._settings);
            Main.panel.addToStatusArea(this.uuid, this._revolutionaryClock);
        }).catch(e => {
            console.error(`[Revolutionary Clock] Failed to enable extension: ${e.message}`);
        });
    }

    async _updateTranslationFunction() {
        const locale = this._settings.get_string('locale');
        await setupLocale(locale, this.dir);
        setTranslationFunction(translate);
    }

    disable() {
        if (this._localeChangedId) {
            this._settings.disconnect(this._localeChangedId);
            this._localeChangedId = null;
        }

        if (this._revolutionaryClock) {
            this._revolutionaryClock.destroy();
            this._revolutionaryClock = null;
        }

        this._settings = null;
    }
}
