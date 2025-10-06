-- Migration: Add proposal to project conversion tracking
-- Add conversion tracking fields to Proposal table
ALTER TABLE "proposals" ADD COLUMN "converted_to_project_id" TEXT;
ALTER TABLE "proposals" ADD COLUMN "converted_at" DATETIME;
ALTER TABLE "proposals" ADD COLUMN "converted_by" TEXT;

-- Add source proposal tracking field to Project table
ALTER TABLE "projects" ADD COLUMN "source_proposal_id" TEXT;

-- Create unique constraints
CREATE UNIQUE INDEX "proposals_converted_to_project_id_key" ON "proposals"("converted_to_project_id");
CREATE UNIQUE INDEX "projects_source_proposal_id_key" ON "projects"("source_proposal_id");

-- Create indexes for performance
CREATE INDEX "proposals_converted_to_project_id_idx" ON "proposals"("converted_to_project_id");
CREATE INDEX "projects_source_proposal_id_idx" ON "projects"("source_proposal_id");
