ALTER TABLE "AssistantFeedback" ADD COLUMN "userId" TEXT;
CREATE INDEX "AssistantFeedback_userId_idx" ON "AssistantFeedback"("userId");
CREATE INDEX "AssistantFeedback_createdAt_idx" ON "AssistantFeedback"("createdAt");
ALTER TABLE "AssistantFeedback" ADD CONSTRAINT "AssistantFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
