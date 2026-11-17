-- ACC 556: add family members so they can use the app.
--
-- STEP 1 (Supabase dashboard): Authentication > Users > Add user > Create new user,
--         once per person. Enter their email and a password, and check "Auto Confirm User".
-- STEP 2 (here): put each person's email and first name in the VALUES list, then run this.
--         Safe to run again, e.g. to fix a name or role (ON CONFLICT updates the row).
--
-- How it works:
--   VALUES makes a small inline table of (email, name, role).
--   JOIN auth.users matches each email to its login. lower() on both sides, because Supabase
--   stores emails in lowercase. The login and the profile share one id, so the app can go from
--   "who is logged in" to "which family".
--   Everyone joins The Hansen Family (fixed id from 01_schema.sql).
--   role: 'admin' can award the monthly prize; everyone else is 'member'.

INSERT INTO public.profiles (id, full_name, family_id, timezone, role)
SELECT u.id,
       v.full_name,
       'f0000000-0000-4000-8000-000000000001',   -- The Hansen Family
       'America/Denver',                         -- timezone (used for "today")
       v.role
FROM (VALUES
        ('person1@example.com', 'First name', 'admin'),     -- EDIT
        ('person2@example.com', 'First name', 'member')     -- EDIT: add one line per person
     ) AS v(email, full_name, role)
JOIN auth.users u ON lower(u.email) = lower(v.email)
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    family_id = EXCLUDED.family_id,
    timezone  = EXCLUDED.timezone,
    role      = EXCLUDED.role;

-- Check: everyone in the family, with their login email.
-- Anyone missing here has no login yet, or their email has a typo.
SELECT p.full_name, p.role, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.family_id = 'f0000000-0000-4000-8000-000000000001'
ORDER BY p.full_name;
