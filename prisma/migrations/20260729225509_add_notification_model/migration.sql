-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex (partial, not expressible via @@index in schema.prisma)
-- Unread badge count: WHERE userId = ? AND read = false AND dismissed = false
CREATE INDEX "Notification_userId_unread_count_idx"
  ON "Notification" ("userId")
  WHERE "read" = false AND "dismissed" = false;

-- CreateIndex (partial)
-- Unread tab content: WHERE userId = ? AND dismissed = false ORDER BY createdAt DESC
CREATE INDEX "Notification_userId_createdAt_active_idx"
  ON "Notification" ("userId", "createdAt" DESC)
  WHERE "dismissed" = false;

-- CreateIndex (partial)
-- History tab content: WHERE userId = ? AND dismissed = true ORDER BY createdAt DESC
CREATE INDEX "Notification_userId_createdAt_dismissed_idx"
  ON "Notification" ("userId", "createdAt" DESC)
  WHERE "dismissed" = true;
