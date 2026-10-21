export interface UserData {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'CLIENT' | 'COUTURIER' | 'ADMIN';
  measurements?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserRepository {
  findById(id: string): Promise<UserData | null>;
  findByPhone(phone: string): Promise<(UserData & { passwordHash: string }) | null>;
  findByEmail(email: string): Promise<(UserData & { passwordHash: string }) | null>;
  create(data: Omit<UserData, 'createdAt' | 'updatedAt'> & { passwordHash: string }): Promise<UserData>;
  updateMeasurements(userId: string, measurements: Record<string, unknown>): Promise<void>;
}

export interface TailorProfileData {
  id: string;
  userId: string;
  atelierName: string;
  location: string;
  address: string;
  specialties: string[];
  bio: string;
  rating: number;
  completedOrdersCount: number;
  phone: string;
  user?: UserData;
}

export interface ModelData {
  id: string;
  tailorId: string;
  title: string;
  description: string;
  category: 'FEMME' | 'HOMME' | 'CEREMONIE' | 'BOUBOU' | 'ENFANT';
  price: number;
  fabricOption: 'PROVIDED_BY_CLIENT' | 'PROVIDED_BY_TAILOR' | 'CHOICE_AT_ATELIER';
  images: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface ITailorRepository {
  findTailorById(id: string): Promise<TailorProfileData | null>;
  findTailorByUserId(userId: string): Promise<TailorProfileData | null>;
  searchTailors(params: { location?: string; specialty?: string; limit?: number }): Promise<TailorProfileData[]>;
  findModels(params: { category?: string; tailorId?: string; limit?: number }): Promise<ModelData[]>;
  findModelById(id: string): Promise<ModelData | null>;
  createModel(data: Omit<ModelData, 'id' | 'createdAt'>): Promise<ModelData>;
}
