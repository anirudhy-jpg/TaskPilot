-- Migration: Drop deprecated "status" column from "tasks" table
-- Reason: "status" was a legacy fallback that duplicated "column_id" values.
-- Board placement is now exclusively determined by "column_id".
-- This is a safe migration that simply drops the column.
-- It's recommended to run this after the codebase changes have been deployed to production.

ALTER TABLE public.tasks DROP COLUMN IF EXISTS status;
