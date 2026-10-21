import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed des données NIAWLOU...');

  // Nettoyage préalable
  await prisma.dispute.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.model.deleteMany();
  await prisma.tailorProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('passer123', 10);

  // 1. Création d'une cliente démo (Awa Diop)
  const clientAwa = await prisma.user.create({
    data: {
      name: 'Awa Diop',
      phone: '+221771234542',
      email: 'awa.diop@example.sn',
      passwordHash,
      role: 'CLIENT',
      measurements: JSON.stringify({
        tourPoitrine: 92,
        tourTaille: 74,
        tourBassin: 102,
        longueurTotale: 145,
        carrureEpaule: 40,
        longueurManche: 58,
        tourCou: 36,
        notesParticulieres: 'Morphologie sablier, préfère une coupe légèrement cintrée'
      })
    }
  });

  // 2. Création d'un couturier démo (Maison Aïssatou)
  const tailorUser = await prisma.user.create({
    data: {
      name: 'Aïssatou Ba',
      phone: '+221775128942',
      email: 'aissatou.ba@example.sn',
      passwordHash,
      role: 'COUTURIER'
    }
  });

  // 3. Création d'un Administrateur démo (Mamadou Fall - ODC / Sonatel)
  const adminUser = await prisma.user.create({
    data: {
      name: 'Mamadou Fall',
      phone: '+221770000001',
      email: 'admin@niawlou.sn',
      passwordHash,
      role: 'ADMIN'
    }
  });

  const tailorProfile = await prisma.tailorProfile.create({
    data: {
      userId: tailorUser.id,
      atelierName: 'Maison Aïssatou',
      location: 'Sacré-Cœur 3, Dakar',
      address: 'Immeuble Horizon, Apt 4B, près Boulangerie Jaune',
      specialties: 'Bazin riche, Broderie perlée, Robes de cérémonie, Coupes modernes',
      bio: 'Atelier de création artisanale alliant tradition sénégalaise et lignes contemporaines. Plus de 12 ans de savoir-faire à Dakar.',
      rating: 4.8,
      completedOrdersCount: 124,
      phone: '+221775128942'
    }
  });

  // 3. Création des modèles au catalogue
  const modelRobeNala = await prisma.model.create({
    data: {
      tailorId: tailorProfile.id,
      title: 'Robe Nala en bazin',
      description: 'Bazin riche terracotta avec broderies et finitions dorées artisanales. Coupe sirène ajustée.',
      category: 'CEREMONIE',
      price: 35000,
      fabricOption: 'PROVIDED_BY_TAILOR',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80'
      ]),
      isActive: true
    }
  });

  const modelBoubou = await prisma.model.create({
    data: {
      tailorId: tailorProfile.id,
      title: 'Grand Boubou Royal 3 Pièces',
      description: 'Bazin getzner teinté artisanalement, broderie fil de soie sur col et plastron.',
      category: 'BOUBOU',
      price: 45000,
      fabricOption: 'PROVIDED_BY_TAILOR',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80'
      ]),
      isActive: true
    }
  });

  // 4. Création de la commande illustrée dans la maquette (Réf: NIA-0248)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 14);

  const orderNia0248 = await prisma.order.create({
    data: {
      orderReference: 'NIA-0248',
      clientId: clientAwa.id,
      tailorId: tailorUser.id,
      modelId: modelRobeNala.id,
      title: 'Robe Nala en bazin',
      description: 'Confection sur mesure pour cérémonie de mariage. Bazin terracotta.',
      clothingPrice: 35000,
      deliveryFee: 1500,
      totalAmount: 36500,
      advanceAmount: 15000,
      balanceAmount: 21500,
      deliveryMode: 'DOMICILE',
      deliveryAddress: 'Sacré-Cœur 3 (Immeuble Horizon, apt 4B), Dakar',
      deliveryStatus: 'A_DEFINIR',
      orderStatus: 'EN_CONFECTION',
      paymentStatus: 'ACOMPTE_CONFIRME',
      confectionStep: 'COUPE_ASSEMBLAGE', // Étape 2/4 (comme dans la maquette)
      measurementsSnapshot: clientAwa.measurements || '{}',
      targetDeliveryDate: targetDate,
      advancePaymentRef: 'OM-DEMO-0248-ADV',
      notes: 'Finitions dorées sur les manches et décolleté.'
    }
  });

  // Transaction d'acompte confirmée
  await prisma.paymentTransaction.create({
    data: {
      orderId: orderNia0248.id,
      transactionRef: 'OM-DEMO-0248-ADV',
      amount: 15000,
      type: 'ADVANCE',
      status: 'SUCCESS',
      paymentToken: 'OM-TOKEN-77123-0248-A',
      confirmedAt: new Date()
    }
  });

  console.log('✅ Base de données initialisée avec succès !');
  console.log(`👤 Client: Awa Diop (${clientAwa.phone})`);
  console.log(`✂️ Couturier: Maison Aïssatou (${tailorUser.phone})`);
  console.log(`🛡️ Admin: Mamadou Fall (${adminUser.phone})`);
  console.log(`👗 Modèle: ${modelRobeNala.title} (35 000 FCFA)`);
  console.log(`📦 Commande maquette: ${orderNia0248.orderReference} (Étape: ${orderNia0248.confectionStep})`);
}

main()
  .catch((e) => {
    console.error('Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
