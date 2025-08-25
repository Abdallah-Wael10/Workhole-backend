import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/users.schema';
import { MailService } from '../mail/mail.service';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordReset } from './password-reset.schema';
import { UpdateUserDto } from '../users/dto/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(PasswordReset.name)
    private passwordResetModel: Model<PasswordReset>,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto, file?: Express.Multer.File) {
    const exists = await this.userModel.findOne({ email: dto.email });
    if (exists) throw new ConflictException('Email already exists');

    const hash = await bcrypt.hash(dto.password, 10);

    // لو فيه صورة ابعتها، لو مفيش استخدم الافتراضية
    const profileImage =
      file && file.filename
        ? `/images/profileImages/${file.filename}`
        : (dto.profileImage ?? '/images/profileImages/profile.svg');

    const user = await this.userModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash: hash,
      role: dto.role,
      shiftHours: dto.shiftHours ?? 8,
      shiftStartLocal: dto.shiftStartLocal ?? '09:00',
      locale: dto.locale ?? 'en',
      isActive: dto.isActive ?? true,
      availableLeaves: dto.availableLeaves ?? 21,
      profileImage,
    });

    return {
      message: 'User registered successfully',
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        shiftHours: user.shiftHours,
        locale: user.locale,
        isActive: user.isActive,
        availableLeaves: user.availableLeaves,
        profileImage: user.profileImage,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive)
      throw new UnauthorizedException('Account is not active');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    const token = this.jwtService.sign(payload);

    // Send login notification
    await this.mailService.sendLoginMail(
      user.email,
      `${user.firstName} ${user.lastName}`,
    );

    return {
      access_token: token,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        shiftHours: user.shiftHours,
        locale: user.locale,
        isActive: user.isActive,
        availableLeaves: user.availableLeaves,
        profileImage: user.profileImage,
      },
    };
  }

  async forgetPassword(dto: ForgetPasswordDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) return { message: 'If this email exists, a code will be sent.' };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.passwordResetModel.create({ email: dto.email, code, expiresAt });
    await this.mailService.sendResetPasswordMail(dto.email, code);

    return { message: 'If this email exists, a code will be sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const reset = await this.passwordResetModel.findOne({
      email: dto.email,
      code: dto.code,
      expiresAt: { $gt: new Date() },
    });
    if (!reset) throw new UnauthorizedException('Invalid or expired code');

    const hash = await bcrypt.hash(dto.newPassword, 10);
    await this.userModel.updateOne(
      { email: dto.email },
      { passwordHash: hash },
    );
    await this.passwordResetModel.deleteOne({
      email: dto.email,
      code: dto.code,
    });

    return { message: 'Password reset successfully' };
  }

  // Fixed method for updating profile image
  async updateProfileImage(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const imageUrl = `/images/profileImages/${file.filename}`;

    const user = await this.userModel
      .findByIdAndUpdate(userId, { profileImage: imageUrl }, { new: true })
      .select('-passwordHash');

    if (!user) {
      throw new Error('User not found');
    }

    return {
      message: 'Profile image updated successfully',
      profileImage: user.profileImage,
    };
  }

  async updateProfileData(
    userId: string,
    dto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const update: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    };

    if (file && file.filename) {
      update.profileImage = `/images/profileImages/${file.filename}`;
    }

    const user = await this.userModel
      .findByIdAndUpdate(userId, update, { new: true })
      .select('-passwordHash');

    if (!user) throw new Error('User not found');

    return {
      message: 'Profile updated successfully',
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        profileImage: user.profileImage,
        email: user.email,
        role: user.role,
        shiftHours: user.shiftHours,
        locale: user.locale,
        isActive: user.isActive,
        availableLeaves: user.availableLeaves,
        status: user.status,
        salary: user.salary,
        shiftStartLocal: user.shiftStartLocal,
      },
    };
  }
}
