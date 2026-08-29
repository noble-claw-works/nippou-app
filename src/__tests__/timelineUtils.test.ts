import { describe, it, expect } from 'vitest';
import { timeToMinutes, minutesToTime } from '../utils';

describe('timeToMinutes', () => {
  it('09:00 → 540', () => expect(timeToMinutes('09:00')).toBe(540));
  it('22:30 → 1350', () => expect(timeToMinutes('22:30')).toBe(1350));
  it('00:00 → 0', () => expect(timeToMinutes('00:00')).toBe(0));
  it('01:15 → 75', () => expect(timeToMinutes('01:15')).toBe(75));
  it('12:00 → 720', () => expect(timeToMinutes('12:00')).toBe(720));
});

describe('minutesToTime', () => {
  it('540 → 09:00', () => expect(minutesToTime(540)).toBe('09:00'));
  it('75 → 01:15', () => expect(minutesToTime(75)).toBe('01:15'));
  it('0 → 00:00', () => expect(minutesToTime(0)).toBe('00:00'));
  it('1350 → 22:30', () => expect(minutesToTime(1350)).toBe('22:30'));
  it('720 → 12:00', () => expect(minutesToTime(720)).toBe('12:00'));
});

describe('round-trip consistency', () => {
  it('timeToMinutes(minutesToTime(x)) === x for various values', () => {
    [0, 60, 75, 540, 720, 1350].forEach(min => {
      expect(timeToMinutes(minutesToTime(min))).toBe(min);
    });
  });
});
