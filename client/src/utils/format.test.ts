import { describe, expect, it } from 'vitest';
import { formatDuration, formatPercentage, humanizeToken } from './format';

describe('format helpers', () => {
  it('formats similarity as a percentage', () => {
    expect(formatPercentage(0.9107769727706909)).toBe('91.08%');
    expect(formatPercentage(null)).toBe('Not available');
  });

  it('formats durations for quick and slower responses', () => {
    expect(formatDuration(850)).toBe('850 ms');
    expect(formatDuration(1250)).toBe('1.3 s');
  });

  it('turns API tokens into readable labels', () => {
    expect(humanizeToken('SAME_INTENT')).toBe('Same Intent');
    expect(humanizeToken(null)).toBe('Not available');
  });
});
