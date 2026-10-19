-- Created with Supabase CLI; additive. Existing profiles are left unclassified.
alter table public.children add column puberty_guide text
  constraint children_puberty_guide_check check (puberty_guide in ('girls', 'boys'));
comment on column public.children.puberty_guide is 'Optional parent-selected educational guide. Not a medical sex reference or a shopping preference.';
