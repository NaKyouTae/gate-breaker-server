-- AlterTable
ALTER TABLE "monster" ADD COLUMN     "is_boss" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;
