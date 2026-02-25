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
        this._soup.user_agent = 'User-Agent: Mozilla/5.0 (X11; GNOME Shell/0.1a; Linux x86_64; RevolutionaryClock';
        this._wikiImage = null;

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

            // Try to fetch and show Wikipedia image
            if (dayLink) {
                log(`[RevolutionaryClock] Attempting to fetch Wikipedia image for: ${dayLink}`);
                fetchWikipediaImageUrl(this._soup, dayLink).then(url => {
                    log(`[RevolutionaryClock] Wikipedia image URL: ${url}`);
                    if (url) {
                        // Download the image data
                        try {
                            let file = Gio.File.new_for_uri(url);
                            file.load_contents_async(null, (file, res) => {
                                try {
                                    let [ok, contents] = file.load_contents_finish(res);
                                    if (!ok) return;

                                    const GLib = imports.gi.GLib;
                                    
                                    // Save to temp PNG
                                    let tmpDir = GLib.get_tmp_dir();
                                    let timestamp = String(Date.now());
                                    let tempPath = GLib.build_filenamev([tmpDir, `wiki-${timestamp}.png`]);
                                    
                                    let tempFile = Gio.File.new_for_path(tempPath);
                                    let stream = tempFile.replace(null, false, Gio.FileCreateFlags.NONE, null);
                                    stream.write_all(contents, null);
                                    stream.close(null);

                                    // THIS IS THE RIGHT WAY
                                    let gicon = Gio.icon_new_for_string(`file://${tempPath}`);
                                    
                                    this._wikiImage = new St.Icon({
                                        gicon: gicon,
                                        icon_size: 32,
                                        style_class: 'revolutionary-clock-wiki-image',
                                    });
                                    
                                    this._container.insert_child_at_index(this._wikiImage, this._container.get_n_children() - 1);
                                    this._wikiTempPath = tempPath;
                                    
                                } catch (e) {
                                    log(`[RevolutionaryClock] Error: ${e}`);
                                }
                            });
                        } catch (e) {
                            log(`[RevolutionaryClock] Error downloading image: ${e}`);
                        }
                    }
                }).catch(e => {
                    log(`[RevolutionaryClock] Error fetching Wikipedia image URL: ${e}`);
                });
            }
        }
    }

    destroy() {
        if (this._dayLinkButton.get_parent())
            this._container.remove_child(this._dayLinkButton);
        this._dayLinkButton.destroy();
        if (this._wikiImage && this._wikiImage.get_parent())
            this._container.remove_child(this._wikiImage);
        if (this._wikiImage)
            this._wikiImage.destroy();
        if (this._wikiTempPath)
            Gio.File.new_for_path(this._wikiTempPath).delete(null);
        this.item.destroy();
    }
}
