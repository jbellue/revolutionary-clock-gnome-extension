import test from 'node:test';
import assert from 'node:assert/strict';

import {
    assertKnownEquinoxTransitionDate,
    assertMidnightRollover,
    getRepublicanDate,
    getRepublicanNewYearDate,
    translations,
} from './helpers/republicanCalendarAssertions.mjs';

test('getRepublicanDate advances at local midnight in Europe/Paris', () => {
    assertMidnightRollover();
});

test('getRepublicanDate starts a new republican year on the known 2026 equinox day', () => {
    assertKnownEquinoxTransitionDate(2026, 23);
});

test('getRepublicanDate matches known equinox transition dates across multiple years', () => {
    const knownTransitionDates = [
        [2024, 22],
        [2025, 22],
        [2026, 23],
        [2027, 23],
        [2028, 22],
    ];

    for (const [year, dayOfMonth] of knownTransitionDates)
        assertKnownEquinoxTransitionDate(year, dayOfMonth);
});

test('getRepublicanDate throws for years outside supported equinox computation range', () => {
    assert.throws(
        () => getRepublicanDate(new Date('1582-09-22T12:00:00'), translations),
        /Year must be between 1583 and 2999/
    );
    assert.throws(
        () => getRepublicanDate(new Date('3000-09-22T12:00:00'), translations),
        /Year must be between 1583 and 2999/
    );
});

test('getRepublicanDate uses exact complementary-day counts for known 5-day and 6-day years', () => {
    const cases = [
        [2024, 5],
        [2025, 6],
    ];

    for (const [year, expectedComplementaryDays] of cases) {
        const nextNewYear = getRepublicanNewYearDate(year + 1);
        const finalRepublicanDay = getRepublicanDate(new Date(nextNewYear.getTime() - 86400000), translations);

        assert.equal(finalRepublicanDay.monthName, translations.months[12]);
        assert.equal(finalRepublicanDay.dayOfMonth, expectedComplementaryDays);
    }
});

test('getRepublicanDate rolls from day 30 of a month to day 1 of the next month', () => {
    const newYear = getRepublicanNewYearDate(2026);
    const lastDayOfMonth = getRepublicanDate(new Date(newYear.getTime() + 29 * 86400000), translations);
    const firstDayOfNextMonth = getRepublicanDate(new Date(newYear.getTime() + 30 * 86400000), translations);

    assert.equal(lastDayOfMonth.dayOfMonth, 30);
    assert.equal(lastDayOfMonth.monthName, translations.months[0]);
    assert.equal(firstDayOfNextMonth.dayOfMonth, 1);
    assert.equal(firstDayOfNextMonth.monthName, translations.months[1]);
    assert.equal(firstDayOfNextMonth.dayOfWeek, translations.weekdays[0]);
});

test('getRepublicanDate returns the same date fields regardless of time of day', () => {
    const earlyMorning = getRepublicanDate(new Date('2026-04-02T00:01:00'), translations);
    const lateEvening  = getRepublicanDate(new Date('2026-04-02T23:59:00'), translations);

    assert.equal(lateEvening.years,      earlyMorning.years);
    assert.equal(lateEvening.dayOfMonth, earlyMorning.dayOfMonth);
    assert.equal(lateEvening.monthName,  earlyMorning.monthName);
    assert.equal(lateEvening.dayOfWeek,  earlyMorning.dayOfWeek);
    assert.deepEqual(lateEvening.dayName, earlyMorning.dayName);
});

test('getRepublicanDate enters the complementary days near the end of the republican year', () => {
    const nextNewYear = getRepublicanNewYearDate(2027);
    const finalRepublicanDay = getRepublicanDate(new Date(nextNewYear.getTime() - 86400000), translations);

    assert.equal(finalRepublicanDay.monthName, translations.months[12]);
    assert.ok(finalRepublicanDay.dayOfMonth >= 5);
    assert.ok(finalRepublicanDay.dayOfMonth <= 6);
});

test('getRepublicanDate exposes the expected roman numeral year', () => {
    const republicanDate = getRepublicanDate(new Date('2026-04-02T12:00:00'), translations);

    assert.equal(republicanDate.years, 234);
    assert.equal(republicanDate.yearsRoman, 'CCXXXIV');
});

test('getRepublicanDate uses the day index that matches the republican day count', () => {
    const newYear = getRepublicanNewYearDate(2026);
    const tenthDay = getRepublicanDate(new Date(newYear.getTime() + 9 * 86400000), translations);
    const eleventhDay = getRepublicanDate(new Date(newYear.getTime() + 10 * 86400000), translations);

    assert.deepEqual(tenthDay.dayName, translations.days[9]);
    assert.equal(tenthDay.dayOfWeek, translations.weekdays[9]);
    assert.deepEqual(eleventhDay.dayName, translations.days[10]);
    assert.equal(eleventhDay.dayOfWeek, translations.weekdays[0]);
});

test('getRepublicanDate maps the first and last days of the year to the correct day indices', () => {
    // 2024 republican year: 365 days (index 0..364), 2025: 366 days (index 0..365)
    const yearLengths = [
        [2024, 364],
        [2025, 365],
    ];

    for (const [year, lastIndex] of yearLengths) {
        const newYear = getRepublicanNewYearDate(year);
        const firstDay = getRepublicanDate(newYear, translations);
        const lastDay  = getRepublicanDate(new Date(newYear.getTime() + lastIndex * 86400000), translations);

        assert.deepEqual(firstDay.dayName, translations.days[0]);
        assert.deepEqual(lastDay.dayName,  translations.days[lastIndex]);
    }
});

test('getRepublicanDate returns stable translation payload fields', () => {
    const republicanDate = getRepublicanDate(new Date('2026-04-02T12:00:00'), translations);

    assert.equal(typeof republicanDate.years, 'number');
    assert.equal(typeof republicanDate.yearsRoman, 'string');
    assert.equal(typeof republicanDate.dayOfMonth, 'number');
    assert.equal(typeof republicanDate.monthName, 'string');
    assert.equal(typeof republicanDate.dayOfWeek, 'string');
    assert.deepEqual(republicanDate.dayName, translations.days.find(day => day.name === republicanDate.dayName.name));
});