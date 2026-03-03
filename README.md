## Locale Structure

Each locale file in `src/locale/` contains translations for month names, weekdays, and all 366 days of the year.

When a day has a link, clicking on the date in the menu will open the Wikipedia page in your browser.

TODO:
- fix the prefs i18n
- make the position (left/center/right) an enum and dropdown (the togglegroup looks pretty bad)
- add periodic cache cleaning
- add a debug settings page (e.g. clear cache now, browse cache)
- fix this error too:
GNOME Shell-Message: 13:24:15.659: [RevolutionaryClock] No thumbnail found in API response for: https://fr.wikipedia.org/wiki/B%C3%AAche
GNOME Shell-Message: 13:24:15.659: [RevolutionaryClock] No Wikipedia image URL found for: https://fr.wikipedia.org/wiki/B%C3%AAche