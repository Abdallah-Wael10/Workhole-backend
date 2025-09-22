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

    // Generate access token (48 hours)
    const accessTokenPayload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      type: 'access',
    };
    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: '48h',
    });

    // Generate refresh token (20 days)
    const refreshTokenPayload = {
      sub: user._id,
      email: user.email,
      type: 'refresh',
    };
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: '20d',
    });

    // Store refresh token in database
    const refreshTokenExpires = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 days
    await this.userModel.findByIdAndUpdate(user._id, {
      refreshToken,
      refreshTokenExpires,
    });

    // Send login notification
    await this.mailService.sendLoginMail(
      user.email,
      `${user.firstName} ${user.lastName}`,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
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

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if user exists and refresh token matches
      const user = await this.userModel.findOne({
        _id: payload.sub,
        refreshToken,
        refreshTokenExpires: { $gt: new Date() },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Generate new access token
      const accessTokenPayload = {
        sub: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        type: 'access',
      };
      const accessToken = this.jwtService.sign(accessTokenPayload, {
        expiresIn: '48h',
      });

      return {
        access_token: accessToken,
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
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    // Remove refresh token from database
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: null,
      refreshTokenExpires: null,
    });

    return { message: 'Logged out successfully' };
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
      { passwordHash: hash, refreshToken: null, refreshTokenExpires: null },
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
