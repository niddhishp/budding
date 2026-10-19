-- Created with Supabase CLI. Never infer a profile detail from a reading choice.
alter table public.children add column gender text
  constraint children_gender_check check (gender in ('boy', 'girl'));
comment on column public.children.gender is 'Optional parent-provided Boy/Girl profile detail. Not the clinical chart reference; never inferred from names or reading choices.';
