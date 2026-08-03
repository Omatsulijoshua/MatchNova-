import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class UserStatusGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = (
      context.switchToHttp().getRequest as () => unknown
    )() as Record<string, unknown> & {
      user?: { id: string };
    };
    const user = request.user;

    if (user && user.id) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { status: true },
      });

      if (dbUser && dbUser.status === UserStatus.SUSPENDED) {
        throw new ForbiddenException('Your account has been suspended.');
      }
    }

    return true;
  }
}
