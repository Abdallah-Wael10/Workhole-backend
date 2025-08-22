import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../Auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../mail/mail.service';
import { User } from '../../users/users.schema';
import { PasswordReset } from '../password-reset.schema';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let passwordResetModel: any;
  let jwtService: any;
  let mailService: any;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };
    passwordResetModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('token') };
    mailService = {
      sendLoginMail: jest.fn(),
      sendResetPasswordMail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: getModelToken(PasswordReset.name),
          useValue: passwordResetModel,
        },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should register user', async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({
      username: 'user',
      email: 'e',
      role: 'User',
    });
    (jest.spyOn(bcrypt, 'hash') as any).mockResolvedValue('hashed');
    const dto = { username: 'user', email: 'e', password: 'p' };
    const result = await service.register(dto as any);
    expect(result.message).toBe('User registered');
    expect(userModel.create).toHaveBeenCalled();
  });

  it('should not register if username exists', async () => {
    userModel.findOne.mockResolvedValue({ username: 'user' });
    await expect(
      service.register({ username: 'user', password: 'p', email: 'e' } as any),
    ).rejects.toThrow('Username already exists');
  });

  it('should login user', async () => {
    userModel.findOne.mockResolvedValue({
      username: 'user',
      password: 'hashed',
      email: 'e',
      role: 'User',
      _id: 'id',
    });
    (jest.spyOn(bcrypt, 'compare') as any).mockResolvedValue(true);
    const dto = { username: 'user', password: 'p' };
    const result = await service.login(dto as any);
    expect(result.access_token).toBe('token');
    expect(mailService.sendLoginMail).toHaveBeenCalled();
  });

  it('should not login with wrong username', async () => {
    userModel.findOne.mockResolvedValue(null);
    await expect(
      service.login({ username: 'user', password: 'p' } as any),
    ).rejects.toThrow('Invalid credentials');
  });

  it('should not login with wrong password', async () => {
    userModel.findOne.mockResolvedValue({
      username: 'user',
      password: 'hashed',
      email: 'e',
      role: 'User',
      _id: 'id',
    });
    (jest.spyOn(bcrypt, 'compare') as any).mockResolvedValue(false);
    await expect(
      service.login({ username: 'user', password: 'wrong' } as any),
    ).rejects.toThrow('Invalid credentials');
  });

  it('should send forget password code', async () => {
    userModel.findOne.mockResolvedValue({ email: 'e' });
    passwordResetModel.create.mockResolvedValue({});
    mailService.sendResetPasswordMail.mockResolvedValue({});
    const dto = { email: 'e' };
    const result = await service.forgetPassword(dto as any);
    expect(result.message).toBeDefined();
    expect(passwordResetModel.create).toHaveBeenCalled();
    expect(mailService.sendResetPasswordMail).toHaveBeenCalled();
  });

  it('should not send code if email not found', async () => {
    userModel.findOne.mockResolvedValue(null);
    const dto = { email: 'notfound' };
    const result = await service.forgetPassword(dto as any);
    expect(result.message).toBeDefined();
  });

  it('should reset password', async () => {
    passwordResetModel.findOne.mockResolvedValue({
      email: 'e',
      code: '123',
      expiresAt: new Date(Date.now() + 10000),
    });
    (jest.spyOn(bcrypt, 'hash') as any).mockResolvedValue('hashed');
    passwordResetModel.deleteOne.mockResolvedValue({});
    userModel.updateOne.mockResolvedValue({});
    const dto = { email: 'e', code: '123', newPassword: 'new' };
    const result = await service.resetPassword(dto as any);
    expect(result.message).toBe('Password reset successfully');
    expect(userModel.updateOne).toHaveBeenCalled();
    expect(passwordResetModel.deleteOne).toHaveBeenCalled();
  });

  it('should not reset password if code invalid', async () => {
    passwordResetModel.findOne.mockResolvedValue(null);
    await expect(
      service.resetPassword({
        email: 'e',
        code: 'bad',
        newPassword: 'new',
      } as any),
    ).rejects.toThrow('Invalid or expired code');
  });
});
