from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from supabase_client import supabase


router = APIRouter()


@router.get("/professionals")
async def list_professionals_for_verification(
    status: Optional[str] = Query(default=None),
):
    query = (
        supabase
        .table("professionals")
        .select(
            """
            id,
            user_id,
            specialization,
            bio,
            experience_years,
            verification_status
            """
        )
    )

    if status:
        query = query.eq(
            "verification_status",
            status,
        )

    try:
        result = query.execute()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Could not fetch professional "
                f"verification records: {str(exc)}"
            ),
        )

    professionals = result.data or []

    return {
        "professionals": professionals,
        "total": len(professionals),
    }


@router.get("/professionals/{professional_id}")
async def get_professional_verification(
    professional_id: str,
):
    try:
        result = (
            supabase
            .table("professionals")
            .select(
                """
                id,
                user_id,
                specialization,
                bio,
                experience_years,
                verification_status
                """
            )
            .eq("id", professional_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=404,
            detail=(
                "Professional verification record "
                "not found."
            ),
        )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=(
                "Professional verification record "
                "not found."
            ),
        )

    return result.data


@router.get(
    "/professionals/{professional_id}/status"
)
async def get_verification_status(
    professional_id: str,
):
    try:
        result = (
            supabase
            .table("professionals")
            .select(
                "id, verification_status"
            )
            .eq("id", professional_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="Professional not found.",
        )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Professional not found.",
        )

    return {
        "professional_id": result.data["id"],
        "verification_status": result.data[
            "verification_status"
        ],
    }