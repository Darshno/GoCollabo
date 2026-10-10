begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'creator-a@example.test', '', now(), '{}', '{"name":"Creator A"}', now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'creator-b@example.test', '', now(), '{}', '{"name":"Creator B"}', now(), now()),
  ('20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'brand-a@example.test', '', now(), '{}', '{"name":"Brand A"}', now(), now()),
  ('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'brand-b@example.test', '', now(), '{}', '{"name":"Brand B"}', now(), now());

update public.profiles set account_type = 'brand'
where id in ('20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002');

insert into public.creator_profiles (id, user_id, slug, name, headline, bio, location, work_mode, published)
values
  (11, '10000000-0000-4000-8000-000000000001', 'creator-a', 'Creator A', 'A creator headline', 'A creator bio with details.', 'Remote', 'remote', true),
  (12, '10000000-0000-4000-8000-000000000002', 'creator-b', 'Creator B', 'A creator headline', 'A private creator bio.', 'Remote', 'remote', false);

insert into public.portfolio_projects (id, creator_id, title, published)
values
  (101, 11, 'Creator A public project', true),
  (102, 11, 'Creator A private project', false),
  (103, 12, 'Creator B project', true);

insert into public.briefs (id, brand_id, title, objective, content_type, style, audience, platform, duration, aspect_ratio, deliverables, budget, deadline, location, work_mode, licensing, status)
values
  (201, '20000000-0000-4000-8000-000000000001', 'Brand A published', 'Objective', 'Film', 'Style', 'Audience', 'Site', '30 seconds', '16:9', 1, '$1000', '2026-12-01', 'Remote', 'remote', 'Discuss', 'published'),
  (202, '20000000-0000-4000-8000-000000000001', 'Brand A draft', 'Objective', 'Film', 'Style', 'Audience', 'Site', '30 seconds', '16:9', 1, '$1000', '2026-12-01', 'Remote', 'remote', 'Discuss', 'draft'),
  (203, '20000000-0000-4000-8000-000000000002', 'Brand B draft', 'Objective', 'Film', 'Style', 'Audience', 'Site', '30 seconds', '16:9', 1, '$1000', '2026-12-01', 'Remote', 'remote', 'Discuss', 'draft');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::int from public.creator_profiles), 1, 'anonymous users read published creator profiles only');
select is((select count(*)::int from public.portfolio_projects), 1, 'anonymous users read published projects of published creators only');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*)::int from public.portfolio_projects where creator_id = 11), 2, 'creator reads own published and private projects');
select is((with changed as (update public.portfolio_projects set title = 'stolen' where id = 103 returning id) select count(*)::int from changed), 0, 'creator cannot update another creator project');
select throws_ok($$update public.profiles set account_type = 'admin' where id = auth.uid()$$, '42501', null, 'profile policy prevents self-granting admin');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select is((select count(*)::int from public.briefs where status = 'draft'), 1, 'brand reads its own draft brief');
select is((select count(*)::int from public.briefs where id = 203), 0, 'brand cannot read another brand draft');
select is((with changed as (update public.briefs set title = 'stolen' where id = 203 returning id) select count(*)::int from changed), 0, 'brand cannot update another brand brief');
select lives_ok($$insert into public.collaboration_requests (brief_id, brand_id, creator_id, message) values (201, auth.uid(), 11, 'A valid collaboration request')$$, 'brand can request a published creator for its published brief');
select is((select count(*)::int from public.collaboration_requests), 1, 'brand reads its own collaboration request');
select lives_ok($$insert into public.saved_creators (brand_id, creator_id) values (auth.uid(), 11)$$, 'brand can save a published creator');
select throws_ok($$insert into public.saved_creators (brand_id, creator_id) values (auth.uid(), 11)$$, '23505', null, 'duplicate saved creator is rejected');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select is((select count(*)::int from public.collaboration_requests), 0, 'unrelated brand cannot read a collaboration request');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*)::int from public.collaboration_requests), 1, 'relevant creator can read the request');
select is((with changed as (update public.collaboration_requests set status = 'accepted' where id = 1 returning id) select count(*)::int from changed), 1, 'request creator can accept a pending request');
select is((select status from public.collaboration_requests where id = 1), 'accepted', 'accepted request state persists');
select throws_ok($$update public.collaboration_requests set status = 'sent' where id = 1$$, '23514', null, 'request status cannot transition back to sent');
reset role;

select * from finish();
rollback;
