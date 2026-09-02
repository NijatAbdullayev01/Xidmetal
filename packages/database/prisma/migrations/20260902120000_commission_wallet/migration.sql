-- Xidmət verən komissiyası & borc hesabı (Faza 6)
-- Virtual cüzdan, ledger əməliyyatları, tokenləşdirilmiş kartlar və Epoint ödəniş sifarişləri.
--
-- İdempotentdir: obyektlər `prisma db push` ilə əvvəlcədən yaradılıbsa, bu migration
-- onları yenidən yaratmır (skip), yalnız çatışmayanları tamamlayır. Həm təzə DB-də,
-- həm də artıq push-olunmuş DB-də təhlükəsiz işləyir.

-- Enumlar (CREATE TYPE IF NOT EXISTS yoxdur — DO bloku ilə skip)
DO $$
BEGIN
  CREATE TYPE "WalletTransactionType" AS ENUM ('COMMISSION', 'CARD_DEPOSIT', 'ADMIN_ADJUSTMENT', 'REFUND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ProviderPaymentOrderType" AS ENUM ('CARD_REGISTRATION', 'DEPOSIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ProviderPaymentOrderStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Komissiya bildirişləri (ADD VALUE IF NOT EXISTS artıq idempotentdir)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMISSION_DEBT_DUE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMISSION_ACCOUNT_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COMMISSION_ACCOUNT_RESTORED';

-- CreateTable
CREATE TABLE IF NOT EXISTS "provider_wallets" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "debt_due_at" TIMESTAMP(3),
    "debt_notified_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "suspended_reason" TEXT,
    "suspended_services" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "reference_id" TEXT,
    "description" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "provider_cards" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_enc" TEXT NOT NULL,
    "brand" TEXT,
    "last4" TEXT NOT NULL,
    "exp_month" INTEGER,
    "exp_year" INTEGER,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "provider_payment_orders" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "type" "ProviderPaymentOrderType" NOT NULL,
    "status" "ProviderPaymentOrderStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2),
    "order_id" TEXT NOT NULL,
    "external_id" TEXT,
    "card_token" TEXT,
    "card_brand" TEXT,
    "card_last4" TEXT,
    "card_exp_month" INTEGER,
    "card_exp_year" INTEGER,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "provider_wallets_provider_id_key" ON "provider_wallets"("provider_id");
CREATE UNIQUE INDEX IF NOT EXISTS "provider_wallets_account_number_key" ON "provider_wallets"("account_number");
CREATE INDEX IF NOT EXISTS "provider_wallets_provider_id_idx" ON "provider_wallets"("provider_id");
CREATE INDEX IF NOT EXISTS "wallet_transactions_wallet_id_created_at_idx" ON "wallet_transactions"("wallet_id", "created_at");
CREATE INDEX IF NOT EXISTS "wallet_transactions_type_reference_id_idx" ON "wallet_transactions"("type", "reference_id");
CREATE UNIQUE INDEX IF NOT EXISTS "provider_cards_token_hash_key" ON "provider_cards"("token_hash");
CREATE INDEX IF NOT EXISTS "provider_cards_provider_id_idx" ON "provider_cards"("provider_id");
CREATE UNIQUE INDEX IF NOT EXISTS "provider_payment_orders_order_id_key" ON "provider_payment_orders"("order_id");
CREATE INDEX IF NOT EXISTS "provider_payment_orders_provider_id_created_at_idx" ON "provider_payment_orders"("provider_id", "created_at");

-- AddForeignKey (constraint adı unikaldır; duplicate_object yaxalanır)
DO $$
BEGIN
  ALTER TABLE "provider_wallets" ADD CONSTRAINT "provider_wallets_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "provider_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "provider_cards" ADD CONSTRAINT "provider_cards_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "provider_payment_orders" ADD CONSTRAINT "provider_payment_orders_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
