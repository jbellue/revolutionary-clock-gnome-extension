import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const timezoneAssertionsScript = fileURLToPath(
    new URL('./helpers/runRepublicanCalendarTimezoneAssertions.mjs', import.meta.url)
);

const timezones = [
    'UTC',
    'Europe/Paris',
    'America/New_York',
    'Pacific/Auckland',
];

for (const timezone of timezones) {
    test(`getRepublicanDate handles local midnight and equinox boundaries in ${timezone}`, () => {
        const result = spawnSync(
            process.execPath,
            [timezoneAssertionsScript],
            {
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    TZ: timezone,
                },
                encoding: 'utf8',
            }
        );

        assert.equal(
            result.status,
            0,
            `timezone ${timezone} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
        );
    });
}