import {isScopeActive, validateEngagementScope} from './authorization';

describe('Lumina engagement scope', () => {
  const scope = {
    owner: 'security@example.test',
    targets: ['staging.example.test'],
    exclusions: ['production.example.test'],
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-01-02T00:00:00.000Z',
    authorizationReference: 'ROE-001',
  };

  it('accepts a complete scope', () => {
    expect(validateEngagementScope(scope)).toEqual([]);
  });

  it('requires a target and authorization reference', () => {
    expect(validateEngagementScope({...scope, targets: [], authorizationReference: ''})).toHaveLength(2);
  });

  it('checks the active test window', () => {
    expect(isScopeActive(scope, new Date('2026-01-01T12:00:00.000Z'))).toBe(true);
    expect(isScopeActive(scope, new Date('2026-02-01T12:00:00.000Z'))).toBe(false);
  });
});
