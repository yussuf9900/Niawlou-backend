import crypto from 'crypto';
import {
  IPaymentGateway,
  PaymentInitializationParams,
  PaymentInitializationResult,
  PaymentVerificationResult
} from '../../core/ports/IPaymentGateway.js';
import { Money } from '../../core/domain/value-objects/Money.js';
import { getPrismaClient } from '../database/PrismaClientSingleton.js';

export class OrangeMoneyGatewayAdapter implements IPaymentGateway {
  private prisma = getPrismaClient();
  private webhookSecret = process.env.ORANGE_MONEY_WEBHOOK_SECRET || 'om_webhook_signature_secret_key_sn';

  public async initializePayment(
    params: PaymentInitializationParams
  ): Promise<PaymentInitializationResult> {
    const timestamp = Date.now();
    const suffix = params.type === 'ADVANCE' ? 'ADV' : 'BAL';
    const transactionReference = `OM-${params.orderReference}-${suffix}-${timestamp.toString().slice(-4)}`;
    const paymentToken = `OM-TOKEN-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // Date d'expiration du token (15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Enregistrement de la transaction en PENDING
    await this.prisma.paymentTransaction.create({
      data: {
        orderId: params.orderId,
        transactionRef: transactionReference,
        amount: params.amount.amount,
        type: params.type,
        status: 'PENDING',
        paymentToken
      }
    });

    // Deep link Max It et URL de redirection de paiement web
    const paymentUrl = `https://api.orange.sn/om/pay?token=${paymentToken}&ref=${transactionReference}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      paymentUrl
    )}`;

    return {
      paymentToken,
      paymentUrl,
      qrCodeUrl,
      transactionReference,
      expiresAt
    };
  }

  public async verifyPayment(transactionReference: string): Promise<PaymentVerificationResult> {
    const tx = await this.prisma.paymentTransaction.findUnique({
      where: { transactionRef: transactionReference }
    });

    if (!tx) {
      return {
        transactionReference,
        status: 'FAILED',
        amount: Money.zero()
      };
    }

    return {
      transactionReference,
      status: tx.status as 'SUCCESS' | 'FAILED' | 'PENDING',
      amount: Money.from(tx.amount),
      paidAt: tx.confirmedAt || undefined,
      rawResponse: {
        token: tx.paymentToken,
        type: tx.type,
        confirmedAt: tx.confirmedAt
      }
    };
  }

  public verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature) return false;
    const computed = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  }

  /**
   * Méthode utilitaire de simulation pour le hackathon / démo jury
   * Permet de simuler la validation instantanée par Orange Money
   */
  public async simulateSuccess(transactionReference: string): Promise<boolean> {
    const tx = await this.prisma.paymentTransaction.findUnique({
      where: { transactionRef: transactionReference }
    });
    if (!tx) return false;

    await this.prisma.paymentTransaction.update({
      where: { transactionRef: transactionReference },
      data: {
        status: 'SUCCESS',
        confirmedAt: new Date()
      }
    });

    return true;
  }
}
