-- CreateTable
CREATE TABLE "AccountSetting" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultValue" TEXT,

    CONSTRAINT "AccountSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSettingValue" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "value" TEXT NOT NULL,
    "accountSettingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AccountSettingValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountSetting_slug_key" ON "AccountSetting"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AccountSetting_name_key" ON "AccountSetting"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AccountSettingValue_accountSettingId_userId_key" ON "AccountSettingValue"("accountSettingId", "userId");

-- AddForeignKey
ALTER TABLE "AccountSettingValue" ADD CONSTRAINT "AccountSettingValue_accountSettingId_fkey" FOREIGN KEY ("accountSettingId") REFERENCES "AccountSetting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSettingValue" ADD CONSTRAINT "AccountSettingValue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
