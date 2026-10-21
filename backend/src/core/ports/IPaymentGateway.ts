import { Money } from '../domain/value-objects/Money.js';

export interface PaymentInitializationParams {
  orderId: string;
  orderReference: string;
  amount: Money;
  customerPhone: string;
  customerName: string;
  type: 'ADVANCE' | 'BALANCE';
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentInitializationResult {
  paymentToken: string;
  paymentUrl: string;
  qrCodeUrl?: string;
  transactionReference: string;
  expiresAt: Date;
}

export interface PaymentVerificationResult {
  transactionReference: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amount: Money;
  paidAt?: Date;
  rawResponse?: Record<string, unknown>;
}

export interface IPaymentGateway {
  initializePayment(params: PaymentInitializationParams): Promise<PaymentInitializationResult>;
  verifyPayment(transactionReference: string): Promise<PaymentVerificationResult>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
