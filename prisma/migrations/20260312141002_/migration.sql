/*
  Warnings:

  - A unique constraint covering the columns `[kakao_id]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('WAITING', 'IN_DUNGEON');

-- CreateEnum
CREATE TYPE "ChannelMemberRole" AS ENUM ('HOST', 'MEMBER');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "kakao_id" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "channel" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'WAITING',
    "max_members" INTEGER NOT NULL DEFAULT 4,
    "dungeon_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_member" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ChannelMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_member_channel_id_user_id_key" ON "channel_member"("channel_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_kakao_id_key" ON "user"("kakao_id");

-- AddForeignKey
ALTER TABLE "channel" ADD CONSTRAINT "channel_dungeon_id_fkey" FOREIGN KEY ("dungeon_id") REFERENCES "dungeon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_member" ADD CONSTRAINT "channel_member_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_member" ADD CONSTRAINT "channel_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
