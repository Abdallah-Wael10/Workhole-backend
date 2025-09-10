import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './Auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { profileImageMulterConfig } from '../middleware/multer-config.middleware';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { User } from '../users/users.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('profileImage', profileImageMulterConfig))
  register(
    @Body() dto: RegisterDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // ابعت الصورة مع باقي البيانات للـ service
    return this.authService.register(dto, file);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forget-password')
  forgetPassword(@Body() dto: ForgetPasswordDto) {
    return this.authService.forgetPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req) {
    const userDoc = await this.userModel.findById(req.user.id || req.user.sub).select('-passwordHash');
    if (!userDoc) return null;
    const user = userDoc.toObject() as any;
    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      shiftHours: user.shiftHours,
      locale: user.locale,
      isActive: user.isActive,
      availableLeaves: user.availableLeaves,
      profileImage: user.profileImage,
      status: user.status,
      salary: user.salary,
      shiftStartLocal: user.shiftStartLocal,
      phone: user.phone,
      holidays: user.holidays,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('upload-profile')
  @UseInterceptors(FileInterceptor('profileImage', profileImageMulterConfig))
  async uploadProfile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.authService.updateProfileImage(req.user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update-profile')
  @UseInterceptors(FileInterceptor('profileImage', profileImageMulterConfig))
  async updateProfile(
    @Body() dto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.authService.updateProfileData(req.user.id, dto, file);
  }
}
