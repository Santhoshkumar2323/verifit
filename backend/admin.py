from fastapi import APIRouter, Depends, HTTPException

from authorization import require_admin
from schemas import (
    AdminProfessionalListResponse,
    AdminProfessionalResponse,
    CredentialVerificationRequest,
    ProfessionalVerificationRequest,
)
from services import (
    get_admin_professional_by_id,
    get_pending_professionals,
    update_credential_verification,
    update_professional_verification,
)
from supabase_client import supabase


router = APIRouter()


# --------------------------------------------------
# ADMIN — PROFESSIONAL REVIEW
# --------------------------------------------------


@router.get(
    "/professionals",
    response_model=AdminProfessionalListResponse,
)
async def list_pending_professionals(
    admin_user_id: str = Depends(require_admin),
):
    """
    Return professional profiles that are waiting for
    administrator verification.
    """

    try:
        result = get_pending_professionals(
            supabase=supabase,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch pending professionals: {str(exc)}",
        )

    professionals = result.data or []

    return {
        "professionals": professionals,
        "total": len(professionals),
    }


@router.get(
    "/professionals/{professional_id}",
    response_model=AdminProfessionalResponse,
)
async def get_professional_for_review(
    professional_id: str,
    admin_user_id: str = Depends(require_admin),
):
    """
    Return one professional profile together with its
    submitted credentials for administrator review.
    """

    try:
        result = get_admin_professional_by_id(
            supabase=supabase,
            professional_id=professional_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch professional review data: {str(exc)}",
        )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Professional not found.",
        )

    return result.data[0]


@router.patch(
    "/professionals/{professional_id}/verification",
    response_model=AdminProfessionalResponse,
)
async def verify_professional(
    professional_id: str,
    data: ProfessionalVerificationRequest,
    admin_user_id: str = Depends(require_admin),
):
    """
    Approve or reject a professional profile.
    """

    try:
        result = update_professional_verification(
            supabase=supabase,
            professional_id=professional_id,
            verification_status=data.verification_status,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not update professional verification: {str(exc)}",
        )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Professional not found.",
        )

    return result.data[0]


# --------------------------------------------------
# ADMIN — CREDENTIAL REVIEW
# --------------------------------------------------


@router.patch(
    "/credentials/{credential_id}/verification",
)
async def verify_credential(
    credential_id: str,
    data: CredentialVerificationRequest,
    admin_user_id: str = Depends(require_admin),
):
    """
    Approve or reject an individual professional credential.
    """

    try:
        result = update_credential_verification(
            supabase=supabase,
            credential_id=credential_id,
            status=data.status,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not update credential verification: {str(exc)}",
        )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Credential not found.",
        )

    credential = result.data[0]

    return {
        "message": "Credential verification updated successfully.",
        "credential": credential,
    }