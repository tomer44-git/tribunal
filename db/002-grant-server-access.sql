-- Tribunal — give the server, and only the server, access to the three tables.
--
-- The project was created with "automatically expose new tables" off, which is
-- what we wanted: no table reaches the Data API unless it is granted on purpose.
-- The side effect is that nothing was granted at all, so the server's own key was
-- refused too. This grants what the application actually does and nothing more.
--
-- anon and authenticated are deliberately not mentioned. They stay with no
-- privileges at all, which is a second wall in front of row-level security.

begin;

grant usage on schema public to service_role;

-- A charge sheet is written once and read afterwards. It is never edited.
grant select, insert on public.cases to service_role;

-- A run is created, then moved from running to complete or failed.
grant select, insert, update on public.deliberations to service_role;

-- A call is written once as it returns and is never touched again.
grant select, insert on public.calls to service_role;

-- No delete is granted anywhere. The server holds the record of every model call
-- and cannot remove any part of it. Anything that genuinely has to be deleted is
-- deleted by hand, in the SQL editor, by someone who meant it.

commit;
