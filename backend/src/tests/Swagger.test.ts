import { describe, it, expect } from 'vitest';
import { swaggerSpec } from '../presentation/swagger/swaggerConfig.js';

describe('Swagger documentation completeness', () => {
  it('includes the operations previously discarded by invalid YAML', () => {
    const spec = swaggerSpec as { paths: Record<string, Record<string, unknown>> };
    expect(spec.paths['/tailors'].get).toBeDefined();
    expect(spec.paths['/orders'].get).toBeDefined();
    expect(spec.paths['/orders'].post).toBeDefined();
    expect(spec.paths['/orders/{id}/quotation/validate'].post).toBeDefined();
    expect(spec.paths['/orders/{id}/quotation/accept'].post).toBeDefined();
  });
});
