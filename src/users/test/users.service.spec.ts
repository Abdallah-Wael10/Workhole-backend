import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../users.schema';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;

  beforeEach(async () => {
    userModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      findById: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn().mockReturnThis(),
      findByIdAndDelete: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should create user', async () => {
    userModel.create.mockResolvedValue({ username: 'user' });
    const dto = { username: 'user', email: 'e', password: 'pass' };
    const result = await service.create(dto as any);
    expect(result.username).toBe('user');
    expect(userModel.create).toHaveBeenCalledWith(dto);
  });

  it('should find all users', async () => {
    userModel.exec.mockResolvedValue([{ username: 'user' }]);
    const result = await service.findAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].username).toBe('user');
    expect(userModel.find).toHaveBeenCalled();
  });

  it('should find one user', async () => {
    userModel.exec.mockResolvedValue({ username: 'user' });
    userModel.findById.mockReturnThis();
    const result = await service.findOne('id');
    expect(result.username).toBe('user');
    expect(userModel.findById).toHaveBeenCalledWith('id');
  });

  it('should throw if user not found (findOne)', async () => {
    userModel.exec.mockResolvedValue(null);
    userModel.findById.mockReturnThis();
    await expect(service.findOne('id')).rejects.toThrow(NotFoundException);
  });

  it('should find by username', async () => {
    userModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ username: 'user' }),
    });
    const result = await service.findByUsername('user');
    expect(result).not.toBeNull();
    expect(result!.username).toBe('user');
    expect(userModel.findOne).toHaveBeenCalledWith({ username: 'user' });
  });

  it('should find admin', async () => {
    userModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ username: 'admin', role: 'admin' }),
    });
    const result = await service.findAdmin();
    expect(result).not.toBeNull();
    expect(result!.role).toBe('admin');
    expect(userModel.findOne).toHaveBeenCalledWith({ role: 'admin' });
  });

  it('should update user', async () => {
    userModel.exec.mockResolvedValue({ username: 'updated' });
    userModel.findByIdAndUpdate.mockReturnThis();
    const result = await service.update('id', { username: 'updated' } as any);
    expect(result.username).toBe('updated');
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'id',
      { username: 'updated' },
      { new: true },
    );
  });

  it('should throw if user not found (update)', async () => {
    userModel.exec.mockResolvedValue(null);
    userModel.findByIdAndUpdate.mockReturnThis();
    await expect(service.update('id', {} as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should remove user', async () => {
    userModel.exec.mockResolvedValue({ username: 'deleted' });
    userModel.findByIdAndDelete.mockReturnThis();
    const result = await service.remove('id');
    expect(result.message).toBe('User deleted successfully');
    expect(userModel.findByIdAndDelete).toHaveBeenCalledWith('id');
  });

  it('should throw if user not found (remove)', async () => {
    userModel.exec.mockResolvedValue(null);
    userModel.findByIdAndDelete.mockReturnThis();
    await expect(service.remove('id')).rejects.toThrow(NotFoundException);
  });
});
