from fastapi import Depends, HTTPException, status

from auth import get_current_user
from supabase_client import supabase


# --------------------------------------------------
# AUTHENTICATED USER
# --------------------------------------------------

def require_authenticated_user(
    user_id: str = Depends(get_current_user),
) -> str:
    """
    Require a valid authenticated Supabase user.

    Returns:
        The authenticated user's UUID.
    """
    return user_id


# --------------------------------------------------
# ROLE CHECK
# --------------------------------------------------

def require_role(required_role: str):
    """
    Create a reusable dependency that requires
    the authenticated user to have a specific role.

    Example:
        Depends(require_role("ADMIN"))
        Depends(require_role("PROFESSIONAL"))
    """

    def role_checker(
        user_id: str = Depends(get_current_user),
    ) -> str:

        result = (
            supabase
            .table("users")
            .select("role")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found.",
            )

        if result.data["role"] != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{required_role} role is required.",
            )

        return user_id

    return role_checker


# --------------------------------------------------
# PROFESSIONAL ROLE
# --------------------------------------------------

def require_professional(
    user_id: str = Depends(require_role("PROFESSIONAL")),
) -> str:
    """
    Require the authenticated user to have
    the PROFESSIONAL role.
    """
    return user_id


# --------------------------------------------------
# ADMIN ROLE
# --------------------------------------------------

def require_admin(
    user_id: str = Depends(require_role("ADMIN")),
) -> str:
    """
    Require the authenticated user to have
    the ADMIN role.
    """
    return user_id


# --------------------------------------------------
# VERIFIED PROFESSIONAL
# --------------------------------------------------

def require_verified_professional(
    user_id: str = Depends(require_role("PROFESSIONAL")),
) -> str:
    """
    Require:
        1. authenticated user
        2. PROFESSIONAL role
        3. professional profile exists
        4. professional verification status is VERIFIED
    """

    result = (
        supabase
        .table("professionals")
        .select("id, verification_status")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional profile not found.",
        )

    if result.data["verification_status"] != "VERIFIED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional verification is required.",
        )

    return user_id


# --------------------------------------------------
# RESOURCE OWNERSHIP
# --------------------------------------------------

def require_owner(
    resource_table: str,
    resource_id: str,
    user_id: str,
) -> None:
    """
    Verify that a resource belongs to the authenticated user.

    This helper is intentionally generic so future protected
    resources can reuse the same ownership rule.
    """

    result = (
        supabase
        .table(resource_table)
        .select("id")
        .eq("id", resource_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found or access denied.",
        )