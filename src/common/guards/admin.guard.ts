import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    // تأكد أن الحقل هو role
    if (req.user?.role === 'admin') {
      return true;
    }
    throw new ForbiddenException('You are not admin');
  }
}
