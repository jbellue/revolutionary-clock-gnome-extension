https://gjs.guide/extensions/development/translations.html

## Locale Structure

Each locale file in `src/locale/` contains translations for month names, weekdays, and all 366 days of the year.

Days can include Wikipedia links:
```javascript
'day_1': { name: 'Raisin', link: 'https://fr.wikipedia.org/wiki/Raisin' },
```

Or just the name (for backward compatibility):
```javascript
'day_1': 'Raisin',
```

When a day has a link, clicking on the date in the menu will open the Wikipedia page in your browser.

TODO:
- verify the i18n
- add a script to harvest the wikipedia data (e.g. https://en.wikipedia.org/wiki/French_Republican_calendar#Months, https://fr.wikipedia.org/wiki/Calendrier_r%C3%A9publicain)
- better control of the emoji flag
- add toggles to show/hide year day (and link)