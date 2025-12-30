-- Create blog_posts table for SEO/blog engine
create extension if not exists "pgcrypto";

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  body_html text,
  tags text[] default '{}',
  cover_image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.trigger_set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_timestamp on public.blog_posts;
create trigger set_timestamp
before update on public.blog_posts
for each row
execute function public.trigger_set_timestamp();
