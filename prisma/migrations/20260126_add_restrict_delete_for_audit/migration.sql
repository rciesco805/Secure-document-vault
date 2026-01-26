-- Migration: Add onDelete RESTRICT for audit-related models (SEC compliance)
-- This prevents accidental deletion of audit records (Views, Transactions, Signatures)

-- DropForeignKey
ALTER TABLE "SignatureField" DROP CONSTRAINT IF EXISTS "SignatureField_documentId_fkey";
ALTER TABLE "SignatureField" DROP CONSTRAINT IF EXISTS "SignatureField_recipientId_fkey";
ALTER TABLE "SignatureRecipient" DROP CONSTRAINT IF EXISTS "SignatureRecipient_documentId_fkey";
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_investorId_fkey";
ALTER TABLE "View" DROP CONSTRAINT IF EXISTS "View_dataroomId_fkey";
ALTER TABLE "View" DROP CONSTRAINT IF EXISTS "View_documentId_fkey";
ALTER TABLE "View" DROP CONSTRAINT IF EXISTS "View_linkId_fkey";
ALTER TABLE "View" DROP CONSTRAINT IF EXISTS "View_viewerId_fkey";

-- AddForeignKey with RESTRICT
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "View" ADD CONSTRAINT "View_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "View" ADD CONSTRAINT "View_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "View" ADD CONSTRAINT "View_dataroomId_fkey" FOREIGN KEY ("dataroomId") REFERENCES "Dataroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "View" ADD CONSTRAINT "View_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Viewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SignatureRecipient" ADD CONSTRAINT "SignatureRecipient_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SignatureDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SignatureField" ADD CONSTRAINT "SignatureField_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SignatureDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SignatureField" ADD CONSTRAINT "SignatureField_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "SignatureRecipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
