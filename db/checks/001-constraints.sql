-- Tribunal — does the database refuse what it is supposed to refuse?
--
-- This tests the constraints themselves, not the code in front of them. It writes
-- a case, a deliberation and a set of deliberately bad rows, records what happened
-- to each, and removes everything it created before it finishes. Nothing is left
-- behind and no existing row is touched.
--
-- Run it in the Supabase SQL editor. The result is a grid of seven rows, and every
-- outcome should read PASS.

create temporary table if not exists check_results (
  n        int,
  rule     text,
  expected text,
  outcome  text
);
truncate check_results;

do $$
declare
  v_case  uuid;
  v_delib uuid;
begin
  insert into public.cases (reference, accused, act_alleged, background, agreed_facts, question)
  values (
    'TEST-CONSTRAINTS',
    'a name',
    'an act alleged of at least ten words written out here for the check',
    'background text',
    array['first agreed fact', 'second agreed fact', 'third agreed fact'],
    'was it justified?'
  )
  returning id into v_case;

  insert into public.deliberations (case_id, status)
  values (v_case, 'running')
  returning id into v_delib;

  -- 1 -------------------------------------------------------------------------
  begin
    insert into public.calls (deliberation_id, seq, role, agent, seat, status,
                              model_requested, verdict, reasons)
    values (v_delib, 1, 'judge', 'barak', null, 'failed',
            'test/model', 'justified', array['one', 'two']);
    insert into check_results values (1, 'a failed call carries a verdict', 'refused', 'FAIL - it was accepted');
  exception when others then
    insert into check_results values (1, 'a failed call carries a verdict', 'refused', 'PASS - ' || sqlstate);
  end;

  -- 2 -------------------------------------------------------------------------
  begin
    insert into public.calls (deliberation_id, seq, role, agent, seat, status,
                              model_requested, model_answered, verdict, reasons)
    values (v_delib, 2, 'advocate', 'jon', 'defence', 'complete',
            'test/model', 'test/model', 'justified', array['one', 'two']);
    insert into check_results values (2, 'an advocate carries a verdict', 'refused', 'FAIL - it was accepted');
  exception when others then
    insert into check_results values (2, 'an advocate carries a verdict', 'refused', 'PASS - ' || sqlstate);
  end;

  -- 3 -------------------------------------------------------------------------
  begin
    insert into public.calls (deliberation_id, seq, role, agent, seat, status,
                              model_requested, model_answered, position, reasons, controlling_ground)
    values (v_delib, 3, 'judge', 'elon', null, 'complete',
            'test/model', 'test/model', 'justified', array['one', 'two'], 'a ground');
    insert into check_results values (3, 'a judge carries a position', 'refused', 'FAIL - it was accepted');
  exception when others then
    insert into check_results values (3, 'a judge carries a position', 'refused', 'PASS - ' || sqlstate);
  end;

  -- 4 -------------------------------------------------------------------------
  begin
    insert into public.calls (deliberation_id, seq, role, agent, seat, status,
                              model_requested, model_answered, position, reasons)
    values (v_delib, 4, 'advocate', 'tyrion', 'defence', 'complete',
            'test/model', 'test/model', 'justified', array['only one reason']);
    insert into check_results values (4, 'a complete call gives one reason', 'refused', 'FAIL - it was accepted');
  exception when others then
    insert into check_results values (4, 'a complete call gives one reason', 'refused', 'PASS - ' || sqlstate);
  end;

  -- 5 -------------------------------------------------------------------------
  begin
    insert into public.calls (deliberation_id, seq, role, agent, seat, status,
                              model_requested, model_answered, reasons)
    values (v_delib, 5, 'advocate', 'daenerys', 'prosecution', 'complete',
            'test/model', 'test/model', array['one', 'two']);
    insert into check_results values (5, 'a complete advocate omits its position', 'refused', 'FAIL - it was accepted');
  exception when others then
    insert into check_results values (5, 'a complete advocate omits its position', 'refused', 'PASS - ' || sqlstate);
  end;

  -- 6 -------------------------------------------------------------------------
  begin
    insert into public.calls (deliberation_id, seq, role, agent, seat, status, model_requested)
    values (v_delib, 9, 'advocate', 'grey_worm', 'prosecution', 'malformed', 'test/model');
    insert into check_results values (6, 'a ninth call in one deliberation', 'refused', 'FAIL - it was accepted');
  exception when others then
    insert into check_results values (6, 'a ninth call in one deliberation', 'refused', 'PASS - ' || sqlstate);
  end;

  -- 7 -------------------------------------------------------------------------
  insert into public.calls (deliberation_id, seq, role, agent, seat, status,
                            model_requested, is_retry)
  values (v_delib, 6, 'advocate', 'jon', 'defence', 'failed', 'test/model', true);
  begin
    insert into public.calls (deliberation_id, seq, role, agent, seat, status,
                              model_requested, is_retry)
    values (v_delib, 7, 'advocate', 'tyrion', 'defence', 'failed', 'test/model', true);
    insert into check_results values (7, 'a second retry in one deliberation', 'refused', 'FAIL - it was accepted');
  exception when others then
    insert into check_results values (7, 'a second retry in one deliberation', 'refused', 'PASS - ' || sqlstate);
  end;

  -- everything this check created is removed here -----------------------------
  delete from public.calls         where deliberation_id = v_delib;
  delete from public.deliberations where id = v_delib;
  delete from public.cases         where id = v_case;
end $$;

select n, rule, expected, outcome from check_results order by n;
