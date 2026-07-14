-- DropForeignKey
ALTER TABLE "AccountSettingValue" DROP CONSTRAINT "AccountSettingValue_accountSettingId_fkey";

-- DropForeignKey
ALTER TABLE "AccountSettingValue" DROP CONSTRAINT "AccountSettingValue_userId_fkey";

-- AddForeignKey
ALTER TABLE "AccountSettingValue" ADD CONSTRAINT "AccountSettingValue_accountSettingId_fkey" FOREIGN KEY ("accountSettingId") REFERENCES "AccountSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSettingValue" ADD CONSTRAINT "AccountSettingValue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
