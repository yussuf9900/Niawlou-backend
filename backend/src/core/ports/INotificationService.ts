export interface NotificationMessage {
  recipientId: string;
  recipientPhone?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface INotificationService {
  sendPush(message: NotificationMessage): Promise<void>;
  sendSMS(phone: string, text: string): Promise<void>;
}
