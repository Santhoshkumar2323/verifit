from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)

from auth import get_current_user
from schemas import (
    CreatePostRequest,
    PostListResponse,
    PostResponse,
    VoteResponse,
)
from services import (
    create_post,
    delete_post,
    get_post_by_id,
    get_posts,
    upvote_post,
)
from storage import upload_post_image
from supabase_client import supabase


router = APIRouter()


# ---------------------------------------------------------------------------
# List posts
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=PostListResponse,
)
async def list_posts(
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    try:
        result = get_posts(
            supabase=supabase,
            category=category,
            search=search,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch posts: {str(exc)}",
        )

    return {
        "posts": result.data or [],
        "total": result.count or 0,
    }


# ---------------------------------------------------------------------------
# Get single post
# ---------------------------------------------------------------------------

@router.get(
    "/{post_id}",
    response_model=PostResponse,
)
async def read_post(
    post_id: str,
):
    try:
        result = get_post_by_id(
            supabase=supabase,
            post_id=post_id,
        )
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="Post not found.",
        )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Post not found.",
        )

    return result.data[0]


# ---------------------------------------------------------------------------
# Upload post image
# ---------------------------------------------------------------------------

@router.post(
    "/media/image",
)
async def upload_post_image_file(
    image: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """
    Upload an image for a post.

    The image is stored in:

        post-images/{user_id}/posts/{uuid}.extension

    The returned URL is public because the post-images bucket
    is intentionally public.
    """

    try:
        image_url = upload_post_image(
            user_id=user_id,
            file=image,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not upload post image: {str(exc)}",
        )

    return {
        "url": image_url,
    }


# ---------------------------------------------------------------------------
# Create post
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=PostResponse,
)
async def create_new_post(
    data: CreatePostRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Create a post for the authenticated user.

    Flow:

        authenticated request
                ↓
        create_post()
                ↓
        Supabase posts table
                ↓
        get_post_by_id()
                ↓
        formatted PostResponse
                ↓
        frontend
    """

    try:
        result = create_post(
            supabase=supabase,
            author_id=user_id,
            title=data.title,
            content=data.content,
            category=data.category,
            image_url=data.image_url,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not create post: {str(exc)}",
        )

    if not result.data:
        raise HTTPException(
            status_code=400,
            detail="Post could not be created.",
        )

    created_post = result.data[0]

    post_id = created_post.get("id")

    if not post_id:
        raise HTTPException(
            status_code=500,
            detail="Post was created but its ID was not returned.",
        )

    try:
        formatted_result = get_post_by_id(
            supabase=supabase,
            post_id=post_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Post was created, but the created post "
                f"could not be loaded: {str(exc)}"
            ),
        )

    if not formatted_result.data:
        raise HTTPException(
            status_code=500,
            detail="Post was created but could not be loaded.",
        )

    return formatted_result.data[0]


# ---------------------------------------------------------------------------
# Upvote post
# ---------------------------------------------------------------------------

@router.post(
    "/{post_id}/vote",
    response_model=VoteResponse,
)
async def vote_for_post(
    post_id: str,
    user_id: str = Depends(get_current_user),
):
    try:
        result = upvote_post(
            supabase=supabase,
            user_id=user_id,
            post_id=post_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not vote on post: {str(exc)}",
        )

    return {
        "post_id": result["post_id"],
        "votes": result["votes"],
    }

# ---------------------------------------------------------------------------
# Delete post
# ---------------------------------------------------------------------------

@router.delete(
    "/{post_id}",
)
async def delete_existing_post(
    post_id: str,
    user_id: str = Depends(get_current_user),
):
    """
    Delete a post owned by the authenticated user.

    The service layer explicitly checks author_id because the backend
    uses the Supabase service-role client.
    """

    try:
        deleted = delete_post(
            supabase=supabase,
            user_id=user_id,
            post_id=post_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not delete post: {str(exc)}",
        )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Post not found or you are not allowed to delete it.",
        )

    return {
        "message": "Post deleted successfully.",
        "post_id": post_id,
    }