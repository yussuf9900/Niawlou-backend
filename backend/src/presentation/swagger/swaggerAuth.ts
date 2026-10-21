/** Runs in Swagger UI's browser; keep this function self-contained. */
export function authorizeSwaggerResponse(response: {
  url?: string;
  status?: number;
  obj?: { token?: string };
  text?: string;
}) {
  if (response.status && response.status >= 200 && response.status < 300 &&
      /\/auth\/(login|register)(?:\?.*)?$/.test(response.url || '')) {
    try {
      const body = response.obj || JSON.parse(response.text || '{}');
      if (typeof body.token === 'string' && body.token) {
        const browser = globalThis as typeof globalThis & {
          ui?: { preauthorizeApiKey: (name: string, token: string) => void };
        };
        browser.ui?.preauthorizeApiKey('BearerAuth', body.token);
      }
    } catch {
      // Leave malformed responses visible in Swagger without breaking the UI.
    }
  }
  return response;
}
