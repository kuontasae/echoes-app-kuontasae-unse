do $$
begin
  if to_regclass('public.articles') is not null then
    revoke select on table public.articles from anon, authenticated;
    grant select (id, title, content, price, cover_url, author_id, created_at)
      on public.articles to anon, authenticated;
  end if;
end $$;
