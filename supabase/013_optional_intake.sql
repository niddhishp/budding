-- Additive only: legacy rows retain all their values and a NULL marker.
alter table public.children add column intake_answered text[];
alter table public.children add constraint children_intake_answered_valid check (
  intake_answered is null or (
    cardinality(intake_answered) <= 6
    and array_position(intake_answered, null) is null
    and intake_answered <@ array['sensitivity','emotionalIntensity','flexibility','persistence','sociability','curiosity']::text[]
  )
);
comment on column public.children.intake_answered is 'NULL: legacy intake; empty: no observations; keys: explicitly answered dimensions. Existing ownership RLS applies.';
