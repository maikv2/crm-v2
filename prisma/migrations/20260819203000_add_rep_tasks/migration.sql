CREATE TABLE "RepTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TASK',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "clientId" UUID,
    "representativeId" UUID NOT NULL,
    "regionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RepTask_representativeId_status_dueAt_idx" ON "RepTask"("representativeId", "status", "dueAt");
CREATE INDEX "RepTask_clientId_idx" ON "RepTask"("clientId");
CREATE INDEX "RepTask_regionId_idx" ON "RepTask"("regionId");

ALTER TABLE "RepTask" ADD CONSTRAINT "RepTask_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RepTask" ADD CONSTRAINT "RepTask_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
