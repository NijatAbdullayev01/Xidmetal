import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  NotificationType,
  Prisma,
  ProviderPaymentOrderStatus,
  ProviderPaymentOrderType,
  ServiceStatus,
  UserRole,
  WalletTransactionType,
} from '@xidmetal/database';
import {
  COMMISSION,
  ProviderSuspensionReason,
  addAzBusinessDays,
  type AdminCommissionSummary,
  type PaginatedResponse,
  type ProviderCardSummary,
  type ProviderWalletSummary,
  type WalletTransactionSummary,
} from '@xidmetal/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationChannelsService } from '../../common/notifications/notification-channels.service';
import {
  decryptField,
  encryptField,
  hashField,
  resolveEncryptionKey,
} from '../../common/crypto/field-encryption';
import {
  assertIdempotencyPayloadCompatible,
  hashIdempotencyPayload,
  normalizeIdempotencyKey,
} from '../../common/idempotency/idempotency.helpers';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { EpointService } from './epoint.service';
import type { InitiateDepositDto } from './dto';

const DEBT_TOLERANCE = 0.005;

function debtFromBalance(balance: Prisma.Decimal): number {
  const value = balance.toNumber();
  return value < 0 ? Math.abs(value) : 0;
}

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private epoint: EpointService,
    private idempotency: IdempotencyService,
    @Optional() private channels?: NotificationChannelsService,
  ) {}

  private get encryptionKey(): Buffer {
    const secret =
      this.config.get<string>('CARD_ENCRYPTION_KEY')?.trim() ||
      this.config.get<string>('JWT_SECRET')?.trim() ||
      '';
    return resolveEncryptionKey(secret);
  }

  // ────────────────────────────────────────────────────────────────
  // Cüzdan / hesab
  // ────────────────────────────────────────────────────────────────

  private async generateUniqueAccountNumber(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const digits = Array.from({ length: COMMISSION.ACCOUNT_NUMBER_DIGITS }, () =>
        Math.floor(Math.random() * 10),
      ).join('');
      const accountNumber = `${COMMISSION.ACCOUNT_NUMBER_PREFIX}${digits}`;
      const existing = await this.prisma.providerWallet.findUnique({
        where: { accountNumber },
        select: { id: true },
      });
      if (!existing) return accountNumber;
    }
    throw new Error('Hesab nömrəsi yaradıla bilmədi');
  }

  async ensureWallet(providerId: string) {
    const existing = await this.prisma.providerWallet.findUnique({
      where: { providerId },
    });
    if (existing) return existing;

    return this.prisma.providerWallet.upsert({
      where: { providerId },
      create: {
        providerId,
        accountNumber: await this.generateUniqueAccountNumber(),
      },
      update: {},
    });
  }

  private async requireProvider(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== UserRole.PROVIDER) {
      throw new BadRequestException('Bu əməliyyat yalnız xidmət verənlər üçündür');
    }
    return user;
  }

  private mapWallet(wallet: {
    id: string;
    providerId: string;
    accountNumber: string;
    balance: Prisma.Decimal;
    debtDueAt: Date | null;
    suspendedAt: Date | null;
    suspendedReason: string | null;
    createdAt: Date;
  }): ProviderWalletSummary {
    const balance = wallet.balance.toNumber();
    return {
      id: wallet.id,
      providerId: wallet.providerId,
      accountNumber: wallet.accountNumber,
      balance,
      debt: debtFromBalance(wallet.balance),
      currency: 'AZN',
      debtDueAt: wallet.debtDueAt?.toISOString() ?? null,
      suspended: wallet.suspendedAt != null,
      suspendedAt: wallet.suspendedAt?.toISOString() ?? null,
      suspendedReason: wallet.suspendedReason ?? null,
      createdAt: wallet.createdAt.toISOString(),
    };
  }

  async getAccount(userId: string): Promise<ProviderWalletSummary> {
    await this.requireProvider(userId);
    const wallet = await this.ensureWallet(userId);
    return this.mapWallet(wallet);
  }

  // ────────────────────────────────────────────────────────────────
  // Ledger (balans yenilənməsi — FOR UPDATE lock ilə)
  // ────────────────────────────────────────────────────────────────

  private async applyLedgerEntry(input: {
    providerId: string;
    type: WalletTransactionType;
    amount: number;
    referenceId?: string | null;
    description?: string | null;
    meta?: Prisma.InputJsonValue;
  }): Promise<{
    walletId: string;
    balanceAfter: number;
    previousBalance: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await this.ensureWalletTx(tx, input.providerId);
      // Sətir kilidi — paralel mədaxil/məxaric lost-update qarşısı
      await tx.$queryRaw`SELECT id FROM provider_wallets WHERE id = ${wallet.id} FOR UPDATE`;

      const current = await tx.providerWallet.findUniqueOrThrow({
        where: { id: wallet.id },
      });
      const delta = new Prisma.Decimal(input.amount);
      const next = current.balance.plus(delta);

      await tx.providerWallet.update({
        where: { id: wallet.id },
        data: { balance: next },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: input.type,
          amount: delta,
          balanceAfter: next,
          referenceId: input.referenceId ?? null,
          description: input.description ?? null,
          meta: input.meta,
        },
      });

      return {
        walletId: wallet.id,
        balanceAfter: next.toNumber(),
        previousBalance: current.balance.toNumber(),
      };
    });
  }

  private async ensureWalletTx(
    tx: Prisma.TransactionClient,
    providerId: string,
  ) {
    const existing = await tx.providerWallet.findUnique({ where: { providerId } });
    if (existing) return existing;
    return tx.providerWallet.create({
      data: {
        providerId,
        accountNumber: await this.generateUniqueAccountNumber(),
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Komissiya hesablanması (booking COMPLETED)
  // ────────────────────────────────────────────────────────────────

  async onBookingCompleted(
    providerId: string,
    bookingId: string,
    totalPrice: number,
  ): Promise<void> {
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) return;

    // İkiqat yazılmanın qarşısı — eyni booking üçün yalnız bir komissiya
    const duplicate = await this.prisma.walletTransaction.findFirst({
      where: {
        type: WalletTransactionType.COMMISSION,
        referenceId: bookingId,
      },
      select: { id: true },
    });
    if (duplicate) return;

    const commission = Number((totalPrice * COMMISSION.RATE).toFixed(2));
    if (commission <= 0) return;

    await this.applyLedgerEntry({
      providerId,
      type: WalletTransactionType.COMMISSION,
      amount: -commission,
      referenceId: bookingId,
      description: `Sifariş üzrə 15% komissiya`,
      meta: { bookingId, totalPrice },
    });

    await this.applyDebtThreshold(providerId);
  }

  private async applyDebtThreshold(providerId: string): Promise<void> {
    const wallet = await this.prisma.providerWallet.findUnique({
      where: { providerId },
    });
    if (!wallet) return;

    const debt = debtFromBalance(wallet.balance);
    const now = new Date();

    if (debt >= COMMISSION.DEBT_THRESHOLD_AZN) {
      if (!wallet.debtDueAt) {
        const debtDueAt = addAzBusinessDays(
          now,
          COMMISSION.DEBT_GRACE_BUSINESS_DAYS,
        );
        await this.prisma.providerWallet.update({
          where: { providerId },
          data: { debtDueAt, debtNotifiedAt: now },
        });
        this.notify(
          providerId,
          NotificationType.COMMISSION_DEBT_DUE,
          'Borcunuz 10 AZN-ə çatdı',
          `${debt.toFixed(2)} AZN borcunuz var. 1 iş günü ərzində ödəməsəniz hesabınız bağlanacaq.`,
          { href: '/dashboard/provider/billing', debt, debtDueAt: debtDueAt.toISOString() },
        );
      }
    } else if (wallet.debtDueAt) {
      // Borc limitdən aşağı düşdü — müddəti təmizlə
      await this.prisma.providerWallet.update({
        where: { providerId },
        data: { debtDueAt: null, debtNotifiedAt: null },
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Kartlar (tokenizasiya)
  // ────────────────────────────────────────────────────────────────

  async listCards(userId: string): Promise<ProviderCardSummary[]> {
    await this.requireProvider(userId);
    const cards = await this.prisma.providerCard.findMany({
      where: { providerId: userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return cards.map((c) => ({
      id: c.id,
      brand: c.brand,
      last4: c.last4,
      expMonth: c.expMonth,
      expYear: c.expYear,
      isDefault: c.isDefault,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async startCardRegistration(userId: string): Promise<{
    orderId: string;
    redirectUrl: string | null;
    card?: ProviderCardSummary;
  }> {
    await this.requireProvider(userId);

    const cardCount = await this.prisma.providerCard.count({
      where: { providerId: userId },
    });
    if (cardCount >= COMMISSION.MAX_CARDS_PER_PROVIDER) {
      throw new BadRequestException(
        `Ən çox ${COMMISSION.MAX_CARDS_PER_PROVIDER} kart əlavə edə bilərsiniz`,
      );
    }

    const orderId = randomUUID();

    // Dev / simulyasiya — Epoint açarları yoxdursa kart dərhal (token) yaradılır
    if (!this.epoint.isConfigured()) {
      const card = await this.createCard(userId, {
        token: `sim_${randomUUID()}`,
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
      });
      return { orderId, redirectUrl: null, card };
    }

    await this.prisma.providerPaymentOrder.create({
      data: {
        providerId: userId,
        type: ProviderPaymentOrderType.CARD_REGISTRATION,
        status: ProviderPaymentOrderStatus.PENDING,
        orderId,
      },
    });

    const result = await this.epoint.startCardRegistration({
      orderId,
      amount: 0.01,
      description: 'Kart doğrulama',
      language: 'az',
      successUrl: this.redirectUrl('success'),
      errorUrl: this.redirectUrl('error'),
      resultUrl: this.resultUrl(),
    });

    if (result.cardId) {
      // Sinxron qeydiyyat (redirect yoxdur)
      await this.settleOrder(orderId, {
        status: 'success',
        cardId: result.cardId,
      });
      const card = await this.prisma.providerCard.findFirst({
        where: { providerId: userId },
        orderBy: { createdAt: 'desc' },
      });
      return {
        orderId,
        redirectUrl: null,
        card: card ? this.mapCard(card) : undefined,
      };
    }

    return { orderId, redirectUrl: result.redirectUrl };
  }

  private mapCard(card: {
    id: string;
    brand: string | null;
    last4: string;
    expMonth: number | null;
    expYear: number | null;
    isDefault: boolean;
    createdAt: Date;
  }): ProviderCardSummary {
    return {
      id: card.id,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      isDefault: card.isDefault,
      createdAt: card.createdAt.toISOString(),
    };
  }

  async deleteCard(userId: string, cardId: string): Promise<{ deleted: boolean }> {
    await this.requireProvider(userId);
    const card = await this.prisma.providerCard.findFirst({
      where: { id: cardId, providerId: userId },
      select: { id: true },
    });
    if (!card) throw new NotFoundException('Kart tapılmadı');

    await this.prisma.providerCard.delete({ where: { id: cardId } });
    return { deleted: true };
  }

  private async createCard(
    providerId: string,
    input: {
      token: string;
      brand: string | null;
      last4: string;
      expMonth?: number | null;
      expYear?: number | null;
    },
  ): Promise<ProviderCardSummary> {
    const tokenEnc = encryptField(input.token, this.encryptionKey);
    const tokenHash = hashField(input.token);

    // İlk kart default olsun
    const count = await this.prisma.providerCard.count({ where: { providerId } });
    const card = await this.prisma.providerCard.create({
      data: {
        providerId,
        tokenHash,
        tokenEnc,
        brand: input.brand,
        last4: input.last4,
        expMonth: input.expMonth ?? null,
        expYear: input.expYear ?? null,
        isDefault: count === 0,
      },
    });
    return this.mapCard(card);
  }

  private async decryptToken(card: { tokenEnc: string }): Promise<string> {
    return decryptField(card.tokenEnc, this.encryptionKey);
  }

  // ────────────────────────────────────────────────────────────────
  // Top-up (deposit)
  // ────────────────────────────────────────────────────────────────

  async initiateDeposit(
    userId: string,
    dto: InitiateDepositDto,
    headerIdempotencyKey?: string | null,
  ): Promise<{
    orderId: string;
    redirectUrl: string | null;
    wallet?: ProviderWalletSummary;
  }> {
    await this.requireProvider(userId);

    const idempotencyKey = normalizeIdempotencyKey(headerIdempotencyKey);
    const route = 'POST /commission/deposits';
    const requestFingerprint = { cardId: dto.cardId, amount: dto.amount };

    if (idempotencyKey) {
      const cached = await this.idempotency.findExisting(
        idempotencyKey,
        userId,
        route,
      );
      if (cached.hit) {
        const body = cached.body as {
          _requestHash?: string;
          orderId: string;
          redirectUrl: string | null;
        };
        assertIdempotencyPayloadCompatible(body._requestHash, requestFingerprint);
        const { _requestHash: _, ...summary } = body;
        return summary;
      }
    }

    const card = await this.prisma.providerCard.findFirst({
      where: { id: dto.cardId, providerId: userId },
    });
    if (!card) throw new NotFoundException('Kart tapılmadı');

    const orderId = randomUUID();

    // Dev / simulyasiya — Epoint açarları yoxdursa dərhal uğurlu top-up
    if (!this.epoint.isConfigured()) {
      const wallet = await this.settleDepositSuccess(
        userId,
        dto.amount,
        orderId,
      );
      return { orderId, redirectUrl: null, wallet };
    }

    const token = await this.decryptToken(card);
    await this.prisma.providerPaymentOrder.create({
      data: {
        providerId: userId,
        type: ProviderPaymentOrderType.DEPOSIT,
        status: ProviderPaymentOrderStatus.PENDING,
        amount: new Prisma.Decimal(dto.amount),
        orderId,
      },
    });

    let result;
    try {
      result = await this.epoint.payWithSavedCard({
        amount: dto.amount,
        orderId,
        cardId: token,
        description: 'Xidmətal balans top-up',
      });
    } catch (error) {
      await this.prisma.providerPaymentOrder.update({
        where: { orderId },
        data: { status: ProviderPaymentOrderStatus.FAILED },
      });
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Ödəniş başlatıla bilmədi',
      );
    }

    const summary = { orderId, redirectUrl: result.redirectUrl };
    if (idempotencyKey) {
      await this.idempotency.save({
        key: idempotencyKey,
        userId,
        route,
        statusCode: 201,
        body: { ...summary, _requestHash: hashIdempotencyPayload(requestFingerprint) },
      });
    }

    // Sinxron nəticə (3DS redirect yoxdursa)
    if (!result.redirectUrl && result.status) {
      await this.settleOrder(orderId, {
        status: result.status,
        transaction: result.transaction,
      });
      const wallet = await this.ensureWallet(userId);
      return { orderId, redirectUrl: null, wallet: this.mapWallet(wallet) };
    }

    return summary;
  }

  private async settleDepositSuccess(
    providerId: string,
    amount: number,
    orderId: string,
  ): Promise<ProviderWalletSummary> {
    await this.applyLedgerEntry({
      providerId,
      type: WalletTransactionType.CARD_DEPOSIT,
      amount,
      referenceId: orderId,
      description: 'Kart ilə balans top-up',
    });
    await this.prisma.providerPaymentOrder.create({
      data: {
        providerId,
        type: ProviderPaymentOrderType.DEPOSIT,
        status: ProviderPaymentOrderStatus.SUCCEEDED,
        amount: new Prisma.Decimal(amount),
        orderId,
      },
    });
    await this.applyDebtThreshold(providerId);
    await this.restoreIfCleared(providerId);
    const wallet = await this.ensureWallet(providerId);
    return this.mapWallet(wallet);
  }

  async listTransactions(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<WalletTransactionSummary>> {
    await this.requireProvider(userId);
    const wallet = await this.ensureWallet(userId);
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        walletId: r.walletId,
        type: r.type,
        amount: r.amount.toNumber(),
        balanceAfter: r.balanceAfter.toNumber(),
        referenceId: r.referenceId,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Callback (Epoint webhook) — idempotent
  // ────────────────────────────────────────────────────────────────

  async handleCallback(data: string, signature: string): Promise<void> {
    if (!this.epoint.verifySignature(data, signature)) {
      throw new UnauthorizedException('Epoint callback imzası etibarsızdır');
    }
    const payload = this.epoint.decodeData(data);
    const orderId = payload.orderId ?? null;
    if (!orderId) {
      this.logger.warn('Epoint callback: order_id tapılmadı');
      return;
    }
    await this.settleOrder(orderId, {
      status: payload.status ?? null,
      transaction: payload.transaction ?? null,
      cardId: payload.cardId ?? null,
      cardMask: payload.cardMask ?? null,
    });
  }

  private async settleOrder(
    orderId: string,
    result: {
      status: string | null;
      transaction?: string | null;
      cardId?: string | null;
      cardMask?: string | null;
    },
  ): Promise<void> {
    const order = await this.prisma.providerPaymentOrder.findUnique({
      where: { orderId },
    });
    if (!order || order.status !== ProviderPaymentOrderStatus.PENDING) {
      return; // idempotent — yalnız PENDING-i işlə
    }

    const success = result.status === 'success';
    const terminal = success
      ? ProviderPaymentOrderStatus.SUCCEEDED
      : result.status === 'cancel'
        ? ProviderPaymentOrderStatus.CANCELLED
        : ProviderPaymentOrderStatus.FAILED;

    if (order.type === ProviderPaymentOrderType.CARD_REGISTRATION) {
      if (success && result.cardId) {
        const { last4, brand } = EpointService.parseCardMask(result.cardMask);
        await this.createCard(order.providerId, {
          token: result.cardId,
          brand,
          last4,
        });
      }
      await this.prisma.providerPaymentOrder.update({
        where: { id: order.id },
        data: { status: terminal, externalId: result.transaction ?? null },
      });
      return;
    }

    // DEPOSIT
    if (success && order.amount) {
      await this.applyLedgerEntry({
        providerId: order.providerId,
        type: WalletTransactionType.CARD_DEPOSIT,
        amount: order.amount.toNumber(),
        referenceId: order.id,
        description: 'Kart ilə balans top-up',
      });
      await this.applyDebtThreshold(order.providerId);
      await this.restoreIfCleared(order.providerId);
    }

    await this.prisma.providerPaymentOrder.update({
      where: { id: order.id },
      data: { status: terminal, externalId: result.transaction ?? null },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Suspension (borc müddəti) — hesab bağlama / açma
  // ────────────────────────────────────────────────────────────────

  async assertProviderCanOperate(providerId: string): Promise<void> {
    const wallet = await this.prisma.providerWallet.findUnique({
      where: { providerId },
      select: { suspendedAt: true },
    });
    if (wallet?.suspendedAt) {
      throw new ForbiddenException(
        'Hesabınız ödənilməmiş borc səbəbindən müvəqqəti bağlanıb. Borcu ödədikdən sonra yenidən açılacaq.',
      );
    }
  }

  private async suspendAccount(providerId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.providerWallet.findUnique({
        where: { providerId },
        select: { suspendedAt: true },
      });
      if (!wallet || wallet.suspendedAt) return;

      const activeServices = await tx.service.findMany({
        where: { providerId, status: ServiceStatus.ACTIVE },
        select: { id: true },
      });
      const serviceIds = activeServices.map((s) => s.id);

      if (serviceIds.length > 0) {
        await tx.service.updateMany({
          where: { id: { in: serviceIds } },
          data: { status: ServiceStatus.PAUSED },
        });
      }

      await tx.providerWallet.update({
        where: { providerId },
        data: {
          suspendedAt: new Date(),
          suspendedReason: ProviderSuspensionReason.DEBT_OVERDUE,
          suspendedServices: serviceIds as Prisma.InputJsonValue,
        },
      });
    });

    this.notify(
      providerId,
      NotificationType.COMMISSION_ACCOUNT_SUSPENDED,
      'Hesabınız bağlandı',
      'Borc 1 iş günü ərzində ödənmədiyi üçün hesabınız müvəqqəti bağlandı. Borcu ödədikdən sonra avtomatik açılacaq.',
      { href: '/dashboard/provider/billing' },
    );
  }

  private async restoreIfCleared(providerId: string): Promise<void> {
    const wallet = await this.prisma.providerWallet.findUnique({
      where: { providerId },
    });
    if (!wallet) return;
    const debt = debtFromBalance(wallet.balance);
    // Hesab yalnız borc tam sıfırlandıqda (balans >= 0) açılır —
    // qismən ödəniş (məs. 12 → 5 AZN) suspenziyanı qaldırmır.
    if (debt > DEBT_TOLERANCE) return;

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.providerWallet.findUniqueOrThrow({
        where: { providerId },
      });
      const serviceIds = (current.suspendedServices ?? []) as string[];

      if (serviceIds.length > 0) {
        // Yalnız hələ PAUSED olanları bərpa et (provider/admin başqa cür dəyişməyibsə)
        await tx.service.updateMany({
          where: { id: { in: serviceIds }, status: ServiceStatus.PAUSED },
          data: { status: ServiceStatus.ACTIVE },
        });
      }

      await tx.providerWallet.update({
        where: { providerId },
        data: {
          suspendedAt: null,
          suspendedReason: null,
          suspendedServices: Prisma.JsonNull,
          debtDueAt: null,
          debtNotifiedAt: null,
        },
      });
    });

    if (wallet.suspendedAt) {
      this.notify(
        providerId,
        NotificationType.COMMISSION_ACCOUNT_RESTORED,
        'Hesabınız açıldı',
        'Borcunuz ödəndi. Hesabınız yenidən aktivdir.',
        { href: '/dashboard/provider/billing' },
      );
    }
  }

  /** Scheduler: müddəti bitmiş borcları bağla. */
  async runSuspensionSweep(): Promise<{ suspended: number }> {
    const now = new Date();
    const overdue = await this.prisma.providerWallet.findMany({
      where: {
        suspendedAt: null,
        debtDueAt: { lte: now },
      },
      select: { providerId: true, balance: true },
    });

    let suspended = 0;
    for (const wallet of overdue) {
      if (debtFromBalance(wallet.balance) >= COMMISSION.DEBT_THRESHOLD_AZN) {
        await this.suspendAccount(wallet.providerId);
        suspended += 1;
      } else {
        // Borc artıq ödənilib — deadline təmizlə
        await this.prisma.providerWallet.update({
          where: { providerId: wallet.providerId },
          data: { debtDueAt: null, debtNotifiedAt: null },
        });
      }
    }
    return { suspended };
  }

  // ────────────────────────────────────────────────────────────────
  // Admin
  // ────────────────────────────────────────────────────────────────

  async listWallets(
    query: { page?: number; limit?: number; search?: string },
  ): Promise<PaginatedResponse<AdminCommissionSummary>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: UserRole.PROVIDER,
      ...(query.search?.trim()
        ? {
            OR: [
              { email: { contains: query.search.trim(), mode: 'insensitive' } },
              { firstName: { contains: query.search.trim(), mode: 'insensitive' } },
              { lastName: { contains: query.search.trim(), mode: 'insensitive' } },
              {
                providerWallet: {
                  accountNumber: { contains: query.search.trim(), mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          providerWallet: {
            select: {
              accountNumber: true,
              balance: true,
              debtDueAt: true,
              suspendedAt: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = await Promise.all(
      users.map(async (u) => {
        const wallet = u.providerWallet;
        const balance = wallet?.balance.toNumber() ?? 0;
        const [commissionAgg, depositAgg] = await Promise.all([
          this.prisma.walletTransaction.aggregate({
            where: {
              wallet: { providerId: u.id },
              type: WalletTransactionType.COMMISSION,
            },
            _sum: { amount: true },
          }),
          this.prisma.walletTransaction.aggregate({
            where: {
              wallet: { providerId: u.id },
              type: WalletTransactionType.CARD_DEPOSIT,
            },
            _sum: { amount: true },
          }),
        ]);
        return {
          providerId: u.id,
          providerName: `${u.firstName} ${u.lastName}`.trim(),
          email: u.email,
          accountNumber: wallet?.accountNumber ?? '—',
          balance,
          debt: balance < 0 ? Math.abs(balance) : 0,
          debtDueAt: wallet?.debtDueAt?.toISOString() ?? null,
          suspended: wallet?.suspendedAt != null,
          isActive: u.isActive,
          totalCommissionCharged: Math.abs(commissionAgg._sum.amount?.toNumber() ?? 0),
          totalDeposits: depositAgg._sum.amount?.toNumber() ?? 0,
        };
      }),
    );

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 0 };
  }

  async adminAdjust(
    providerId: string,
    adminId: string,
    dto: { amount: number; note?: string },
  ): Promise<ProviderWalletSummary> {
    const provider = await this.prisma.user.findUnique({
      where: { id: providerId },
      select: { id: true, role: true },
    });
    if (!provider || provider.role !== UserRole.PROVIDER) {
      throw new NotFoundException('Xidmət verən tapılmadı');
    }

    await this.applyLedgerEntry({
      providerId,
      type: WalletTransactionType.ADMIN_ADJUSTMENT,
      amount: dto.amount,
      description: dto.note?.trim() || 'Admin köçürmə qeydi',
      meta: { adminId },
    });

    await this.applyDebtThreshold(providerId);
    await this.restoreIfCleared(providerId);

    // Audit
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          adminId,
          action: 'COMMISSION_ADJUST',
          targetType: 'USER',
          targetId: providerId,
          meta: { amount: dto.amount, note: dto.note?.trim() ?? null },
        },
      });
    } catch {
      // audit heç vaxt əsas əməliyyatı pozmasın
    }

    const wallet = await this.ensureWallet(providerId);
    return this.mapWallet(wallet);
  }

  // ────────────────────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────────────────────

  private redirectUrl(status: 'success' | 'error'): string {
    const base =
      this.config.get<string>('PROVIDER_APP_URL')?.trim() ||
      'http://localhost:3022';
    return `${base.replace(/\/$/, '')}/dashboard/provider/billing?epoint=${status}`;
  }

  private resultUrl(): string {
    const configured = this.config.get<string>('EPOINT_RESULT_URL')?.trim();
    if (configured) return configured;
    const api =
      this.config.get<string>('API_URL')?.trim() || 'http://localhost:4000';
    return `${api.replace(/\/$/, '')}/api/v1/commission/epoint/callback`;
  }

  private notify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): void {
    void this.prisma.notification
      .create({
        data: { userId, type, title, body, data: data as Prisma.InputJsonValue },
      })
      .then((notification) => {
        this.channels?.deliverAfterInApp({
          userId,
          title,
          body,
          type,
          notificationId: notification.id,
          data,
        });
      })
      .catch((error) => {
        this.logger.warn(
          `Bildiriş yaradılmadı: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
  }
}
