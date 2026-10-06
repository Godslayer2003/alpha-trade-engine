import { crisisResponse } from './safety';
describe('Crisis fallback', () => {
  it('responds to explicit personal danger without invoking a paid provider', () => {
    expect(crisisResponse('I want to kill myself after losing money')?.model).toBe('safety-response');
  });
  it('does not confuse trading risk controls or ordinary losses with a crisis', () => {
    expect(crisisResponse('How do I set a stop loss?')).toBeNull();
    expect(crisisResponse('I lost money and want to end my trade')).toBeNull();
  });
});
