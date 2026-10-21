import { afterEach, describe, expect, it, vi } from 'vitest';
import { authorizeSwaggerResponse } from '../presentation/swagger/swaggerAuth.js';

afterEach(() => vi.unstubAllGlobals());

describe('Swagger automatic JWT authorization', () => {
  it.each(['login', 'register'])('applies the token returned by %s', (action) => {
    const preauthorizeApiKey = vi.fn();
    vi.stubGlobal('ui', { preauthorizeApiKey });
    // Swagger serializes the interceptor into browser JavaScript.
    const interceptor = new Function(`return (${authorizeSwaggerResponse.toString()})`)();
    const response = { url: `https://example.test/api/v1/auth/${action}`, status: 200, text: JSON.stringify({ token: 'test-jwt' }) };
    expect(interceptor(response)).toBe(response);
    expect(preauthorizeApiKey).toHaveBeenCalledWith('BearerAuth', 'test-jwt');
  });

  it('does not authorize failed logins or unrelated responses', () => {
    const preauthorizeApiKey = vi.fn();
    vi.stubGlobal('ui', { preauthorizeApiKey });
    authorizeSwaggerResponse({ url: '/api/v1/auth/login', status: 401, obj: { token: 'invalid' } });
    authorizeSwaggerResponse({ url: '/api/v1/orders', status: 200, obj: { token: 'unrelated' } });
    authorizeSwaggerResponse({ url: '/api/v1/auth/login', status: 200, text: 'invalid json' });
    expect(preauthorizeApiKey).not.toHaveBeenCalled();
  });
});
