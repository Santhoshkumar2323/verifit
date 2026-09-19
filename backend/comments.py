from fastapi import APIRouter, Depends, HTTPException, Query

from auth import get_current_user
from schemas import (
    CommentListResponse,
    CommentResponse,
    CreateCommentRequest,
)
from services import (
    create_comment,
    delete_comment,
    get_comments,
)
from supabase_client import supabase


router = APIRouter()


# ---------------------------------------------------------------------------
# GET COMMENTS
# ---------------------------------------------------------------------------

@router.get(
    "/posts/{post_id}/comments",
    response_model=CommentListResponse,
)
async def list_comments(
    post_id: str,
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    user_id: str = Depends(get_current_user),
):
    """
    Return comments belonging to a post.

    Authentication is required because comments are currently
    available to authenticated VeriFit users.
    """

    try:
        result = get_comments(
            supabase=supabase,
            post_id=post_id,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch comments: {str(exc)}",
        )

    return result


# ---------------------------------------------------------------------------
# CREATE COMMENT
# ---------------------------------------------------------------------------

@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentResponse,
)
async def create_new_comment(
    post_id: str,
    data: CreateCommentRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Create a comment for the authenticated user.

    The user ID comes from the authenticated Supabase token,
    not from the request body.
    """

    try:
        result = create_comment(
            supabase=supabase,
            user_id=user_id,
            post_id=post_id,
            content=data.content,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not create comment: {str(exc)}",
        )

    return result


# ---------------------------------------------------------------------------
# DELETE COMMENT
# ---------------------------------------------------------------------------

@router.delete(
    "/comments/{comment_id}",
)
async def remove_comment(
    comment_id: str,
    user_id: str = Depends(get_current_user),
):
    """
    Delete a comment belonging to the authenticated user.
    """

    try:
        deleted = delete_comment(
            supabase=supabase,
            user_id=user_id,
            comment_id=comment_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not delete comment: {str(exc)}",
        )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Comment not found or you do not have permission to delete it.",
        )

    return {
        "message": "Comment deleted successfully.",
        "comment_id": comment_id,
    }