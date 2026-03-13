-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('WEAPON', 'ARMOR', 'GLOVE', 'SHOE', 'RING', 'NECKLACE', 'MATERIAL', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- CreateEnum
CREATE TYPE "EquipSlot" AS ENUM ('WEAPON', 'ARMOR', 'GLOVE', 'SHOE', 'RING', 'NECKLACE');

-- CreateEnum
CREATE TYPE "BattleResult" AS ENUM ('VICTORY', 'DEFEAT', 'ESCAPE');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nickname" VARCHAR(20) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "max_hp" INTEGER NOT NULL DEFAULT 100,
    "mp" INTEGER NOT NULL DEFAULT 50,
    "max_mp" INTEGER NOT NULL DEFAULT 50,
    "attack" INTEGER NOT NULL DEFAULT 10,
    "defense" INTEGER NOT NULL DEFAULT 5,
    "critical_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "type" "ItemType" NOT NULL,
    "rarity" "Rarity" NOT NULL DEFAULT 'COMMON',
    "base_attack" INTEGER NOT NULL DEFAULT 0,
    "base_defense" INTEGER NOT NULL DEFAULT 0,
    "base_hp" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "sell_price" INTEGER NOT NULL DEFAULT 0,
    "buy_price" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "enhance_level" INTEGER NOT NULL DEFAULT 0,
    "is_equipped" BOOLEAN NOT NULL DEFAULT false,
    "equipped_slot" "EquipSlot",
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dungeon" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "min_level" INTEGER NOT NULL,
    "max_level" INTEGER NOT NULL,
    "reward_gold_min" INTEGER NOT NULL,
    "reward_gold_max" INTEGER NOT NULL,
    "reward_exp" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dungeon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monster" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "dungeon_id" TEXT NOT NULL,
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "exp_reward" INTEGER NOT NULL,
    "gold_reward" INTEGER NOT NULL,
    "is_boss" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "monster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_table" (
    "id" TEXT NOT NULL,
    "monster_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "drop_rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "drop_table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battle_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "dungeon_id" TEXT NOT NULL,
    "result" "BattleResult" NOT NULL,
    "gold_earned" INTEGER NOT NULL DEFAULT 0,
    "exp_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_config" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_nickname_key" ON "user"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "game_config_category_key_key" ON "game_config"("category", "key");

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monster" ADD CONSTRAINT "monster_dungeon_id_fkey" FOREIGN KEY ("dungeon_id") REFERENCES "dungeon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_table" ADD CONSTRAINT "drop_table_monster_id_fkey" FOREIGN KEY ("monster_id") REFERENCES "monster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_table" ADD CONSTRAINT "drop_table_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_log" ADD CONSTRAINT "battle_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_log" ADD CONSTRAINT "battle_log_dungeon_id_fkey" FOREIGN KEY ("dungeon_id") REFERENCES "dungeon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
