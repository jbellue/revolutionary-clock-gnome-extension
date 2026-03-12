# Revolutionary Clock

A GNOME Shell extension that displays a French Republican (Revolutionary) clock and calendar in the system panel.

## Features

- **Decimal Clock**: Shows the revolutionary decimal time (10 hours, 100 minutes, 100 seconds per day)
- **Revolutionary Calendar**: Displays dates according to the French Republican Calendar
- **Wikipedia Integration**: Click on dates to open Wikipedia pages about the day, with optional image display
- **Multilingual Support**: Available in French, English, Spanish, and Catalan
- **Customizable**: Preferences window for configuring display options

## Installation

1. Copy or symlink this folder to your GNOME Shell extensions directory:
   ```bash
   ln -s $(pwd) ~/.local/share/gnome-shell/extensions/revolutionary@jbellue.github.io
   ```

2. Restart GNOME Shell:
   - On X11: `Alt+F2`, type `r`, press Enter
   - On Wayland: Log out and log back in

3. Enable the extension:
   ```bash
   gnome-extensions enable revolutionary@jbellue.github.io
   ```

## Usage

Once enabled, the revolutionary clock appears in the GNOME Shell panel. Click on it to open a dropdown menu showing:
- The current revolutionary date
- Day name and associated symbol
- Optional Wikipedia image for the day

Open preferences with:
```bash
gnome-extensions prefs revolutionary@jbellue.github.io
```

## Locale Structure

Each locale file in `src/locale/` contains translations for month names, weekdays, and all 366 days of the year, semi-automatically populated from the Wikipedia (i.e. a lot of poor scripting and manual fixes). When a day has a link, clicking on the date in the menu will open the Wikipedia page in your browser.

To add a new locale:
1. Create a new JS file in `src/locale/` (e.g., `de.js`)
2. Follow the structure of existing locale files like `fr.js`
3. Export month names, weekday names, day names, and optional links/images

## Development

- **Logs**: View logs with `journalctl /usr/bin/gnome-shell -f`
- **Cache**: Wikipedia images are cached in `~/.cache/revolutionaryclock/`
- **Requirements**: GNOME Shell 49

### Make Targets

- `make install` - Compile translations and install extension to `~/.local/share/gnome-shell/extensions/`
- `make uninstall` - Remove the installed extension
- `make reinstall` - Uninstall and reinstall the extension
- `make pot` - Extract translatable strings from source to POT file
- `make po` - Update all PO files from the POT template
- `make mo` - Compile PO files to MO (binary translation files)
- `make package` - Create a distributable ZIP file in `dist/`
- `make lint` - Build and run a containerized lint check (Podman first, then Docker fallback) for JS syntax and bug-prone logic issues
- `make lint-watch` - Run lint in watch mode (via file watcher) and re-check on file saves
- `make dev` - Reinstall and launch a development GNOME Shell session
- `make dev-fr` / `dev-es` / `dev-ca` - Launch dev session with specific locale
- `make prefs` - Reinstall and open preferences window
- `make dbus` - Start a development GNOME Shell session with dbus-run-session

On Fedora/SELinux with Podman, both lint targets automatically use `:Z` on the bind mount.

## TODO

- [ ] Add a script to load each wikipedia file, look it up in a new language, and dump that into a new locale file. That won't translate the rest, just the day name and the link, but that'll be a start.
- [ ] Manually upload to Gnome shell extensions
- [ ] Upload to Gnome shell extensions through a pipeline

## License

See the LICENSE file for details.