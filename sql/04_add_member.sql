-- ACC 556: add one person to a family so they can use the app. Run once per person.
--
-- STEP 1 (Supabase dashboard): Authentication > Users > Add user > Create new user.
--         Enter their email and a password, and check "Auto Confirm User".
-- STEP 2 (here): change the four values marked EDIT, then run this script.
--
-- Families:
--   f0000000-0000-4000-8000-000000000001  The Hansen Family   (the real family)
--   f1000000-0000-4000-8000-000000000001  The Parker Family   (demo; the professor's guest login, as 'admin')
--
-- How it works: the login (auth.users) and the profile share one id. INSERT ... SELECT copies the
-- new login's id into profiles, so the app can go from "who is logged in" to "which family".
-- ON CONFLICT makes it safe to run again to fix a name, family, or role.

INSERT INTO public.profiles (id, full_name, family_id, timezone, role)
SELECT u.id,
       'Nate Hansen',                                -- EDIT: full name
       'f0000000-0000-4000-8000-000000000001',       -- EDIT: family id (see list above)
       'America/Denver',                             -- timezone (used for "today")
       'admin'                                       -- EDIT: 'admin' can award the prize; everyone else 'member'
FROM auth.users u
WHERE u.email = 'you@example.com'                    -- EDIT: their login email
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    family_id = EXCLUDED.family_id,
    timezone  = EXCLUDED.timezone,
    role      = EXCLUDED.role;

-- Check: everyone in each family, with their login email.
SELECT f.name AS family, p.full_name, p.role, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
JOIN public.families f ON f.id = p.family_id
WHERE p.id::text NOT LIKE 'a1000000-%'               -- hide the fictional demo people
ORDER BY f.name, p.full_name;
