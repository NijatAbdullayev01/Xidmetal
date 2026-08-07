import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

/**
 * Cloudflare Turnstile — secret yoxdursa skip (dev / mövcud deploy).
 * Secret setdirsə token məcburidir və siteverify keçməlidir.
 */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(private config: ConfigService) {}

  private secret(): string | null {
    return this.config.get<string>('TURNSTILE_SECRET_KEY')?.trim() || null;
  }

  isEnabled(): boolean {
    return Boolean(this.secret());
  }

  async assertValid(token: string | undefined | null, remoteIp?: string): Promise<void> {
    const secret = this.secret();
    if (!secret) {
      return;
    }

    const trimmed = token?.trim();
    if (!trimmed) {
      throw new BadRequestException('Təhlükəsizlik yoxlaması tələb olunur');
    }

    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', trimmed);
    if (remoteIp) body.set('remoteip', remoteIp);

    let data: TurnstileVerifyResponse;
    try {
      const res = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        },
      );
      data = (await res.json()) as TurnstileVerifyResponse;
    } catch (err) {
      this.logger.warn(
        `Turnstile verify network error: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException('Təhlükəsizlik yoxlaması uğursuz oldu');
    }

    if (!data.success) {
      this.logger.debug(
        `Turnstile rejected: ${(data['error-codes'] ?? []).join(',') || 'unknown'}`,
      );
      throw new BadRequestException('Təhlükəsizlik yoxlaması uğursuz oldu');
    }
  }
}
