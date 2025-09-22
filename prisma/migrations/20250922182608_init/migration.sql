-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "is_public" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "is_admin" BOOLEAN DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assets" (
    "symbol" VARCHAR(10) NOT NULL,
    "current_price_usd" DECIMAL(15,8),
    "last_updated" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "public"."holdings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "asset_symbol" VARCHAR(10) NOT NULL,
    "amount" BIGINT NOT NULL,
    "locked_until" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trades" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "from_asset" VARCHAR(10) NOT NULL,
    "to_asset" VARCHAR(10) NOT NULL,
    "from_amount" BIGINT NOT NULL,
    "to_amount" BIGINT NOT NULL,
    "btc_price_usd" DECIMAL(15,2),
    "asset_price_usd" DECIMAL(15,2),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchases" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "asset_symbol" VARCHAR(10) NOT NULL,
    "amount" BIGINT NOT NULL,
    "btc_spent" BIGINT NOT NULL,
    "purchase_price_usd" DECIMAL(15,8),
    "btc_price_usd" DECIMAL(15,2),
    "locked_until" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."magic_links" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "used" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."suggestions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(20) DEFAULT 'open',
    "admin_reply" TEXT,
    "replied_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."achievements" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "icon" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."set_forget_portfolios" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "share_token" VARCHAR(255),
    "locked_until" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_image_generated" TIMESTAMP(6),

    CONSTRAINT "set_forget_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."set_forget_allocations" (
    "id" SERIAL NOT NULL,
    "portfolio_id" INTEGER,
    "asset_symbol" VARCHAR(10) NOT NULL,
    "allocation_percentage" DECIMAL(5,2) NOT NULL,
    "btc_amount" BIGINT NOT NULL,
    "asset_amount" BIGINT NOT NULL,
    "purchase_price_usd" DECIMAL(15,8),
    "btc_price_usd" DECIMAL(15,2),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "set_forget_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_achievements" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "achievement_id" INTEGER,
    "earned_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_token_key" ON "public"."magic_links"("token");

-- CreateIndex
CREATE INDEX "idx_suggestions_status" ON "public"."suggestions"("status");

-- CreateIndex
CREATE INDEX "idx_suggestions_user_id" ON "public"."suggestions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "public"."achievements"("code");

-- CreateIndex
CREATE INDEX "idx_achievements_code" ON "public"."achievements"("code");

-- CreateIndex
CREATE UNIQUE INDEX "set_forget_portfolios_share_token_key" ON "public"."set_forget_portfolios"("share_token");

-- CreateIndex
CREATE INDEX "idx_set_forget_portfolios_locked_until" ON "public"."set_forget_portfolios"("locked_until");

-- CreateIndex
CREATE INDEX "idx_set_forget_portfolios_share_token" ON "public"."set_forget_portfolios"("share_token");

-- CreateIndex
CREATE INDEX "idx_set_forget_portfolios_user_id" ON "public"."set_forget_portfolios"("user_id");

-- CreateIndex
CREATE INDEX "idx_set_forget_allocations_asset_symbol" ON "public"."set_forget_allocations"("asset_symbol");

-- CreateIndex
CREATE INDEX "idx_set_forget_allocations_portfolio_id" ON "public"."set_forget_allocations"("portfolio_id");

-- CreateIndex
CREATE INDEX "idx_user_achievements_achievement_id" ON "public"."user_achievements"("achievement_id");

-- CreateIndex
CREATE INDEX "idx_user_achievements_earned_at" ON "public"."user_achievements"("earned_at");

-- CreateIndex
CREATE INDEX "idx_user_achievements_user_id" ON "public"."user_achievements"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "public"."user_achievements"("user_id", "achievement_id");

-- AddForeignKey
ALTER TABLE "public"."holdings" ADD CONSTRAINT "holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."trades" ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."suggestions" ADD CONSTRAINT "suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."set_forget_portfolios" ADD CONSTRAINT "set_forget_portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."set_forget_allocations" ADD CONSTRAINT "set_forget_allocations_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "public"."set_forget_portfolios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

