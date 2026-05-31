/*
  Warnings:

  - Made the column `email` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `passwordHash` VARCHAR(191) NOT NULL DEFAULT '',
    MODIFY `email` VARCHAR(191) NOT NULL;
