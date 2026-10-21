import { IUserRepository, UserData } from '../../core/ports/IUserRepository.js';
import { getPrismaClient } from './PrismaClientSingleton.js';

export class PrismaUserRepository implements IUserRepository {
  private prisma = getPrismaClient();

  public async findById(id: string): Promise<UserData | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      role: row.role as 'CLIENT' | 'COUTURIER' | 'ADMIN',
      measurements: row.measurements ? JSON.parse(row.measurements) : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  public async findByPhone(phone: string): Promise<(UserData & { passwordHash: string }) | null> {
    const row = await this.prisma.user.findUnique({ where: { phone } });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      role: row.role as 'CLIENT' | 'COUTURIER' | 'ADMIN',
      measurements: row.measurements ? JSON.parse(row.measurements) : undefined,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  public async findByEmail(email: string): Promise<(UserData & { passwordHash: string }) | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      role: row.role as 'CLIENT' | 'COUTURIER' | 'ADMIN',
      measurements: row.measurements ? JSON.parse(row.measurements) : undefined,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  public async create(
    data: Omit<UserData, 'createdAt' | 'updatedAt'> & { passwordHash: string }
  ): Promise<UserData> {
    const row = await this.prisma.user.create({
      data: {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        measurements: data.measurements ? JSON.stringify(data.measurements) : null
      }
    });

    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      role: row.role as 'CLIENT' | 'COUTURIER' | 'ADMIN',
      measurements: row.measurements ? JSON.parse(row.measurements) : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  public async updateMeasurements(userId: string, measurements: Record<string, unknown>): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        measurements: JSON.stringify(measurements)
      }
    });
  }
}
