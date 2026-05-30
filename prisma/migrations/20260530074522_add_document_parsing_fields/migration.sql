-- AlterTable
ALTER TABLE `document` ADD COLUMN `parseError` TEXT NULL,
    ADD COLUMN `parsedText` LONGTEXT NULL;
