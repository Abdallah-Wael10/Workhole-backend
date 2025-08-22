import { MailService } from '../mail.service';
import { ConfigService } from '@nestjs/config';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));
jest.mock('ejs', () => ({
  renderFile: jest.fn().mockResolvedValue('<html>Mocked HTML</html>'),
}));

describe('MailService', () => {
  let service: MailService;
  let configService: ConfigService;
  let transporter: any;

  beforeEach(() => {
    configService = {
      get: jest.fn((key) => {
        if (key === 'EMAIL_USER') return 'test@email.com';
        if (key === 'EMAIL_PASS') return 'testpass';
        return null;
      }),
    } as any;
    service = new MailService(configService);
    transporter = (service as any).transporter;
  });

  it('should send contact lead mail', async () => {
    await service.sendContactLeadMail('to@email.com', 'user', {
      fullName: 'User',
      email: 'to@email.com',
      phone: '123',
      comment: 'Hello',
    });
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'to@email.com',
        subject: expect.stringContaining('New Contact Lead'),
        html: '<html>Mocked HTML</html>',
      }),
    );
  });

  it('should send login mail', async () => {
    await service.sendLoginMail('to@email.com', 'user');
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'to@email.com',
        subject: 'Login Notification',
        html: '<html>Mocked HTML</html>',
      }),
    );
  });

  it('should send reset password mail', async () => {
    await service.sendResetPasswordMail('to@email.com', 'token');
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'to@email.com',
        subject: 'Password Reset Code',
        html: '<html>Mocked HTML</html>',
      }),
    );
  });

  it('should handle error in sendMail', async () => {
    (transporter.sendMail as jest.Mock).mockRejectedValueOnce(
      new Error('fail'),
    );
    await expect(service.sendLoginMail('to@email.com', 'user')).rejects.toThrow(
      'fail',
    );
  });

  it('should handle error in ejs renderFile', async () => {
    const oldRender = require('ejs').renderFile;
    (require('ejs').renderFile as jest.Mock).mockRejectedValueOnce(
      new Error('ejs error'),
    );
    await expect(service.sendLoginMail('to@email.com', 'user')).rejects.toThrow(
      'ejs error',
    );
    (require('ejs').renderFile as jest.Mock).mockResolvedValue(
      '<html>Mocked HTML</html>',
    );
  });
});
