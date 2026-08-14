-- ============================================================================
-- Migration · 2026-08-12 · Let people edit their own responses
--
-- One policy. Deleting your own response already works (reactions_delete);
-- this adds the matching right to change its words. Additive, touches nothing
-- else, safe to run while the old code is live.
-- ============================================================================

drop policy if exists reactions_update on public.entry_reactions;
create policy reactions_update on public.entry_reactions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_active());

-- Verify: expect 5 policies on entry_reactions.
select count(*) as policies
from pg_policies
where schemaname = 'public' and tablename = 'entry_reactions';
