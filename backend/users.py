from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from schemas import UpdateUserRequest, UserResponse
from services import get_user_by_id, update_user
from supabase_client import supabase


router = APIRouter()


@router.get(
    "/{user_id}/profile",
    response_model=UserResponse,
)
async def read_user_profile(
    user_id: str,
):
    try:
        result = get_user_by_id(
            supabase=supabase,
            user_id=user_id,
        )
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return result.data[0]


@router.get(
    "/{user_id}",
    response_model=UserResponse,
)
async def read_user(
    user_id: str,
):
    try:
        result = get_user_by_id(
            supabase=supabase,
            user_id=user_id,
        )
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return result.data[0]


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
)
async def edit_user(
    user_id: str,
    data: UpdateUserRequest,
    current_user_id: str = Depends(get_current_user),
):
    # A user can only modify their own profile.
    if user_id != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own profile.",
        )

    # Make sure at least one field was supplied.
    if (
        data.display_name is None
        and data.avatar_url is None
    ):
        raise HTTPException(
            status_code=400,
            detail="No profile changes were provided.",
        )

    try:
        result = update_user(
            supabase=supabase,
            user_id=user_id,
            display_name=data.display_name,
            avatar_url=data.avatar_url,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not update profile: {str(exc)}",
        )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return result.data[0]