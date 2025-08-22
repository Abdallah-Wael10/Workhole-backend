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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    // Now req.user will have all fields from JWT strategy
    return req.user;
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
}
