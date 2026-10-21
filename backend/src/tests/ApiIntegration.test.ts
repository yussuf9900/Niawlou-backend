import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('API End-to-End & Swagger Integration', () => {
  const app = createApp();

  it('GET / renvoie un statut HEALTHY et le lien vers Swagger', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('NIAWLOU Backend API');
    expect(res.body.status).toBe('HEALTHY');
    expect(res.body.documentation).toBe('/api/docs');
  });

  it('GET /api/docs.json renvoie la spécification OpenAPI 3.0.3 valide', async () => {
    const res = await request(app).get('/api/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    // Inspect Swagger paths
    const pathKeys = Object.keys(res.body.paths);
    expect(pathKeys.length).toBeGreaterThan(0);
    expect(pathKeys.some(k => k.startsWith('/tailors'))).toBe(true);
    expect(pathKeys.some(k => k.startsWith('/orders'))).toBe(true);
    expect(pathKeys.some(k => k.startsWith('/payments'))).toBe(true);
    expect(pathKeys.some(k => k.startsWith('/auth'))).toBe(true);
  });

  it('GET /api/v1/tailors retourne la liste des ateliers couturiers', async () => {
    const res = await request(app).get('/api/v1/tailors');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tailors)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.tailors[0].atelierName).toBe('Maison Aïssatou');
  });

  it('GET /api/v1/tailors/models retourne les créations du catalogue', async () => {
    const res = await request(app).get('/api/v1/tailors/models');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.models)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
    const hasRobeNala = res.body.models.some((m: { title: string }) => m.title === 'Robe Nala en bazin');
    expect(hasRobeNala).toBe(true);
  });

  it('POST /api/v1/auth/login permet à Awa Diop de se connecter et recevoir un JWT', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      phone: '+221771234542',
      password: 'passer123'
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.name).toBe('Awa Diop');
    expect(res.body.user.role).toBe('CLIENT');
  });
});
