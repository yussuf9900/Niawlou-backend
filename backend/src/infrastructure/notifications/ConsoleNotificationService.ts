import {
  INotificationService,
  NotificationMessage
} from '../../core/ports/INotificationService.js';

export class ConsoleNotificationService implements INotificationService {
  public async sendPush(message: NotificationMessage): Promise<void> {
    console.log(`\n🔔 [NOTIF MAX IT] Pour: ${message.recipientId}`);
    console.log(`   Titre: ${message.title}`);
    console.log(`   Message: ${message.body}`);
    if (message.data) {
      console.log(`   Data:`, JSON.stringify(message.data));
    }
  }

  public async sendSMS(phone: string, text: string): Promise<void> {
    console.log(`\n📱 [SMS ORANGE] À: ${phone} | Contenu: "${text}"`);
  }
}
