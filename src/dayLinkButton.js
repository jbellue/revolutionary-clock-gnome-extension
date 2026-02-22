/* dayLinkButton.js
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
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';

export const DayLinkButton = GObject.registerClass(
class DayLinkButton extends St.Button {
    _init() {
        super._init({
            style_class: 'button revolutionary-clock-day-link-button',
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._pointerCursor = this._resolveCursor(['POINTING_HAND', 'POINTER', 'HAND']);
        this._defaultCursor = this._resolveCursor(['DEFAULT', 'ARROW']);

        const content = new St.BoxLayout({
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: false,
        });
        this._icon = new St.Icon({
            icon_name: 'system-search-symbolic',
            style_class: 'popup-menu-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._label = new St.Label({
            y_align: Clutter.ActorAlign.CENTER,
        });

        content.add_child(this._icon);
        content.add_child(this._label);
        this.set_child(content);

        this._clickHandler = null;
        this._hoverEnterHandler = null;
        this._hoverLeaveHandler = null;
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

    setup(link, label) {
        this.teardown();

        this._label.text = label;
        this._clickHandler = this.connect('clicked', () => {
            Gio.AppInfo.launch_default_for_uri(link, null);
        });

        if (this._pointerCursor !== null && this._defaultCursor !== null && global.display?.set_cursor) {
            this._hoverEnterHandler = this.connect('enter-event', () => {
                global.display.set_cursor(this._pointerCursor);
                return Clutter.EVENT_PROPAGATE;
            });
            this._hoverLeaveHandler = this.connect('leave-event', () => {
                global.display.set_cursor(this._defaultCursor);
                return Clutter.EVENT_PROPAGATE;
            });
        }

        this.reactive = true;
        this.can_focus = true;
        this.track_hover = true;
    }

    teardown() {
        if (this._clickHandler) {
            this.disconnect(this._clickHandler);
            this._clickHandler = null;
        }
        if (this._hoverEnterHandler) {
            this.disconnect(this._hoverEnterHandler);
            this._hoverEnterHandler = null;
        }
        if (this._hoverLeaveHandler) {
            this.disconnect(this._hoverLeaveHandler);
            this._hoverLeaveHandler = null;
        }
        if (this._defaultCursor !== null && global.display?.set_cursor)
            global.display.set_cursor(this._defaultCursor);
    }

    destroy() {
        this.teardown();
        super.destroy();
    }
});
