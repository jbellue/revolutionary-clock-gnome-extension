import test from 'node:test';
import assert from 'node:assert/strict';

import { loadSourceModule } from './helpers/loadSourceModule.mjs';

const { getRepublicanTime } = await loadSourceModule('../../src/republicanClock.js');

test('getRepublicanTime returns zeroed decimal time at local midnight', () => {
    const clock = getRepublicanTime(new Date('2026-04-02T00:00:00.000'));

    assert.deepEqual(clock, {
        hours: 0,
        minutes: 0,
        seconds: 0,
    });
});

test('getRepublicanTime maps local noon to 05:00:00', () => {
    const clock = getRepublicanTime(new Date('2026-04-02T12:00:00.000'));

    assert.deepEqual(clock, {
        hours: 5,
        minutes: 0,
        seconds: 0,
    });
});

test('getRepublicanTime approaches 09:99:99 at the end of the day', () => {
    const clock = getRepublicanTime(new Date('2026-04-02T23:59:59.999'));

    assert.deepEqual(clock, {
        hours: 9,
        minutes: 99,
        seconds: 99,
    });
});

test('getRepublicanTime maps a quarter day to 02:50:00', () => {
    const clock = getRepublicanTime(new Date('2026-04-02T06:00:00.000'));

    assert.deepEqual(clock, {
        hours: 2,
        minutes: 50,
        seconds: 0,
    });
});

test('getRepublicanTime preserves fractional progress down to decimal seconds', () => {
    const clock = getRepublicanTime(new Date('2026-04-02T00:00:00.900'));

    assert.deepEqual(clock, {
        hours: 0,
        minutes: 0,
        seconds: 1,
    });
});

test('getRepublicanTime converts 14 minutes 24 seconds to exactly ten decimal minutes', () => {
    const clock = getRepublicanTime(new Date('2026-04-02T00:14:24.000'));

    assert.deepEqual(clock, {
        hours: 0,
        minutes: 10,
        seconds: 0,
    });
});