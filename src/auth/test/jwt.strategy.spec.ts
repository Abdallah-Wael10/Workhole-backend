import { JwtStrategy } from '../stratregies/jwt.strategy';

describe('JwtStrategy', () => {
  it('should be defined', () => {
    expect(new JwtStrategy()).toBeDefined();
  });
});
