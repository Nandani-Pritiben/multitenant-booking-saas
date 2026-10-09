import { Module } from '@nestjs/common';
import { EmailService } from './email.service.js';
import { EmailTemplatesService } from './email-templates.service.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  providers: [EmailService, EmailTemplatesService, NotificationsService],
  exports:   [NotificationsService],
})
export class NotificationsModule {}
