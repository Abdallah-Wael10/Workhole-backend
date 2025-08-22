import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ username: 'user' }),
      findAll: jest.fn().mockResolvedValue([{ username: 'user' }]),
      findOne: jest.fn().mockResolvedValue({ username: 'user' }),
      update: jest.fn().mockResolvedValue({ username: 'updated' }),
      remove: jest
        .fn()
        .mockResolvedValue({ message: 'User deleted successfully' }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should create user', async () => {
    const dto = { username: 'user', email: 'e', password: 'pass' };
    const result = await controller.create(dto as any);
    expect(result.username).toBe('user');
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('should find all users', async () => {
    const result = await controller.findAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].username).toBe('user');
    expect(service.findAll).toHaveBeenCalled();
  });

  it('should find one user', async () => {
    const result = await controller.findOne('id');
    expect(result.username).toBe('user');
    expect(service.findOne).toHaveBeenCalledWith('id');
  });

  it('should update user', async () => {
    const dto = { username: 'updated' };
    const result = await controller.update('id', dto as any);
    expect(result.username).toBe('updated');
    expect(service.update).toHaveBeenCalledWith('id', dto);
  });

  it('should remove user', async () => {
    const result = await controller.remove('id');
    expect(result.message).toBe('User deleted successfully');
    expect(service.remove).toHaveBeenCalledWith('id');
  });
});
