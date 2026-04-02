import {
    assertKnownEquinoxTransitionDate,
    assertMidnightRollover,
} from './republicanCalendarAssertions.mjs';

assertMidnightRollover();
assertKnownEquinoxTransitionDate(2026, 23);