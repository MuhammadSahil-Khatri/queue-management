import { describe, it, expect } from 'vitest';
import { calculateWaitTimeMinutes } from '../src/services/waitTimeService.js';

describe('Wait Time Calculation Service', () => {
  it('returns 0 when 0 people are ahead', () => {
    const result = calculateWaitTimeMinutes({
      peopleAhead: 0,
      avgServiceDuration: 15,
      activeCounters: 2,
    });
    expect(result).toBe(0);
  });

  it('matches Section 4 benchmark: 5 people ahead, 4 min duration, 2 active counters = 10 minutes', () => {
    const result = calculateWaitTimeMinutes({
      peopleAhead: 5,
      avgServiceDuration: 4,
      activeCounters: 2,
    });
    // Formula: ceil((5 * 4) / 2) = 10
    expect(result).toBe(10);
  });

  it('calculates wait time correctly with odd numbers and rounds up with ceil', () => {
    const result = calculateWaitTimeMinutes({
      peopleAhead: 3,
      avgServiceDuration: 10,
      activeCounters: 2,
    });
    // (3 * 10) / 2 = 15
    expect(result).toBe(15);

    const oddCeil = calculateWaitTimeMinutes({
      peopleAhead: 5,
      avgServiceDuration: 7,
      activeCounters: 2,
    });
    // (5 * 7) / 2 = 17.5 -> ceil = 18
    expect(oddCeil).toBe(18);
  });

  it('gracefully handles 0 active counters by defaulting to 1 counter to prevent division by zero', () => {
    const result = calculateWaitTimeMinutes({
      peopleAhead: 2,
      avgServiceDuration: 10,
      activeCounters: 0,
    });
    // (2 * 10) / 1 = 20
    expect(result).toBe(20);
  });
});
