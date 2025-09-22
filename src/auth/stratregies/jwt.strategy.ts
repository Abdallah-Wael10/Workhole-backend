import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../users/users.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  async validate(payload: any) {
    // Only allow access tokens
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userModel
      .findById(payload.sub)
      .select('-passwordHash');
    if (!user) {
      throw new UnauthorizedException();
    }

    // Return ALL user fields (including new ones)
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      shiftHours: user.shiftHours,
      shiftStartLocal: user.shiftStartLocal,
      locale: user.locale,
      isActive: user.isActive,
      salary: user.salary,
      phone: user.phone,
      status: user.status,
      availableLeaves: user.availableLeaves, // Add this
      profileImage: user.profileImage, // Add this
    };
  }
}
