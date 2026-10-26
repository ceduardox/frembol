-- Repair a role name inserted through a console with the wrong client
-- encoding: the accented "á" arrived as "?". Roles created by the app
-- (Prisma, UTF-8) are unaffected, and running this again is harmless.
UPDATE "roles"
SET "name" = 'Mecánico',
    "updatedAt" = NOW()
WHERE "name" = 'Mec?nico';
