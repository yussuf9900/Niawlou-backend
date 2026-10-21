import {
  ITailorRepository,
  TailorProfileData,
  ModelData
} from '../../core/ports/IUserRepository.js';
import { getPrismaClient } from './PrismaClientSingleton.js';

export class PrismaTailorRepository implements ITailorRepository {
  private prisma = getPrismaClient();

  public async findTailorById(id: string): Promise<TailorProfileData | null> {
    const row = await this.prisma.tailorProfile.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      atelierName: row.atelierName,
      location: row.location,
      address: row.address,
      specialties: row.specialties.split(',').map((s) => s.trim()),
      bio: row.bio,
      rating: row.rating,
      completedOrdersCount: row.completedOrdersCount,
      phone: row.phone,
      user: row.user
        ? {
            id: row.user.id,
            name: row.user.name,
            phone: row.user.phone,
            email: row.user.email,
            role: row.user.role as 'COUTURIER',
            createdAt: row.user.createdAt,
            updatedAt: row.user.updatedAt
          }
        : undefined
    };
  }

  public async findTailorByUserId(userId: string): Promise<TailorProfileData | null> {
    const row = await this.prisma.tailorProfile.findUnique({
      where: { userId },
      include: { user: true }
    });
    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      atelierName: row.atelierName,
      location: row.location,
      address: row.address,
      specialties: row.specialties.split(',').map((s) => s.trim()),
      bio: row.bio,
      rating: row.rating,
      completedOrdersCount: row.completedOrdersCount,
      phone: row.phone
    };
  }

  public async searchTailors(params: {
    location?: string;
    specialty?: string;
    limit?: number;
  }): Promise<TailorProfileData[]> {
    const where: Record<string, unknown> = {};
    if (params.location) {
      where.location = { contains: params.location };
    }
    if (params.specialty) {
      where.specialties = { contains: params.specialty };
    }

    const rows = await this.prisma.tailorProfile.findMany({
      where,
      take: params.limit || 20,
      orderBy: { rating: 'desc' }
    });

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      atelierName: r.atelierName,
      location: r.location,
      address: r.address,
      specialties: r.specialties.split(',').map((s) => s.trim()),
      bio: r.bio,
      rating: r.rating,
      completedOrdersCount: r.completedOrdersCount,
      phone: r.phone
    }));
  }

  public async findModels(params: {
    category?: string;
    tailorId?: string;
    limit?: number;
  }): Promise<ModelData[]> {
    const where: Record<string, unknown> = { isActive: true };
    if (params.category && params.category !== 'TOUT') {
      where.category = params.category;
    }
    if (params.tailorId) {
      where.tailorId = params.tailorId;
    }

    const rows = await this.prisma.model.findMany({
      where,
      take: params.limit || 30,
      orderBy: { createdAt: 'desc' }
    });

    return rows.map((r) => ({
      id: r.id,
      tailorId: r.tailorId,
      title: r.title,
      description: r.description,
      category: r.category as ModelData['category'],
      price: r.price,
      fabricOption: r.fabricOption as ModelData['fabricOption'],
      images: JSON.parse(r.images || '[]'),
      isActive: r.isActive,
      createdAt: r.createdAt
    }));
  }

  public async findModelById(id: string): Promise<ModelData | null> {
    const r = await this.prisma.model.findUnique({ where: { id } });
    if (!r) return null;
    return {
      id: r.id,
      tailorId: r.tailorId,
      title: r.title,
      description: r.description,
      category: r.category as ModelData['category'],
      price: r.price,
      fabricOption: r.fabricOption as ModelData['fabricOption'],
      images: JSON.parse(r.images || '[]'),
      isActive: r.isActive,
      createdAt: r.createdAt
    };
  }

  public async createModel(data: Omit<ModelData, 'id' | 'createdAt'>): Promise<ModelData> {
    const r = await this.prisma.model.create({
      data: {
        tailorId: data.tailorId,
        title: data.title,
        description: data.description,
        category: data.category,
        price: data.price,
        fabricOption: data.fabricOption,
        images: JSON.stringify(data.images),
        isActive: data.isActive
      }
    });

    return {
      id: r.id,
      tailorId: r.tailorId,
      title: r.title,
      description: r.description,
      category: r.category as ModelData['category'],
      price: r.price,
      fabricOption: r.fabricOption as ModelData['fabricOption'],
      images: JSON.parse(r.images || '[]'),
      isActive: r.isActive,
      createdAt: r.createdAt
    };
  }
}
