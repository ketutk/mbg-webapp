-- AlterTable: add nullable slug first so existing rows can be backfilled safely
ALTER TABLE "Session" ADD COLUMN "slug" TEXT;
ALTER TABLE "Tournament" ADD COLUMN "slug" TEXT;

-- Backfill Session slugs: "<slugified-name>-<yyyy-mm-dd>" (with "-2", "-3" suffix on collision)
WITH base_sessions AS (
  SELECT
    "id",
    CASE
      WHEN trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')) = ''
        THEN 'session-' || to_char("date", 'YYYY-MM-DD')
      WHEN right(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), 10) = to_char("date", 'YYYY-MM-DD')
        THEN trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'))
      ELSE left(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), 60) || '-' || to_char("date", 'YYYY-MM-DD')
    END AS base_slug,
    "createdAt"
  FROM "Session"
),
ranked_sessions AS (
  SELECT
    "id",
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM base_sessions
)
UPDATE "Session" s
SET "slug" = CASE
  WHEN r.rn = 1 THEN r.base_slug
  ELSE r.base_slug || '-' || r.rn
END
FROM ranked_sessions r
WHERE s."id" = r."id";

-- Backfill Tournament slugs: "<slugified-name>-<session-yyyy-mm-dd>" (with "-2", "-3" suffix on collision)
WITH base_tournaments AS (
  SELECT
    t."id",
    CASE
      WHEN trim(both '-' from regexp_replace(lower(t."name"), '[^a-z0-9]+', '-', 'g')) = ''
        THEN 'tournament-' || to_char(s."date", 'YYYY-MM-DD')
      WHEN right(trim(both '-' from regexp_replace(lower(t."name"), '[^a-z0-9]+', '-', 'g')), 10) = to_char(s."date", 'YYYY-MM-DD')
        THEN trim(both '-' from regexp_replace(lower(t."name"), '[^a-z0-9]+', '-', 'g'))
      ELSE left(trim(both '-' from regexp_replace(lower(t."name"), '[^a-z0-9]+', '-', 'g')), 60) || '-' || to_char(s."date", 'YYYY-MM-DD')
    END AS base_slug,
    t."createdAt"
  FROM "Tournament" t
  JOIN "Session" s ON s."id" = t."sessionId"
),
ranked_tournaments AS (
  SELECT
    "id",
    base_slug,
    ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM base_tournaments
)
UPDATE "Tournament" t
SET "slug" = CASE
  WHEN r.rn = 1 THEN r.base_slug
  ELSE r.base_slug || '-' || r.rn
END
FROM ranked_tournaments r
WHERE t."id" = r."id";

-- Enforce NOT NULL and UNIQUE constraints
ALTER TABLE "Session" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Tournament" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Session_slug_key" ON "Session"("slug");
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");
