import { isWithinDueWindow } from './notifications.service';

describe('isWithinDueWindow', () => {
  it('fires at the configured minute and during the following four minutes', () => {
    expect(isWithinDueWindow('07:00', 7 * 60)).toBe(true);
    expect(isWithinDueWindow('07:00', 7 * 60 + 4)).toBe(true);
  });

  it('does not fire before the configured time', () => {
    expect(isWithinDueWindow('07:00', 6 * 60 + 59)).toBe(false);
  });

  it('does not fire after the five-minute window', () => {
    expect(isWithinDueWindow('07:00', 7 * 60 + 5)).toBe(false);
  });

  it('handles a window crossing midnight', () => {
    expect(isWithinDueWindow('23:58', 1)).toBe(true);
    expect(isWithinDueWindow('23:58', 3)).toBe(false);
  });
});
