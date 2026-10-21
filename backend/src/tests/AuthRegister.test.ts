import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';
const repo = vi.hoisted(() => ({ findByPhone: vi.fn(), findByEmail: vi.fn(), create: vi.fn() }));
vi.mock('../infrastructure/database/PrismaUserRepository.js', () => ({ PrismaUserRepository: class { findByPhone = repo.findByPhone; findByEmail = repo.findByEmail; create = repo.create; } }));
import { AuthController } from '../presentation/http/controllers/AuthController.js';

beforeEach(() => {
  vi.resetAllMocks();
  repo.findByPhone.mockResolvedValue(null);
  repo.findByEmail.mockResolvedValue(null);
});
async function register() {
  const req = { body: { name: 'Test', phone: '+221700000000', email: 'test@example.com', password: 'test-password', role: 'CLIENT' } } as Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  await AuthController.register(req, res as unknown as Response, next as NextFunction);
  return { res, next };
}
describe('Registration conflicts', () => {
  it('returns 409 for an existing email without creating an account', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'existing' });
    const { res, next } = await register();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: expect.objectContaining({ code: 'EMAIL_ALREADY_USED' }) });
    expect(repo.create).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
  it.each(['phone', 'email'])('handles a concurrent %s uniqueness conflict', async (field) => {
    repo.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: '5', meta: { target: [field] } }));
    const { res, next } = await register();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: expect.objectContaining({ code: `${field.toUpperCase()}_ALREADY_USED` }) });
    expect(next).not.toHaveBeenCalled();
  });
  it('still forwards unexpected database failures', async () => {
    const error = new Error('database unavailable');
    repo.findByPhone.mockRejectedValue(error);
    const { next } = await register();
    expect(next).toHaveBeenCalledWith(error);
  });
});
