import assert from 'node:assert/strict';

import { loadSourceModule } from './loadSourceModule.mjs';

const { getRepublicanDate } = await loadSourceModule('../../src/republicanCalendar.js');

export function createTranslations() {
    return {
        months: Array.from({ length: 13 }, (_, index) => `Month ${index + 1}`),
        weekdays: Array.from({ length: 10 }, (_, index) => `Weekday ${index + 1}`),
        days: Array.from({ length: 366 }, (_, index) => ({
            name: `Day ${index + 1}`,
            link: `https://example.com/day-${index + 1}`,
        })),
    };
}

export const translations = createTranslations();

export function getRepublicanNewYearDate(year) {
    for (const day of [20, 21, 22, 23, 24]) {
        const candidate = new Date(`${year}-09-${String(day).padStart(2, '0')}T12:00:00`);
        const republicanDate = getRepublicanDate(candidate, translations);

        if (republicanDate.dayOfMonth === 1 && republicanDate.monthName === translations.months[0])
            return candidate;
    }

    throw new Error(`Could not determine republican new year for ${year}`);
}

export function assertMidnightRollover() {
    const beforeMidnight = getRepublicanDate(new Date('2026-04-02T23:59:00'), translations);
    const afterMidnight = getRepublicanDate(new Date('2026-04-03T00:01:00'), translations);

    assert.equal(afterMidnight.dayOfMonth, beforeMidnight.dayOfMonth + 1);
    assert.notDeepEqual(afterMidnight.dayName, beforeMidnight.dayName);
    assert.notDeepEqual(afterMidnight.dayOfWeek, beforeMidnight.dayOfWeek);
}

export function assertKnownEquinoxTransitionDate(year, dayOfMonth) {
    const transitionDay = getRepublicanDate(
        new Date(`${year}-09-${String(dayOfMonth).padStart(2, '0')}T12:00:00`),
        translations
    );
    const previousDay = getRepublicanDate(
        new Date(`${year}-09-${String(dayOfMonth - 1).padStart(2, '0')}T12:00:00`),
        translations
    );

    assert.equal(transitionDay.years, previousDay.years + 1);
    assert.equal(transitionDay.dayOfMonth, 1);
    assert.equal(transitionDay.monthName, translations.months[0]);
    assert.equal(transitionDay.dayOfWeek, translations.weekdays[0]);
}

export { getRepublicanDate };