import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../Auth.controller';
import { AuthService } from '../Auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    service = {
      register: jest.fn().mockResolvedValue({ message: 'User registered' }),
      login: jest.fn().mockResolvedValue({ access_token: 'token' }),
      forgetPassword: jest.fn().mockResolvedValue({ message: 'Code sent' }),
      resetPassword: jest
        .fn()
        .mockResolvedValue({ message: 'Password reset successfully' }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should register', async () => {
    const dto = { username: 'user', password: 'p', email: 'e' };
    const result = await controller.register(dto as any);
    expect(result.message).toBe('User registered');
    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('should login', async () => {
    const dto = { username: 'user', password: 'p' };
    const result = await controller.login(dto as any);
    expect(result.access_token).toBe('token');
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('should forget password', async () => {
    const dto = { email: 'e' };
    const result = await controller.forgetPassword(dto as any);
    expect(result.message).toBe('Code sent');
    expect(service.forgetPassword).toHaveBeenCalledWith(dto);
  });

  it('should reset password', async () => {
    const dto = { email: 'e', code: '123', newPassword: 'new' };
    const result = await controller.resetPassword(dto as any);
    expect(result.message).toBe('Password reset successfully');
    expect(service.resetPassword).toHaveBeenCalledWith(dto);
  });
});
