from __future__ import annotations

from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from supabase_client import supabase


# ============================================================
# STORAGE CONFIGURATION
# ============================================================

PROFILE_IMAGES_BUCKET = "profile-images"
POST_IMAGES_BUCKET = "post-images"
VIDEOS_BUCKET = "videos"
CREDENTIAL_DOCUMENTS_BUCKET = "credential-documents"


MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024       # 5 MB
MAX_POST_IMAGE_SIZE = 10 * 1024 * 1024        # 10 MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024             # 100 MB
MAX_CREDENTIAL_SIZE = 15 * 1024 * 1024         # 15 MB


IMAGE_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

VIDEO_CONTENT_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
}

CREDENTIAL_CONTENT_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


# ============================================================
# INTERNAL HELPERS
# ============================================================

def _validate_file(
    file: UploadFile,
    allowed_types: dict[str, str],
    max_size: int,
) -> str:
    """
    Validate MIME type and file size.

    Returns the correct file extension for the uploaded type.
    """

    content_type = file.content_type or ""

    if content_type not in allowed_types:
        allowed = ", ".join(allowed_types.keys())

        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{content_type}'. "
                f"Allowed types: {allowed}."
            ),
        )

    # UploadFile.file is a SpooledTemporaryFile.
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)

    if size <= 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if size > max_size:
        max_mb = max_size // (1024 * 1024)

        raise HTTPException(
            status_code=400,
            detail=f"File is too large. Maximum size is {max_mb} MB.",
        )

    return allowed_types[content_type]


def _build_path(
    user_id: str,
    extension: str,
    prefix: str,
) -> str:
    """
    Create a unique storage path.

    Example:
    user-uuid/posts/uuid.jpg
    """

    filename = f"{uuid4().hex}{extension}"

    return f"{user_id}/{prefix}/{filename}"


def _read_upload(file: UploadFile) -> bytes:
    """
    Read the complete uploaded file.
    """

    file.file.seek(0)

    data = file.file.read()

    if not data:
        raise HTTPException(
            status_code=400,
            detail="Could not read uploaded file.",
        )

    return data


def _upload(
    bucket: str,
    path: str,
    data: bytes,
    content_type: str,
) -> str:
    """
    Upload bytes to Supabase Storage.
    """

    try:
        supabase.storage.from_(bucket).upload(
            path,
            data,
            file_options={
                "content-type": content_type,
                "upsert": False,
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not upload file: {str(exc)}",
        )

    return path


# ============================================================
# PROFILE IMAGE
# ============================================================

def upload_profile_image(
    user_id: str,
    file: UploadFile,
) -> str:
    """
    Upload a user's profile image.

    Storage path:
    profile-images/{user_id}/profile/{uuid}.jpg
    """

    extension = _validate_file(
        file=file,
        allowed_types=IMAGE_CONTENT_TYPES,
        max_size=MAX_PROFILE_IMAGE_SIZE,
    )

    data = _read_upload(file)

    path = _build_path(
        user_id=user_id,
        extension=extension,
        prefix="profile",
    )

    _upload(
        bucket=PROFILE_IMAGES_BUCKET,
        path=path,
        data=data,
        content_type=file.content_type or "application/octet-stream",
    )

    return supabase.storage.from_(
        PROFILE_IMAGES_BUCKET
    ).get_public_url(path)


# ============================================================
# POST IMAGE
# ============================================================

def upload_post_image(
    user_id: str,
    file: UploadFile,
) -> str:
    """
    Upload an image attached to a community post.

    Storage path:
    post-images/{user_id}/posts/{uuid}.jpg
    """

    extension = _validate_file(
        file=file,
        allowed_types=IMAGE_CONTENT_TYPES,
        max_size=MAX_POST_IMAGE_SIZE,
    )

    data = _read_upload(file)

    path = _build_path(
        user_id=user_id,
        extension=extension,
        prefix="posts",
    )

    _upload(
        bucket=POST_IMAGES_BUCKET,
        path=path,
        data=data,
        content_type=file.content_type or "application/octet-stream",
    )

    return supabase.storage.from_(
        POST_IMAGES_BUCKET
    ).get_public_url(path)


# ============================================================
# VIDEO
# ============================================================

def upload_video(
    user_id: str,
    file: UploadFile,
) -> str:
    """
    Upload a community video.

    Storage path:
    videos/{user_id}/posts/{uuid}.mp4
    """

    extension = _validate_file(
        file=file,
        allowed_types=VIDEO_CONTENT_TYPES,
        max_size=MAX_VIDEO_SIZE,
    )

    data = _read_upload(file)

    path = _build_path(
        user_id=user_id,
        extension=extension,
        prefix="posts",
    )

    _upload(
        bucket=VIDEOS_BUCKET,
        path=path,
        data=data,
        content_type=file.content_type or "application/octet-stream",
    )

    return supabase.storage.from_(
        VIDEOS_BUCKET
    ).get_public_url(path)


# ============================================================
# CREDENTIAL DOCUMENT
# ============================================================

def upload_credential_document(
    user_id: str,
    file: UploadFile,
) -> str:
    """
    Upload a professional credential document.

    This bucket is PRIVATE.

    Storage path:
    credential-documents/{user_id}/credentials/{uuid}.pdf

    Returns the storage path rather than a public URL.
    """

    extension = _validate_file(
        file=file,
        allowed_types=CREDENTIAL_CONTENT_TYPES,
        max_size=MAX_CREDENTIAL_SIZE,
    )

    data = _read_upload(file)

    path = _build_path(
        user_id=user_id,
        extension=extension,
        prefix="credentials",
    )

    _upload(
        bucket=CREDENTIAL_DOCUMENTS_BUCKET,
        path=path,
        data=data,
        content_type=file.content_type or "application/octet-stream",
    )

    return path


# ============================================================
# PRIVATE CREDENTIAL ACCESS
# ============================================================

def create_credential_signed_url(
    storage_path: str,
    expires_in: int = 3600,
) -> str:
    """
    Generate a temporary signed URL for a private credential.

    Default lifetime: 1 hour.
    """

    if not storage_path:
        raise HTTPException(
            status_code=400,
            detail="Credential document path is missing.",
        )

    try:
        result = supabase.storage.from_(
            CREDENTIAL_DOCUMENTS_BUCKET
        ).create_signed_url(
            storage_path,
            expires_in,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not create document access URL: {str(exc)}",
        )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Credential document could not be accessed.",
        )

    if isinstance(result, dict):
        signed_url = result.get("signedURL") or result.get("signedUrl")

        if signed_url:
            return signed_url

    raise HTTPException(
        status_code=500,
        detail="Storage did not return a signed URL.",
    )


# ============================================================
# DELETE FILE
# ============================================================

def delete_file(
    bucket: str,
    storage_path: str,
) -> None:
    """
    Delete a single storage object.
    """

    if not storage_path:
        return

    try:
        supabase.storage.from_(bucket).remove(
            [storage_path]
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete stored file: {str(exc)}",
        )