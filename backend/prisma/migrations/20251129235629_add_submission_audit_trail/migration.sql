-- CreateTable
CREATE TABLE "submission_audits" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "from_status" "SubmissionStatus" NOT NULL,
    "to_status" "SubmissionStatus" NOT NULL,
    "change_reason" VARCHAR(255),
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_audits_submission_id_changed_at_idx" ON "submission_audits"("submission_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "submission_audits_changed_at_idx" ON "submission_audits"("changed_at" DESC);

-- AddForeignKey
ALTER TABLE "submission_audits" ADD CONSTRAINT "submission_audits_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "seller_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
