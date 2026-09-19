from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from auth import get_current_user
from authorization import require_professional
from schemas import (
    CreateCredentialRequest,
    CreateProfessionalRequest,
    CredentialResponse,
    ProfessionalListResponse,
    ProfessionalRegistrationResponse,
    ProfessionalResponse,
)
from services import (
    create_credential,
    create_professional,
    get_credentials_for_user,
    get_professional_by_id,
    get_professional_by_user_id,
    get_professionals,
)
from storage import (
    create_credential_signed_url,
    upload_credential_document,
)
from supabase_client import supabase


router = APIRouter()


# ============================================================
# PROFESSIONAL DIRECTORY
# ============================================================

@router.get(
    "",
    response_model=ProfessionalListResponse,
)
async def list_professionals(
    specialization: Optional[str] = None,
    search: Optional[str] = None,
):
    """
    Return professional profiles for the public directory.
    """

    try:
        result = get_professionals(
            supabase=supabase,
            specialization=specialization,
            search=search,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch professionals: {str(exc)}",
        )

    return {
        "professionals": result.data or [],
        "total": len(result.data or []),
    }


# ============================================================
# PROFESSIONAL REGISTRATION
# ============================================================

@router.post(
    "/register",
    response_model=ProfessionalRegistrationResponse,
)
async def register_professional(
    data: CreateProfessionalRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Create the professional profile for the authenticated user.

    Registration creates a PROFESSIONAL role but does NOT
    automatically verify the professional.
    """

    try:
        # ----------------------------------------------------
        # Prevent duplicate professional profiles
        # ----------------------------------------------------

        existing = get_professional_by_user_id(
            supabase=supabase,
            user_id=user_id,
        )

        if existing.data:
            raise HTTPException(
                status_code=409,
                detail="A professional profile already exists.",
            )

        # ----------------------------------------------------
        # Create professional profile
        # ----------------------------------------------------

        result = create_professional(
            supabase=supabase,
            user_id=user_id,
            specialization=data.specialization,
            bio=data.bio,
            experience_years=data.experience_years,
        )

        if not result.data:
            raise HTTPException(
                status_code=400,
                detail="Professional profile could not be created.",
            )

        professional = result.data[0]

        # ----------------------------------------------------
        # Promote account to PROFESSIONAL role
        #
        # This is NOT verification.
        # Verification remains PENDING until reviewed.
        # ----------------------------------------------------

        role_result = (
            supabase
            .table("users")
            .update({
                "role": "PROFESSIONAL",
            })
            .eq("id", user_id)
            .execute()
        )

        if not role_result.data:
            # Roll back the professional profile if possible.
            supabase.table("professionals").delete().eq(
                "id",
                professional["id"],
            ).execute()

            raise HTTPException(
                status_code=500,
                detail="Professional role could not be assigned.",
            )

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not register professional: {str(exc)}",
        )

    return {
        "id": str(professional["id"]),
        "user_id": str(professional["user_id"]),
        "specialization": professional["specialization"],
        "bio": professional.get("bio"),
        "experience_years": professional.get(
            "experience_years",
            0,
        ),
        "verification_status": professional.get(
            "verification_status",
            "PENDING",
        ),
        "created_at": professional["created_at"],
        "updated_at": professional["updated_at"],
    }


# ============================================================
# MY PROFESSIONAL PROFILE
# ============================================================

@router.get(
    "/me/profile",
    response_model=ProfessionalResponse,
)
async def get_my_professional_profile(
    user_id: str = Depends(get_current_user),
):
    """
    Return the authenticated user's professional profile.
    """

    try:
        result = get_professional_by_user_id(
            supabase=supabase,
            user_id=user_id,
        )

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail="Professional profile not found.",
            )

        professional_id = result.data[0]["id"]

        full_profile = get_professional_by_id(
            supabase=supabase,
            professional_id=professional_id,
        )

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch professional profile: {str(exc)}",
        )

    if not full_profile.data:
        raise HTTPException(
            status_code=404,
            detail="Professional profile not found.",
        )

    return full_profile.data[0]


# ============================================================
# MY CREDENTIALS
# ============================================================

@router.get(
    "/me/credentials",
    response_model=list[CredentialResponse],
)
async def get_my_credentials(
    user_id: str = Depends(require_professional),
):
    """
    Return credentials belonging to the authenticated professional.
    """

    try:
        result = get_credentials_for_user(
            supabase=supabase,
            user_id=user_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch credentials: {str(exc)}",
        )

    return result.data or []


# ============================================================
# CREATE CREDENTIAL FROM EXISTING DOCUMENT URL/PATH
# ============================================================

@router.post(
    "/me/credentials",
    response_model=CredentialResponse,
)
async def submit_my_credential(
    data: CreateCredentialRequest,
    user_id: str = Depends(require_professional),
):
    """
    Preserve the existing credential submission endpoint.

    This endpoint is still useful for credentials that already
    have a stored document path.
    """

    try:
        result = create_credential(
            supabase=supabase,
            user_id=user_id,
            credential_name=data.credential_name,
            credential_type=data.credential_type,
            issuer=data.issuer,
            credential_number=data.credential_number,
            document_url=data.document_url,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not submit credential: {str(exc)}",
        )

    if not result.data:
        raise HTTPException(
            status_code=400,
            detail="Credential could not be submitted.",
        )

    return result.data[0]


# ============================================================
# UPLOAD CREDENTIAL DOCUMENT + CREATE CREDENTIAL
# ============================================================

@router.post(
    "/me/credentials/upload",
    response_model=CredentialResponse,
)
async def upload_my_credential(
    credential_name: str = Form(...),
    credential_type: Optional[str] = Form(None),
    issuer: Optional[str] = Form(None),
    credential_number: Optional[str] = Form(None),
    document: UploadFile = File(...),
    user_id: str = Depends(require_professional),
):
    """
    Upload a credential document and create its database record.

    Multipart request:

        credential_name
        credential_type
        issuer
        credential_number
        document

    The document is stored in the PRIVATE
    credential-documents bucket.

    The database stores the storage path, not a public URL.
    """

    credential_name = credential_name.strip()

    if len(credential_name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Credential name must contain at least 2 characters.",
        )

    storage_path: Optional[str] = None

    try:
        # ----------------------------------------------------
        # 1. Upload private document
        # ----------------------------------------------------

        storage_path = upload_credential_document(
            user_id=user_id,
            file=document,
        )

        # ----------------------------------------------------
        # 2. Create credential database record
        # ----------------------------------------------------

        result = create_credential(
            supabase=supabase,
            user_id=user_id,
            credential_name=credential_name,
            credential_type=credential_type,
            issuer=issuer,
            credential_number=credential_number,
            document_url=storage_path,
        )

        if not result.data:
            # Storage cleanup if database insertion fails.
            try:
                supabase.storage.from_(
                    "credential-documents"
                ).remove([storage_path])
            except Exception:
                pass

            raise HTTPException(
                status_code=400,
                detail="Credential could not be created.",
            )

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        # Clean up uploaded document if database/storage
        # processing failed after the upload succeeded.
        if storage_path:
            try:
                supabase.storage.from_(
                    "credential-documents"
                ).remove([storage_path])
            except Exception:
                pass

        raise HTTPException(
            status_code=500,
            detail=f"Could not upload credential: {str(exc)}",
        )

    return result.data[0]


# ============================================================
# PRIVATE CREDENTIAL DOCUMENT ACCESS
# ============================================================

@router.get(
    "/me/credentials/{credential_id}/document",
)
async def get_my_credential_document(
    credential_id: str,
    user_id: str = Depends(require_professional),
):
    """
    Generate a temporary signed URL for the professional's
    own private credential document.
    """

    try:
        # ----------------------------------------------------
        # Find professional
        # ----------------------------------------------------

        professional_result = get_professional_by_user_id(
            supabase=supabase,
            user_id=user_id,
        )

        if not professional_result.data:
            raise HTTPException(
                status_code=404,
                detail="Professional profile not found.",
            )

        professional_id = professional_result.data[0]["id"]

        # ----------------------------------------------------
        # Find credential belonging to this professional
        # ----------------------------------------------------

        credential_result = (
            supabase
            .table("credentials")
            .select("id,document_url")
            .eq("id", credential_id)
            .eq("professional_id", professional_id)
            .maybe_single()
            .execute()
        )

        if not credential_result.data:
            raise HTTPException(
                status_code=404,
                detail="Credential not found.",
            )

        storage_path = credential_result.data.get(
            "document_url"
        )

        if not storage_path:
            raise HTTPException(
                status_code=404,
                detail="This credential has no document.",
            )

        # ----------------------------------------------------
        # Generate temporary private URL
        # ----------------------------------------------------

        signed_url = create_credential_signed_url(
            storage_path=storage_path,
            expires_in=3600,
        )

        return {
            "credential_id": credential_id,
            "url": signed_url,
            "expires_in": 3600,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Could not access credential document: "
                f"{str(exc)}"
            ),
        )


# ============================================================
# SINGLE PROFESSIONAL
# ============================================================

@router.get(
    "/{professional_id}",
    response_model=ProfessionalResponse,
)
async def read_professional(
    professional_id: str,
):
    """
    Return one professional profile.
    """

    try:
        result = get_professional_by_id(
            supabase=supabase,
            professional_id=professional_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch professional: {str(exc)}",
        )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Professional not found.",
        )

    return result.data[0]