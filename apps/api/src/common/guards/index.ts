import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, REQUIRE_EMAIL_VERIFIED_KEY, ROLES_KEY } from '../decorators';
import { UserRole } from '@xidmetal/shared';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(@Inject(Reflector) private reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;
    return super.canActivate(context);
  }

  override handleRequest<T>(err: Error | null, user: T): T {
    if (err || !user) {
      throw err || new UnauthorizedException('Autentifikasiya tələb olunur');
    }
    return user;
  }
}

/**
 * JWT olsa istifadəçini `request.user`-ə əlavə edir, olmasa və ya etibarsız
 * olsa belə sorğunu rədd etmir (asılı endpoint özü icazəni yoxlayır).
 * Məs: `GET /services/:id` — həm qonaqlar, həm də sahibi/admin üçün açıqdır.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<T>(_err: unknown, user: T | false): T | null {
    return (user || null) as T | null;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Bu əməliyyat üçün icazəniz yoxdur');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('Bu əməliyyat üçün icazəniz yoxdur');
    }

    return true;
  }
}

/**
 * Marketplace yazma əməliyyatları üçün e-poçt təsdiqi.
 * Login soft qalır; sifariş/mesaj/rəy/upload/xidmət yaratma təsdiq tələb edir.
 * ADMIN bypass.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_EMAIL_VERIFIED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const { user } = context.switchToHttp().getRequest<{
      user?: { role?: string; isVerified?: boolean };
    }>();

    if (!user) {
      throw new ForbiddenException('Bu əməliyyat üçün icazəniz yoxdur');
    }

    if (user.role === UserRole.ADMIN) return true;

    if (!user.isVerified) {
      throw new ForbiddenException(
        'Bu əməliyyat üçün e-poçt ünvanınızı təsdiqləyin',
      );
    }

    return true;
  }
}
