-- 001_enable_ltree.up.sql
-- Enable ltree extension for hierarchical materialized paths (ADR 004, ADR 007)

CREATE EXTENSION IF NOT EXISTS ltree;