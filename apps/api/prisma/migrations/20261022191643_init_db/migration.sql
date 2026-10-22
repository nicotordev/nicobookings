-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'WAITING_FOR_CUSTOMER', 'HUMAN_HANDOFF', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT', 'TOOL');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WEB', 'SMS');

-- CreateEnum
CREATE TYPE "MessageDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('OPEN', 'ASSIGNED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Contractor" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER,
    "durationMins" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "channel" "MessageChannel" NOT NULL DEFAULT 'WEB',
    "summary" TEXT,
    "handoffReason" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "deliveryStatus" "MessageDeliveryStatus",
    "externalId" TEXT,
    "toolName" TEXT,
    "metadata" JSONB,
    "latencyMs" INTEGER,
    "costUsd" DECIMAL(10,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "conversationId" UUID,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanHandoff" (
    "id" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "status" "HandoffStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "assignedTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "HumanHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTestCase" (
    "id" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "criteria" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvaluation" (
    "id" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "testCaseId" UUID NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT NOT NULL,
    "agentVersion" TEXT,
    "actualOutput" TEXT,
    "accuracyScore" DOUBLE PRECISION,
    "instructionScore" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "latencyMs" INTEGER,
    "costUsd" DECIMAL(10,6),
    "feedback" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_slug_key" ON "Contractor"("slug");

-- CreateIndex
CREATE INDEX "Contractor_createdAt_idx" ON "Contractor"("createdAt");

-- CreateIndex
CREATE INDEX "Customer_contractorId_name_idx" ON "Customer"("contractorId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_contractorId_email_key" ON "Customer"("contractorId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_contractorId_phone_key" ON "Customer"("contractorId", "phone");

-- CreateIndex
CREATE INDEX "Service_contractorId_isActive_idx" ON "Service"("contractorId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Service_contractorId_name_key" ON "Service"("contractorId", "name");

-- CreateIndex
CREATE INDEX "Conversation_contractorId_status_updatedAt_idx" ON "Conversation"("contractorId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_customerId_createdAt_idx" ON "Conversation"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_channel_externalId_key" ON "Message"("channel", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Booking_contractorId_startsAt_status_idx" ON "Booking"("contractorId", "startsAt", "status");

-- CreateIndex
CREATE INDEX "Booking_customerId_startsAt_idx" ON "Booking"("customerId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_conversationId_idx" ON "Booking"("conversationId");

-- CreateIndex
CREATE INDEX "HumanHandoff_contractorId_status_createdAt_idx" ON "HumanHandoff"("contractorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "HumanHandoff_conversationId_status_idx" ON "HumanHandoff"("conversationId", "status");

-- CreateIndex
CREATE INDEX "AgentTestCase_contractorId_isActive_idx" ON "AgentTestCase"("contractorId", "isActive");

-- CreateIndex
CREATE INDEX "AgentEvaluation_contractorId_createdAt_idx" ON "AgentEvaluation"("contractorId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentEvaluation_testCaseId_createdAt_idx" ON "AgentEvaluation"("testCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentEvaluation_contractorId_agentVersion_createdAt_idx" ON "AgentEvaluation"("contractorId", "agentVersion", "createdAt");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanHandoff" ADD CONSTRAINT "HumanHandoff_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanHandoff" ADD CONSTRAINT "HumanHandoff_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTestCase" ADD CONSTRAINT "AgentTestCase_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvaluation" ADD CONSTRAINT "AgentEvaluation_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvaluation" ADD CONSTRAINT "AgentEvaluation_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "AgentTestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
