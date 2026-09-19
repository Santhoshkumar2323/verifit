from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------
# USER
# --------------------------------------------------

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str
    avatar_url: Optional[str] = None
    role: str
    created_at: datetime
    updated_at: datetime


class UpdateUserRequest(BaseModel):
    display_name: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=100,
    )
    avatar_url: Optional[str] = None


# --------------------------------------------------
# POSTS
# --------------------------------------------------

class CreatePostRequest(BaseModel):
    title: str = Field(
        ...,
        min_length=3,
        max_length=200,
    )

    content: str = Field(
        ...,
        min_length=10,
        max_length=10000,
    )

    category: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    image_url: Optional[str] = None


class FactCheckResponse(BaseModel):
    status: str
    summary: Optional[str] = None
    confidence: Optional[float] = None
    model_name: Optional[str] = None


class PostAuthorResponse(BaseModel):
    id: str
    display_name: str
    avatar_url: Optional[str] = None
    role: str


class PostResponse(BaseModel):
    id: str
    author: PostAuthorResponse

    title: str
    content: str
    category: Optional[str] = None
    image_url: Optional[str] = None

    created_at: datetime

    votes: int = 0
    comments: int = 0

    fact_check: Optional[FactCheckResponse] = None


class PostListResponse(BaseModel):
    posts: list[PostResponse]
    total: int


class VoteResponse(BaseModel):
    post_id: str
    votes: int


# --------------------------------------------------
# COMMENTS
# --------------------------------------------------

class CreateCommentRequest(BaseModel):
    content: str = Field(
        ...,
        min_length=1,
        max_length=2000,
    )


class CommentAuthorResponse(BaseModel):
    id: str
    display_name: str
    avatar_url: Optional[str] = None
    role: str


class CommentResponse(BaseModel):
    id: str
    post_id: str

    author: CommentAuthorResponse

    content: str

    created_at: datetime
    updated_at: datetime


class CommentListResponse(BaseModel):
    comments: list[CommentResponse]
    total: int


# --------------------------------------------------
# PROFESSIONAL REGISTRATION
# --------------------------------------------------

class CreateProfessionalRequest(BaseModel):
    specialization: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    bio: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    experience_years: int = Field(
        default=0,
        ge=0,
        le=80,
    )


class ProfessionalRegistrationResponse(BaseModel):
    id: str
    user_id: str

    specialization: str
    bio: Optional[str] = None
    experience_years: int

    verification_status: str

    created_at: datetime
    updated_at: datetime


# --------------------------------------------------
# PROFESSIONAL CREDENTIALS
# --------------------------------------------------

class CreateCredentialRequest(BaseModel):
    credential_name: str = Field(
        ...,
        min_length=2,
        max_length=200,
    )

    credential_type: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    issuer: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    credential_number: Optional[str] = Field(
        default=None,
        max_length=200,
    )

    document_url: Optional[str] = Field(
        default=None,
        max_length=2000,
    )


class CredentialResponse(BaseModel):
    id: str

    credential_name: str
    credential_type: Optional[str] = None
    issuer: Optional[str] = None
    credential_number: Optional[str] = None
    document_url: Optional[str] = None

    status: str

    submitted_at: datetime
    verified_at: Optional[datetime] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# --------------------------------------------------
# PROFESSIONALS
# --------------------------------------------------

class ProfessionalResponse(BaseModel):
    id: str
    user_id: str

    name: str
    avatar_url: Optional[str] = None

    specialization: str
    bio: Optional[str] = None
    experience_years: int = 0

    verified: bool = False
    verification_status: str

    credentials: list[CredentialResponse] = []


class ProfessionalListResponse(BaseModel):
    professionals: list[ProfessionalResponse]
    total: int


# --------------------------------------------------
# ADMIN PROFESSIONAL VERIFICATION
# --------------------------------------------------

class ProfessionalVerificationRequest(BaseModel):
    status: str = Field(
        ...,
        pattern="^(VERIFIED|REJECTED)$",
    )


class CredentialVerificationRequest(BaseModel):
    status: str = Field(
        ...,
        pattern="^(VERIFIED|REJECTED)$",
    )


class AdminProfessionalResponse(BaseModel):
    id: str
    user_id: str

    name: str
    avatar_url: Optional[str] = None

    specialization: str
    bio: Optional[str] = None
    experience_years: int

    verification_status: str

    credentials: list[CredentialResponse] = []

    created_at: datetime
    updated_at: datetime


class AdminProfessionalListResponse(BaseModel):
    professionals: list[AdminProfessionalResponse]
    total: int


# --------------------------------------------------
# BOOKINGS
# --------------------------------------------------

class CreateBookingRequest(BaseModel):
    professional_id: str

    message: Optional[str] = Field(
        default=None,
        max_length=2000,
    )

    requested_at: datetime


class BookingResponse(BaseModel):
    id: str
    professional_id: str
    status: str
    message: Optional[str] = None
    requested_at: datetime