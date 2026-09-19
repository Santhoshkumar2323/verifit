create extension if not exists vector
with schema extensions;

create type public.user_role as enum (
    'USER',
    'PROFESSIONAL',
    'ADMIN'
);

create type public.verification_status as enum (
    'PENDING',
    'SUPPORTED',
    'MIXED',
    'UNSUPPORTED',
    'NEEDS_REVIEW'
);

create type public.credential_status as enum (
    'PENDING',
    'VERIFIED',
    'REJECTED'
);

create type public.booking_status as enum (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED'
);


create table public.users (
    id uuid primary key
        references auth.users(id)
        on delete cascade,

    display_name text not null,

    avatar_url text,

    role public.user_role not null default 'USER',

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

create table public.professionals (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null unique
        references public.users(id)
        on delete cascade,

    specialization text not null,

    bio text,

    experience_years integer
        check (experience_years >= 0),

    verification_status public.credential_status
        not null default 'PENDING',

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


create table public.posts (
    id uuid primary key default gen_random_uuid(),

    author_id uuid not null
        references public.users(id)
        on delete cascade,

    title text not null,

    content text not null,

    category text,

    image_url text,

    embedding extensions.vector(1536),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


create table public.fact_checks (
    id uuid primary key default gen_random_uuid(),

    post_id uuid not null unique
        references public.posts(id)
        on delete cascade,

    status public.verification_status
        not null default 'PENDING',

    summary text,

    confidence numeric(5,4)
        check (
            confidence is null
            or (confidence >= 0 and confidence <= 1)
        ),

    model_name text,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


create table public.evidence (
    id uuid primary key default gen_random_uuid(),

    fact_check_id uuid not null
        references public.fact_checks(id)
        on delete cascade,

    source_name text not null,

    source_url text not null,

    title text,

    relevance text,

    embedding extensions.vector(1536),

    created_at timestamptz not null default now()
);


create table public.votes (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    post_id uuid not null
        references public.posts(id)
        on delete cascade,

    vote_type smallint not null default 1
        check (vote_type in (-1, 1)),

    created_at timestamptz not null default now(),

    unique(user_id, post_id)
);


create table public.credentials (
    id uuid primary key default gen_random_uuid(),

    professional_id uuid not null
        references public.professionals(id)
        on delete cascade,

    credential_name text not null,

    credential_type text,

    issuer text,

    credential_number text,

    document_url text,

    status public.credential_status
        not null default 'PENDING',

    submitted_at timestamptz not null default now(),

    verified_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);



create table public.bookings (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    professional_id uuid not null
        references public.professionals(id)
        on delete cascade,

    requested_at timestamptz not null,

    message text,

    status public.booking_status
        not null default 'PENDING',

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


create index professionals_user_id_idx
on public.professionals(user_id);

create index posts_author_id_idx
on public.posts(author_id);

create index posts_category_idx
on public.posts(category);

create index posts_created_at_idx
on public.posts(created_at desc);

create index fact_checks_post_id_idx
on public.fact_checks(post_id);

create index evidence_fact_check_id_idx
on public.evidence(fact_check_id);

create index votes_post_id_idx
on public.votes(post_id);

create index votes_user_id_idx
on public.votes(user_id);

create index credentials_professional_id_idx
on public.credentials(professional_id);

create index bookings_user_id_idx
on public.bookings(user_id);

create index bookings_professional_id_idx
on public.bookings(professional_id);

create index bookings_status_idx
on public.bookings(status);


create index posts_embedding_idx
on public.posts
using hnsw (embedding vector_cosine_ops);

create index evidence_embedding_idx
on public.evidence
using hnsw (embedding vector_cosine_ops);

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


create trigger users_updated_at
before update on public.users
for each row
execute function public.update_updated_at();

create trigger professionals_updated_at
before update on public.professionals
for each row
execute function public.update_updated_at();

create trigger posts_updated_at
before update on public.posts
for each row
execute function public.update_updated_at();

create trigger fact_checks_updated_at
before update on public.fact_checks
for each row
execute function public.update_updated_at();

create trigger credentials_updated_at
before update on public.credentials
for each row
execute function public.update_updated_at();

create trigger bookings_updated_at
before update on public.bookings
for each row
execute function public.update_updated_at();


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

    insert into public.users (
        id,
        display_name
    )
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data ->> 'display_name',
            split_part(new.email, '@', 1)
        )
    );

    return new;

end;
$$;


create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


alter table public.users enable row level security;
alter table public.professionals enable row level security;
alter table public.posts enable row level security;
alter table public.fact_checks enable row level security;
alter table public.evidence enable row level security;
alter table public.votes enable row level security;
alter table public.credentials enable row level security;
alter table public.bookings enable row level security;



create policy "Authenticated users can view profiles"
on public.users
for select
to authenticated
using (true);


create policy "Users can update their own profile"
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);


create policy "Authenticated users can view professionals"
on public.professionals
for select
to authenticated
using (true);


create policy "Users can create their professional profile"
on public.professionals
for insert
to authenticated
with check ((select auth.uid()) = user_id);


create policy "Professionals can update their own profile"
on public.professionals
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


create policy "Authenticated users can view posts"
on public.posts
for select
to authenticated
using (true);


create policy "Users can create their own posts"
on public.posts
for insert
to authenticated
with check (
    (select auth.uid()) = author_id
);


create policy "Authors can update their own posts"
on public.posts
for update
to authenticated
using (
    (select auth.uid()) = author_id
)
with check (
    (select auth.uid()) = author_id
);


create policy "Authors can delete their own posts"
on public.posts
for delete
to authenticated
using (
    (select auth.uid()) = author_id
);


create policy "Authenticated users can view fact checks"
on public.fact_checks
for select
to authenticated
using (true);


create policy "Authenticated users can view evidence"
on public.evidence
for select
to authenticated
using (true);


create policy "Authenticated users can view votes"
on public.votes
for select
to authenticated
using (true);


create policy "Users can create their own votes"
on public.votes
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


create policy "Users can change their own votes"
on public.votes
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


create policy "Users can delete their own votes"
on public.votes
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);


create policy "Authenticated users can view credentials"
on public.credentials
for select
to authenticated
using (true);


create policy "Professionals can submit credentials"
on public.credentials
for insert
to authenticated
with check (
    exists (
        select 1
        from public.professionals p
        where p.id = professional_id
        and p.user_id = (select auth.uid())
    )
);


create policy "Professionals can update their credentials"
on public.credentials
for update
to authenticated
using (
    exists (
        select 1
        from public.professionals p
        where p.id = professional_id
        and p.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.professionals p
        where p.id = professional_id
        and p.user_id = (select auth.uid())
    )
);


create policy "Users can view their bookings"
on public.bookings
for select
to authenticated
using (
    (select auth.uid()) = user_id
    or
    exists (
        select 1
        from public.professionals p
        where p.id = professional_id
        and p.user_id = (select auth.uid())
    )
);


create policy "Users can create bookings"
on public.bookings
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


create policy "Users can update their bookings"
on public.bookings
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);

-- ============================================================
-- COMMENTS
-- ============================================================

create table public.comments (
    id uuid primary key default gen_random_uuid(),

    post_id uuid not null
        references public.posts(id)
        on delete cascade,

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    content text not null
        check (length(trim(content)) > 0),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- ============================================================
-- COMMENTS INDEXES
-- ============================================================

create index comments_post_id_idx
on public.comments(post_id);

create index comments_user_id_idx
on public.comments(user_id);


-- ============================================================
-- COMMENTS UPDATED_AT TRIGGER
-- ============================================================

create trigger comments_updated_at
before update on public.comments
for each row
execute function public.update_updated_at();


-- ============================================================
-- COMMENTS ROW LEVEL SECURITY
-- ============================================================

alter table public.comments
enable row level security;


-- Authenticated users can read comments
create policy "Authenticated users can view comments"
on public.comments
for select
to authenticated
using (true);


-- Users can create comments as themselves
create policy "Users can create their own comments"
on public.comments
for insert
to authenticated
with check (
    (select auth.uid()) = user_id
);


-- Users can update only their own comments
create policy "Users can update their own comments"
on public.comments
for update
to authenticated
using (
    (select auth.uid()) = user_id
)
with check (
    (select auth.uid()) = user_id
);


-- Users can delete only their own comments
create policy "Users can delete their own comments"
on public.comments
for delete
to authenticated
using (
    (select auth.uid()) = user_id
);



-- ============================================================
-- VERIFIT STORAGE
-- ============================================================

-- ------------------------------------------------------------
-- STORAGE BUCKETS
-- ------------------------------------------------------------

insert into storage.buckets (
    id,
    name,
    public
)
values
    ('profile-images', 'profile-images', true),
    ('post-images', 'post-images', true),
    ('videos', 'videos', true),
    ('credential-documents', 'credential-documents', false)
on conflict (id) do update
set public = excluded.public;


-- ============================================================
-- PROFILE IMAGES
-- ============================================================

create policy "Authenticated users can upload profile images"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);


create policy "Authenticated users can update their profile images"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);


create policy "Authenticated users can delete their profile images"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);


-- ============================================================
-- POST IMAGES
-- ============================================================

create policy "Authenticated users can upload post images"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);


create policy "Authenticated users can update their post images"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);


create policy "Authenticated users can delete their post images"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);


-- ============================================================
-- VIDEOS
-- ============================================================

create policy "Authenticated users can upload videos"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);


create policy "Authenticated users can update their videos"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);


create policy "Authenticated users can delete their videos"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);


-- ============================================================
-- CREDENTIAL DOCUMENTS
-- PRIVATE BUCKET
-- ============================================================

create policy "Professionals can upload credential documents"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'credential-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
        select 1
        from public.professionals p
        where p.user_id = (select auth.uid())
    )
);


create policy "Professionals can view their credential documents"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'credential-documents'
    and (
        (storage.foldername(name))[1] = (select auth.uid()::text)
        or
        exists (
            select 1
            from public.users u
            where u.id = (select auth.uid())
            and u.role = 'ADMIN'
        )
    )
);


create policy "Professionals can update their credential documents"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'credential-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
    bucket_id = 'credential-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);


create policy "Professionals can delete their credential documents"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'credential-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);