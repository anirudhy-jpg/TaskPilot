-- Migration: Enable realtime replication for workspace_members table
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'workspace_members'
  ) then
    alter publication supabase_realtime add table workspace_members;
  end if;
end $$;
