import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Epoint.az (Azərbaycan) ödəniş qapısı adapteri.
 *
 * Kontrakt (developer.epoint.az):
 *  - Auth: `data = base64(JSON(payload))`, `signature = base64(sha1(private_key + data + private_key))`.
 *  - Sorğu: form-urlencoded `{ data, signature }` → POST.
 *  - Cavab/callback: JSON; callback bəzən form-encoded, bəzən JSON gəlir (hər ikisi işlənir).
 *  - Callback imzası timing-safe yoxlanılır; `order_id` idempotency açarıdır.
 *
 * PCI (SAQ-A): kart məlumatı (PAN/CVV/expiry) bizim serverə heç vaxt gəlmir —
 * istifadəçi kartı Epoint-in host səhifəsində daxil edir, bizə yalnız `card_id`
 * (token) + `card_mask` (maskalı nömrə) qayıdır.
 */

export interface EpointCardRegistrationResult {
  redirectUrl: string | null;
  /** Sinxron (simulyasiya / cardsız) qeydiyyatda artıq kart token-i */
  cardId?: string | null;
}

export interface EpointPayResult {
  /** 3DS redirect varsa bu URL açılır */
  redirectUrl: string | null;
  /** Sinxron nəticə (redirect yoxdursa) */
  status?: string | null;
  transaction?: string | null;
}

export interface EpointCallbackPayload {
  status?: string | null;
  orderId?: string | null;
  transaction?: string | null;
  amount?: string | number | null;
  cardId?: string | null;
  cardMask?: string | null;
  code?: string | null;
  message?: string | null;
  [key: string]: unknown;
}

const DEFAULT_BASE_URL = 'https://epoint.az/api/1';

@Injectable()
export class EpointService {
  private readonly logger = new Logger(EpointService.name);
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly paths: {
    request: string;
    cardRegistrationWithPay: string;
    executePay: string;
    status: string;
    reverse: string;
  };

  constructor(config: ConfigService) {
    this.baseUrl = (
      config.get<string>('EPOINT_BASE_URL')?.trim() || DEFAULT_BASE_URL
    ).replace(/\/+$/, '');
    this.publicKey = config.get<string>('EPOINT_PUBLIC_KEY')?.trim() ?? '';
    this.privateKey = config.get<string>('EPOINT_PRIVATE_KEY')?.trim() ?? '';
    this.paths = {
      request: config.get<string>('EPOINT_REQUEST_PATH')?.trim() || '/request',
      cardRegistrationWithPay:
        config.get<string>('EPOINT_CARD_REGISTRATION_PATH')?.trim() ||
        '/card-registration-with-pay',
      executePay:
        config.get<string>('EPOINT_EXECUTE_PAY_PATH')?.trim() || '/execute-pay',
      status: config.get<string>('EPOINT_STATUS_PATH')?.trim() || '/get-status',
      reverse: config.get<string>('EPOINT_REVERSE_PATH')?.trim() || '/reverse',
    };
  }

  isConfigured(): boolean {
    return Boolean(this.publicKey && this.privateKey);
  }

  private encodeData(payload: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  }

  private sign(data: string): string {
    return createHash('sha1')
      .update(`${this.privateKey}${data}${this.privateKey}`, 'utf8')
      .digest('base64');
  }

  /** Timing-safe callback imza yoxlaması — yan kanal (timing) sızıntısına qarşı. */
  verifySignature(data: string, signature: string): boolean {
    if (!this.isConfigured()) return false;
    const expected = this.sign(data);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  decodeData(data: string): EpointCallbackPayload {
    try {
      const parsed: unknown = JSON.parse(
        Buffer.from(data, 'base64').toString('utf8'),
      );
      return (parsed && typeof parsed === 'object'
        ? parsed
        : {}) as EpointCallbackPayload;
    } catch {
      return {};
    }
  }

  private async post(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const data = this.encodeData({ public_key: this.publicKey, ...payload });
    const signature = this.sign(data);
    const body = new URLSearchParams({ data, signature }).toString();
    const url = `${this.baseUrl}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (error) {
      throw new Error(
        `Epoint ilə əlaqə qurula bilmədi: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const text = await response.text();
    this.logger.debug(`[epoint] POST ${path} -> HTTP ${response.status}`);
    try {
      const parsed: unknown = JSON.parse(text);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      // Epoint bəzən JSON olmayan (HTML) cavab qaytarır
      return { status: 'error', message: text.slice(0, 200) };
    }
  }

  private firstString(
    obj: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === 'string' && value.length > 0) return value;
    }
    return null;
  }

  /**
   * Kart qeydiyyatı — kiçik doğrulama ödənişi (0.01 AZN) ilə `card-registration-with-pay`.
   * `save_card` callback-də `order_id` göndərmir; `-with-pay` isə order_id + card_id
   * qaytarır — ona görə order_id əsaslı idempotent map üçün bu metod seçilir.
   */
  async startCardRegistration(input: {
    orderId: string;
    amount: number;
    description: string;
    language?: string;
    successUrl: string;
    errorUrl: string;
    resultUrl: string;
  }): Promise<EpointCardRegistrationResult> {
    const response = await this.post(this.paths.cardRegistrationWithPay, {
      amount: input.amount.toFixed(2),
      currency: 'AZN',
      order_id: input.orderId,
      description: input.description,
      ...(input.language ? { language: input.language } : {}),
      success_redirect_url: input.successUrl,
      error_redirect_url: input.errorUrl,
      result_url: input.resultUrl,
    });

    const redirectUrl = this.firstString(response, [
      'redirect_url',
      'redirectUrl',
      'url',
    ]);
    const cardId = this.firstString(response, ['card_id', 'cardId']);

    if (redirectUrl) return { redirectUrl };
    if (cardId) return { redirectUrl: null, cardId };
    throw new Error(
      this.firstString(response, ['message', 'error']) ??
        'Epoint kart qeydiyyatı uğursuz oldu',
    );
  }

  /** Saxlanmış kart ilə ödəniş (top-up). 3DS olarsa redirect qayıdır. */
  async payWithSavedCard(input: {
    amount: number;
    orderId: string;
    cardId: string;
    description?: string;
  }): Promise<EpointPayResult> {
    const response = await this.post(this.paths.executePay, {
      amount: input.amount.toFixed(2),
      currency: 'AZN',
      order_id: input.orderId,
      card_id: input.cardId,
      ...(input.description ? { description: input.description } : {}),
    });

    const redirectUrl = this.firstString(response, [
      'redirect_url',
      'redirectUrl',
      'url',
    ]);
    const status = this.firstString(response, ['status']);
    const transaction = this.firstString(response, [
      'transaction',
      'transaction_id',
      'transactionId',
    ]);

    if (redirectUrl) return { redirectUrl, status, transaction };
    if (status) return { redirectUrl: null, status, transaction };
    throw new Error(
      this.firstString(response, ['message', 'error']) ??
        'Epoint ödənişi uğursuz oldu',
    );
  }

  /** Kart maskasından (məs. "123456******1234") last4 + brand çıxarır. */
  static parseCardMask(
    mask: string | null | undefined,
  ): { last4: string; brand: string | null } {
    const digits = (mask ?? '').replace(/\D/g, '');
    const last4 = digits.slice(-4).padStart(4, '0') || '****';
    const first = digits.slice(0, 1);
    const brand =
      first === '4' ? 'visa' : first === '5' || first === '2' ? 'mastercard' : null;
    return { last4, brand };
  }
}
