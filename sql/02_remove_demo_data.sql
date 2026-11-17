-- ACC 556: Family Health Tracker. 02: remove the demo data (one time).
-- Author: Nate Hansen
-- Environment: Supabase project "ACC556 Final Project" ONLY.
--
-- The app is for the real Hansen family only. Earlier versions loaded fictional demo families
-- (Parker, Clark, Davis) and a guest login, all with @example.com emails. This script removes them.
-- It never touches real logins (real email addresses) or The Hansen Family.
--
-- How it works (ON DELETE CASCADE does most of the work):
--   deleting a login (auth.users)  -> deletes its profile -> its goals -> their check-ins and prize wins
--   deleting a demo family         -> deletes its monthly prizes
-- Safe to run again: the second time there is nothing left to delete.

-- Preview: what will be removed.
SELECT 'login' AS kind, u.email AS what FROM auth.users u WHERE u.email LIKE '%@example.com'
UNION ALL
SELECT 'family', f.name FROM public.families f WHERE f.id::text LIKE 'f1000000-%'
ORDER BY kind, what;

BEGIN;

DELETE FROM auth.users
WHERE email LIKE '%@example.com';

DELETE FROM public.families
WHERE id::text LIKE 'f1000000-%';

COMMIT;

-- Check: only The Hansen Family should be left, with your family's logins.
SELECT f.name AS family, p.full_name, p.role, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.families f ON f.id = p.family_id
ORDER BY f.name, p.full_name;
