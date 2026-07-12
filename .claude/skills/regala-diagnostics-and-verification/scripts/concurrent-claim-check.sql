-- concurrent-claim-check.sql
-- =====================================================================================
-- !!! WARNING: THIS SCRIPT WRITES TO THE DATABASE. IT IS NOT READ-ONLY. !!!
-- =====================================================================================
-- It exists to PROVE the UNIQUE(item_id) guard on `claims` (one claim per item, ever).
-- DO NOT run it against real data. DO NOT run it casually. Running it is a change to the
-- live DB and is gated by the change-control process (see skill: regala-change-control).
-- Preconditions before you may run this:
--   1. You have change-control approval to write to project esyybmnwalscpnzfeowh.
--   2. You have created a THROWAWAY item and captured its id into :throwaway_item_id.
--      Never point this at an item on a real user's wishlist.
--   3. You will run the cleanup DELETE at the bottom afterwards.
-- WHAT IT PROVES: two INSERTs for the SAME item_id — exactly one succeeds; the second
-- raises SQLSTATE 23505 (unique_violation). That 23505 is what the app maps to the
-- friendly Spanish "¡Ya alguien lo reclamó! Elegí otro regalo."
-- (See apps/web/app/[username]/[slug]/actions.ts lines 36-38.)
-- =====================================================================================

-- Set the throwaway item id (replace the UUID). psql syntax:
--   \set throwaway_item_id '00000000-0000-0000-0000-000000000000'
-- Under the Supabase MCP, paste the UUID literal directly in place of :'throwaway_item_id'.

-- --- First claim: expected to SUCCEED (inserts 1 row) --------------------------------
INSERT INTO claims (item_id, claimer_name)
VALUES (:'throwaway_item_id', 'diag-first');

-- --- Second claim on the SAME item_id: expected to FAIL with 23505 -------------------
-- Run this as a SEPARATE statement. Expected error text resembles:
--   ERROR:  duplicate key value violates unique constraint "claims_item_id_unique"
--   DETAIL: Key (item_id)=(...) already exists.
--   SQLSTATE: 23505
INSERT INTO claims (item_id, claimer_name)
VALUES (:'throwaway_item_id', 'diag-second');

-- --- INTERPRETATION -----------------------------------------------------------------
-- PASS  = first INSERT returns "INSERT 0 1" AND second raises 23505 on claims_item_id_unique.
-- FAIL  = second INSERT succeeds (constraint missing/dropped — STOP, escalate: the
--         double-claim guard is gone) OR first INSERT itself errors (unexpected — inspect).

-- --- MANDATORY CLEANUP (leaves the DB as you found it) ------------------------------
DELETE FROM claims
WHERE item_id = :'throwaway_item_id'
  AND claimer_name IN ('diag-first', 'diag-second');
