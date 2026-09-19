from datetime import datetime
from typing import Optional


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------

def _first_or_none(data):
    if not data:
        return None

    if isinstance(data, list):
        return data[0] if data else None

    if isinstance(data, dict):
        return data

    return None


def _normalize_verification_status(status: Optional[str]) -> str:
    """
    Convert backend/database verification values into the values
    expected by the frontend Verification component.
    """

    if not status:
        return "unverified"

    normalized = str(status).upper()

    mapping = {
        "VERIFIED": "verified",
        "SUPPORTED": "verified",
        "MIXED": "reviewed",
        "NEEDS_REVIEW": "pending",
        "PENDING": "pending",
        "UNSUPPORTED": "unverified",
        "REJECTED": "unverified",
    }

    return mapping.get(normalized, "unverified")


def _build_author(user: Optional[dict]) -> dict:
    """
    Convert a database user record into the API's author shape.
    """

    if not user:
        return {
            "id": "",
            "display_name": "Unknown user",
            "avatar_url": None,
            "role": "USER",
        }

    return {
        "id": user.get("id", ""),
        "display_name": user.get("display_name", "Unknown user"),
        "avatar_url": user.get("avatar_url"),
        "role": user.get("role", "USER"),
    }


def _build_fact_check(fact_check: Optional[dict]) -> Optional[dict]:
    """
    Convert a database fact-check record into the frontend API shape.
    """

    if not fact_check:
        return None

    return {
        "status": _normalize_verification_status(
            fact_check.get("status")
        ),
        "summary": fact_check.get("summary"),
        "confidence": fact_check.get("confidence"),
        "model_name": fact_check.get("model_name"),
    }


def _build_post(
    post: dict,
    author: Optional[dict] = None,
    fact_check: Optional[dict] = None,
    votes: int = 0,
    comments: int = 0,
) -> dict:
    """
    Convert a database post record into the API response shape.
    """

    return {
        "id": post["id"],
        "author": _build_author(author),
        "title": post["title"],
        "content": post["content"],
        "category": post.get("category"),
        "image_url": post.get("image_url"),
        "created_at": post["created_at"],
        "votes": votes,
        "comments": comments,
        "fact_check": _build_fact_check(fact_check),
    }


def _build_credential(credential: dict) -> dict:
    """
    Convert a database credential into the API response shape.
    """

    return {
        "id": credential["id"],
        "credential_name": credential["credential_name"],
        "credential_type": credential.get("credential_type"),
        "issuer": credential.get("issuer"),
        "credential_number": credential.get("credential_number"),
        "document_url": credential.get("document_url"),
        "status": credential.get("status", "PENDING"),
        "submitted_at": credential["submitted_at"],
        "verified_at": credential.get("verified_at"),
        "created_at": credential.get("created_at"),
        "updated_at": credential.get("updated_at"),
    }


def _build_professional(
    professional: dict,
    user: Optional[dict] = None,
    credentials: Optional[list] = None,
) -> dict:
    """
    Convert a database professional record into the API response shape.
    """

    verification_status = professional.get(
        "verification_status",
        "PENDING",
    )

    credential_list = credentials or []

    return {
        "id": professional["id"],
        "user_id": professional["user_id"],
        "name": (
            user.get("display_name")
            if user
            else "Unknown professional"
        ),
        "avatar_url": (
            user.get("avatar_url")
            if user
            else None
        ),
        "specialization": professional["specialization"],
        "bio": professional.get("bio"),
        "experience_years": professional.get(
            "experience_years",
            0,
        ),
        "verified": verification_status == "VERIFIED",
        "verification_status": verification_status,
        "credentials": [
            _build_credential(item)
            for item in credential_list
        ],
    }


def _build_comment(
    comment: dict,
    author: Optional[dict] = None,
) -> dict:
    """
    Convert a database comment record into the API response shape.
    """

    return {
        "id": comment["id"],
        "post_id": comment["post_id"],
        "author": _build_author(author),
        "content": comment["content"],
        "created_at": comment["created_at"],
        "updated_at": comment["updated_at"],
    }


def _get_comment_count(
    supabase,
    post_id: str,
) -> int:
    """
    Return the number of comments belonging to a post.
    """

    result = (
        supabase
        .table("comments")
        .select(
            "id",
            count="exact",
        )
        .eq("post_id", post_id)
        .execute()
    )

    return result.count or 0


# ---------------------------------------------------------------------------
# Posts
# ---------------------------------------------------------------------------

def get_posts(
    supabase,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
):
    """
    Fetch posts together with their authors, fact-checks,
    vote counts and comment counts.
    """

    query = (
        supabase
        .table("posts")
        .select(
            "id,author_id,title,content,category,image_url,created_at,updated_at",
            count="exact",
        )
    )

    if category:
        query = query.eq("category", category)

    if search:
        search_text = search.strip()

        if search_text:
            query = query.or_(
                f"title.ilike.%{search_text}%,"
                f"content.ilike.%{search_text}%"
            )

    query = (
        query
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )

    posts_result = query.execute()

    posts = posts_result.data or []

    if not posts:
        return posts_result

    formatted_posts = []

    for post in posts:
        author_result = (
            supabase
            .table("users")
            .select(
                "id,display_name,avatar_url,role"
            )
            .eq("id", post["author_id"])
            .limit(1)
            .execute()
        )

        author = _first_or_none(author_result.data)

        fact_check_result = (
            supabase
            .table("fact_checks")
            .select(
                "status,summary,confidence,model_name"
            )
            .eq("post_id", post["id"])
            .limit(1)
            .execute()
        )

        fact_check = _first_or_none(
            fact_check_result.data
        )

        votes_result = (
            supabase
            .table("votes")
            .select(
                "id",
                count="exact",
            )
            .eq("post_id", post["id"])
            .eq("vote_type", 1)
            .execute()
        )

        votes = votes_result.count or 0

        comments = _get_comment_count(
            supabase=supabase,
            post_id=post["id"],
        )

        formatted_posts.append(
            _build_post(
                post=post,
                author=author,
                fact_check=fact_check,
                votes=votes,
                comments=comments,
            )
        )

    posts_result.data = formatted_posts

    return posts_result


def get_post_by_id(
    supabase,
    post_id: str,
):
    """
    Fetch one post with author, fact-check, vote count
    and comment count.
    """

    post_result = (
        supabase
        .table("posts")
        .select(
            "id,author_id,title,content,category,image_url,created_at,updated_at"
        )
        .eq("id", post_id)
        .limit(1)
        .execute()
    )

    post = _first_or_none(post_result.data)

    if not post:
        return post_result

    author_result = (
        supabase
        .table("users")
        .select(
            "id,display_name,avatar_url,role"
        )
        .eq("id", post["author_id"])
        .limit(1)
        .execute()
    )

    author = _first_or_none(author_result.data)

    fact_check_result = (
        supabase
        .table("fact_checks")
        .select(
            "status,summary,confidence,model_name"
        )
        .eq("post_id", post_id)
        .limit(1)
        .execute()
    )

    fact_check = _first_or_none(
        fact_check_result.data
    )

    votes_result = (
        supabase
        .table("votes")
        .select(
            "id",
            count="exact",
        )
        .eq("post_id", post_id)
        .eq("vote_type", 1)
        .execute()
    )

    votes = votes_result.count or 0

    comments = _get_comment_count(
        supabase=supabase,
        post_id=post_id,
    )

    post_result.data = [
        _build_post(
            post=post,
            author=author,
            fact_check=fact_check,
            votes=votes,
            comments=comments,
        )
    ]

    return post_result


def create_post(
    supabase,
    author_id: str,
    title: str,
    content: str,
    category: Optional[str] = None,
    image_url: Optional[str] = None,
):
    """
    Create a post for the authenticated user.

    IMPORTANT:
    This function explicitly accepts title/content/category/image_url
    because backend/posts.py passes these keyword arguments.
    """

    post_data = {
        "author_id": author_id,
        "title": title.strip(),
        "content": content.strip(),
        "category": (
            category.strip()
            if category
            else None
        ),
        "image_url": (
            image_url.strip()
            if image_url
            else None
        ),
    }

    result = (
        supabase
        .table("posts")
        .insert(post_data)
        .execute()
    )

    return result


def upvote_post(
    supabase,
    user_id: str,
    post_id: str,
):
    """
    Add one upvote for a user/post pair.

    The database has a unique(user_id, post_id) constraint,
    so the same user cannot create multiple votes.
    """

    existing_vote = (
        supabase
        .table("votes")
        .select("id,vote_type")
        .eq("user_id", user_id)
        .eq("post_id", post_id)
        .limit(1)
        .execute()
    )

    if existing_vote.data:
        votes_result = (
            supabase
            .table("votes")
            .select(
                "id",
                count="exact",
            )
            .eq("post_id", post_id)
            .eq("vote_type", 1)
            .execute()
        )

        return {
            "post_id": post_id,
            "votes": votes_result.count or 0,
        }

    (
        supabase
        .table("votes")
        .insert(
            {
                "user_id": user_id,
                "post_id": post_id,
                "vote_type": 1,
            }
        )
        .execute()
    )

    votes_result = (
        supabase
        .table("votes")
        .select(
            "id",
            count="exact",
        )
        .eq("post_id", post_id)
        .eq("vote_type", 1)
        .execute()
    )

    return {
        "post_id": post_id,
        "votes": votes_result.count or 0,
    }


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

def get_comments(
    supabase,
    post_id: str,
    limit: int = 50,
    offset: int = 0,
):
    """
    Fetch comments for a post together with their authors.
    """

    comments_result = (
        supabase
        .table("comments")
        .select(
            "id,post_id,user_id,content,created_at,updated_at",
            count="exact",
        )
        .eq("post_id", post_id)
        .order("created_at", desc=False)
        .range(offset, offset + limit - 1)
        .execute()
    )

    comments = comments_result.data or []

    formatted_comments = []

    for comment in comments:
        author_result = (
            supabase
            .table("users")
            .select(
                "id,display_name,avatar_url,role"
            )
            .eq("id", comment["user_id"])
            .limit(1)
            .execute()
        )

        author = _first_or_none(author_result.data)

        formatted_comments.append(
            _build_comment(
                comment=comment,
                author=author,
            )
        )

    return {
        "comments": formatted_comments,
        "total": comments_result.count or 0,
    }


def create_comment(
    supabase,
    user_id: str,
    post_id: str,
    content: str,
):
    """
    Create a comment for the authenticated user.

    user_id comes from the authenticated backend session.
    It is never accepted from the frontend request body.
    """

    cleaned_content = content.strip()

    if not cleaned_content:
        raise ValueError(
            "Comment content cannot be empty."
        )

    comment_data = {
        "post_id": post_id,
        "user_id": user_id,
        "content": cleaned_content,
    }

    result = (
        supabase
        .table("comments")
        .insert(comment_data)
        .execute()
    )

    comment = _first_or_none(result.data)

    if not comment:
        raise ValueError(
            "Comment could not be created."
        )

    author_result = (
        supabase
        .table("users")
        .select(
            "id,display_name,avatar_url,role"
        )
        .eq("id", user_id)
        .limit(1)
        .execute()
    )

    author = _first_or_none(
        author_result.data
    )

    return _build_comment(
        comment=comment,
        author=author,
    )


def delete_comment(
    supabase,
    user_id: str,
    comment_id: str,
):
    """
    Delete a comment only when it belongs to the authenticated user.

    The backend uses the service-role Supabase client, so ownership
    must be explicitly enforced here rather than relying on RLS.
    """

    result = (
        supabase
        .table("comments")
        .delete()
        .eq("id", comment_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not result.data:
        return False

    return True


# ---------------------------------------------------------------------------
# Professionals
# ---------------------------------------------------------------------------

def get_professionals(
    supabase,
    specialization: Optional[str] = None,
    search: Optional[str] = None,
):
    """
    Fetch professional profiles with their credentials.
    """

    query = (
        supabase
        .table("professionals")
        .select(
            "id,user_id,specialization,bio,experience_years,"
            "verification_status,created_at,updated_at"
        )
        .order("created_at", desc=True)
    )

    if specialization:
        query = query.ilike(
            "specialization",
            f"%{specialization.strip()}%",
        )

    professionals_result = query.execute()

    professionals = professionals_result.data or []

    formatted = []

    for professional in professionals:
        user_result = (
            supabase
            .table("users")
            .select(
                "id,display_name,avatar_url,role"
            )
            .eq("id", professional["user_id"])
            .limit(1)
            .execute()
        )

        user = _first_or_none(user_result.data)

        if search:
            search_text = search.strip().lower()

            searchable_text = " ".join(
                [
                    str(
                        user.get(
                            "display_name",
                            "",
                        )
                    )
                    if user
                    else "",
                    str(
                        professional.get(
                            "specialization",
                            "",
                        )
                    ),
                    str(
                        professional.get(
                            "bio",
                            "",
                        )
                    ),
                ]
            ).lower()

            if search_text not in searchable_text:
                continue

        credentials_result = (
            supabase
            .table("credentials")
            .select(
                "id,credential_name,credential_type,issuer,"
                "credential_number,document_url,status,"
                "submitted_at,verified_at"
            )
            .eq(
                "professional_id",
                professional["id"],
            )
            .order(
                "created_at",
                desc=True,
            )
            .execute()
        )

        credentials = credentials_result.data or []

        formatted.append(
            _build_professional(
                professional=professional,
                user=user,
                credentials=credentials,
            )
        )

    professionals_result.data = formatted

    return professionals_result


def get_professional_by_id(
    supabase,
    professional_id: str,
):
    """
    Fetch a single professional profile.
    """

    professional_result = (
        supabase
        .table("professionals")
        .select(
            "id,user_id,specialization,bio,experience_years,"
            "verification_status,created_at,updated_at"
        )
        .eq("id", professional_id)
        .limit(1)
        .execute()
    )

    professional = _first_or_none(
        professional_result.data
    )

    if not professional:
        return professional_result

    user_result = (
        supabase
        .table("users")
        .select(
            "id,display_name,avatar_url,role"
        )
        .eq("id", professional["user_id"])
        .limit(1)
        .execute()
    )

    user = _first_or_none(user_result.data)

    credentials_result = (
        supabase
        .table("credentials")
        .select(
            "id,credential_name,credential_type,issuer,"
            "credential_number,document_url,status,"
            "submitted_at,verified_at"
        )
        .eq(
            "professional_id",
            professional_id,
        )
        .order(
            "created_at",
            desc=True,
        )
        .execute()
    )

    credentials = credentials_result.data or []

    professional_result.data = [
        _build_professional(
            professional=professional,
            user=user,
            credentials=credentials,
        )
    ]

    return professional_result


# ---------------------------------------------------------------------------
# Professional registration and credentials
# ---------------------------------------------------------------------------

def create_professional(supabase, user_id: str, specialization: str, bio: Optional[str] = None, experience_years: int = 0):
    cleaned_specialization = specialization.strip()
    if not cleaned_specialization:
        raise ValueError("Specialization cannot be empty.")
    if experience_years < 0:
        raise ValueError("Experience years cannot be negative.")
    existing = (supabase.table("professionals").select("id").eq("user_id", user_id).limit(1).execute())
    if existing.data:
        raise ValueError("A professional profile already exists for this user.")
    return supabase.table("professionals").insert({
        "user_id": user_id,
        "specialization": cleaned_specialization,
        "bio": bio.strip() if bio else None,
        "experience_years": experience_years,
        "verification_status": "PENDING",
    }).execute()


def get_professional_by_user_id(supabase, user_id: str):
    return (supabase.table("professionals").select(
        "id,user_id,specialization,bio,experience_years,verification_status,created_at,updated_at"
    ).eq("user_id", user_id).limit(1).execute())


def create_credential(supabase, user_id: str, credential_name: str, credential_type: Optional[str] = None, issuer: Optional[str] = None, credential_number: Optional[str] = None, document_url: Optional[str] = None):
    cleaned_name = credential_name.strip()
    if not cleaned_name:
        raise ValueError("Credential name cannot be empty.")
    professional = _first_or_none(get_professional_by_user_id(supabase, user_id).data)
    if not professional:
        raise ValueError("Professional profile not found.")
    result = supabase.table("credentials").insert({
        "professional_id": professional["id"],
        "credential_name": cleaned_name,
        "credential_type": credential_type.strip() if credential_type else None,
        "issuer": issuer.strip() if issuer else None,
        "credential_number": credential_number.strip() if credential_number else None,
        "document_url": document_url.strip() if document_url else None,
        "status": "PENDING",
    }).execute()
    if not _first_or_none(result.data):
        raise ValueError("Credential could not be submitted.")
    return result


def get_credentials_for_user(supabase, user_id: str):
    professional = _first_or_none(get_professional_by_user_id(supabase, user_id).data)
    if not professional:
        raise ValueError("Professional profile not found.")
    return (supabase.table("credentials").select(
        "id,credential_name,credential_type,issuer,credential_number,document_url,status,submitted_at,verified_at,created_at,updated_at"
    ).eq("professional_id", professional["id"]).order("created_at", desc=True).execute())


# ---------------------------------------------------------------------------
# Admin professional verification
# ---------------------------------------------------------------------------

def _build_admin_professional(professional: dict, user: Optional[dict], credentials: list) -> dict:
    return {
        "id": professional["id"],
        "user_id": professional["user_id"],
        "name": user.get("display_name") if user else "Unknown professional",
        "avatar_url": user.get("avatar_url") if user else None,
        "specialization": professional["specialization"],
        "bio": professional.get("bio"),
        "experience_years": professional.get("experience_years", 0),
        "verification_status": professional.get("verification_status", "PENDING"),
        "credentials": [_build_credential(item) for item in credentials],
        "created_at": professional["created_at"],
        "updated_at": professional["updated_at"],
    }


def get_pending_professionals(supabase):
    result = (supabase.table("professionals").select(
        "id,user_id,specialization,bio,experience_years,verification_status,created_at,updated_at"
    ).eq("verification_status", "PENDING").order("created_at", desc=False).execute())
    formatted = []
    for professional in result.data or []:
        user = _first_or_none(supabase.table("users").select(
            "id,display_name,avatar_url,role"
        ).eq("id", professional["user_id"]).limit(1).execute().data)
        credentials = (supabase.table("credentials").select(
            "id,credential_name,credential_type,issuer,credential_number,document_url,status,submitted_at,verified_at,created_at,updated_at"
        ).eq("professional_id", professional["id"]).order("created_at", desc=True).execute().data or [])
        formatted.append(_build_admin_professional(professional, user, credentials))
    result.data = formatted
    return result


def get_admin_professional_by_id(supabase, professional_id: str):
    result = (supabase.table("professionals").select(
        "id,user_id,specialization,bio,experience_years,verification_status,created_at,updated_at"
    ).eq("id", professional_id).limit(1).execute())
    professional = _first_or_none(result.data)
    if not professional:
        return result
    user = _first_or_none(supabase.table("users").select(
        "id,display_name,avatar_url,role"
    ).eq("id", professional["user_id"]).limit(1).execute().data)
    credentials = (supabase.table("credentials").select(
        "id,credential_name,credential_type,issuer,credential_number,document_url,status,submitted_at,verified_at,created_at,updated_at"
    ).eq("professional_id", professional_id).order("created_at", desc=True).execute().data or [])
    result.data = [_build_admin_professional(professional, user, credentials)]
    return result


def update_professional_verification(supabase, professional_id: str, status: str):
    normalized = status.upper()
    if normalized not in {"VERIFIED", "REJECTED"}:
        raise ValueError("Professional status must be VERIFIED or REJECTED.")
    if not supabase.table("professionals").select("id").eq("id", professional_id).limit(1).execute().data:
        raise ValueError("Professional profile not found.")
    return supabase.table("professionals").update({"verification_status": normalized}).eq("id", professional_id).execute()


def update_credential_verification(supabase, credential_id: str, status: str):
    normalized = status.upper()
    if normalized not in {"VERIFIED", "REJECTED"}:
        raise ValueError("Credential status must be VERIFIED or REJECTED.")
    if not supabase.table("credentials").select("id").eq("id", credential_id).limit(1).execute().data:
        raise ValueError("Credential not found.")
    return supabase.table("credentials").update({
        "status": normalized,
        "verified_at": datetime.utcnow().isoformat() if normalized == "VERIFIED" else None,
    }).eq("id", credential_id).execute()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def get_user_by_id(
    supabase,
    user_id: str,
):
    """
    Fetch a public user profile.
    """

    return (
        supabase
        .table("users")
        .select(
            "id,display_name,avatar_url,role,created_at,updated_at"
        )
        .eq("id", user_id)
        .limit(1)
        .execute()
    )


def update_user(
    supabase,
    user_id: str,
    display_name: Optional[str] = None,
    avatar_url: Optional[str] = None,
):
    """
    Update the authenticated user's public profile.
    """

    update_data = {}

    if display_name is not None:
        update_data["display_name"] = display_name.strip()

    if avatar_url is not None:
        update_data["avatar_url"] = (
            avatar_url.strip()
            if avatar_url
            else None
        )

    if not update_data:
        return (
            supabase
            .table("users")
            .select(
                "id,display_name,avatar_url,role,created_at,updated_at"
            )
            .eq("id", user_id)
            .limit(1)
            .execute()
        )

    return (
        supabase
        .table("users")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

def create_booking(
    supabase,
    user_id: str,
    professional_id: str,
    requested_at: datetime,
    message: Optional[str] = None,
):
    """
    Create a booking request for an authenticated user.

    Bookings are only allowed for verified professionals.
    """

    professional_result = (
        supabase
        .table("professionals")
        .select("id, verification_status")
        .eq("id", professional_id)
        .maybe_single()
        .execute()
    )

    if not professional_result.data:
        raise ValueError("Professional not found.")

    professional = professional_result.data

    if professional["verification_status"] != "VERIFIED":
        raise ValueError(
            "Bookings are only available for verified professionals."
        )

    booking_data = {
        "user_id": user_id,
        "professional_id": professional_id,
        "requested_at": requested_at.isoformat(),
        "message": (
            message.strip()
            if message
            else None
        ),
        "status": "PENDING",
    }

    return (
        supabase
        .table("bookings")
        .insert(booking_data)
        .execute()
    )


def get_bookings_for_user(
    supabase,
    user_id: str,
):
    """
    Return all bookings created by the authenticated user.
    """

    return (
        supabase
        .table("bookings")
        .select(
            "id, professional_id, status, message, requested_at"
        )
        .eq("user_id", user_id)
        .order("requested_at", desc=True)
        .execute()
    )


def get_bookings_for_professional(
    supabase,
    user_id: str,
):
    """
    Return all bookings received by the authenticated professional.
    """

    professional_result = (
        supabase
        .table("professionals")
        .select("id")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if not professional_result.data:
        raise ValueError("Professional profile not found.")

    professional_id = professional_result.data["id"]

    return (
        supabase
        .table("bookings")
        .select(
            "id, professional_id, status, message, requested_at"
        )
        .eq("professional_id", professional_id)
        .order("requested_at", desc=True)
        .execute()
    )


def update_booking_status(
    supabase,
    booking_id: str,
    status: str,
):
    """
    Update a booking status while enforcing valid state transitions.

    Allowed lifecycle:

        PENDING
            -> CONFIRMED
            -> CANCELLED

        CONFIRMED
            -> COMPLETED
            -> CANCELLED

        COMPLETED
            -> terminal state

        CANCELLED
            -> terminal state
    """

    allowed_statuses = {
        "PENDING",
        "CONFIRMED",
        "CANCELLED",
        "COMPLETED",
    }

    normalized_status = status.strip().upper()

    if normalized_status not in allowed_statuses:
        raise ValueError("Invalid booking status.")

    booking_result = (
        supabase
        .table("bookings")
        .select("id,status")
        .eq("id", booking_id)
        .maybe_single()
        .execute()
    )

    if not booking_result.data:
        raise ValueError("Booking not found.")

    current_status = booking_result.data["status"]

    allowed_transitions = {
        "PENDING": {
            "CONFIRMED",
            "CANCELLED",
        },
        "CONFIRMED": {
            "COMPLETED",
            "CANCELLED",
        },
        "CANCELLED": set(),
        "COMPLETED": set(),
    }

    if normalized_status == current_status:
        raise ValueError(
            f"Booking is already {current_status}."
        )

    if normalized_status not in allowed_transitions.get(
        current_status,
        set(),
    ):
        raise ValueError(
            f"Cannot change booking from "
            f"{current_status} to {normalized_status}."
        )

    return (
        supabase
        .table("bookings")
        .update({
            "status": normalized_status,
        })
        .eq("id", booking_id)
        .execute()
    )