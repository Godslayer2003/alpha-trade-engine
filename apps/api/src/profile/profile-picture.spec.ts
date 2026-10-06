import { isSafeProfilePicture } from './profile-picture';
describe('Profile image boundary', () => {
  it('rejects external tracking URLs, SVG and disguised text', () => {
    expect(isSafeProfilePicture('https://example.com/track')).toBe(false);
    expect(isSafeProfilePicture('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isSafeProfilePicture('data:image/png;base64,PHN2Zz4=')).toBe(false);
  });
  it('accepts a raster image signature', () => {
    expect(isSafeProfilePicture('data:image/png;base64,' + Buffer.from([137,80,78,71,13,10,26,10]).toString('base64'))).toBe(true);
  });
});
