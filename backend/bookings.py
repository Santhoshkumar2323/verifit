from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from authorization import require_professional
from schemas import BookingResponse, CreateBookingRequest
from services import (
    create_booking,
    get_bookings_for_professional,
    get_bookings_for_user,
    update_booking_status,
)
from supabase_client import supabase


router = APIRouter()


# --------------------------------------------------
# USER — CREATE BOOKING
# --------------------------------------------------


@router.post(
    "",
    response_model=BookingResponse,
)
async def create_new_booking(
    data: CreateBookingRequest,
    user_id: str = Depends(get_current_user),
):
    try:
        result = create_booking(
            supabase=supabase,
            user_id=user_id,
            professional_id=data.professional_id,
            requested_at=data.requested_at,
            message=data.message,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not create booking: {str(exc)}",
        )

    if not result.data:
        raise HTTPException(
            status_code=400,
            detail="Booking could not be created.",
        )

    booking = result.data[0]

    return {
        "id": booking["id"],
        "professional_id": booking["professional_id"],
        "status": booking["status"],
        "message": booking.get("message"),
        "requested_at": booking["requested_at"],
    }


# --------------------------------------------------
# USER — VIEW OWN BOOKINGS
# --------------------------------------------------


@router.get(
    "/me",
    response_model=list[BookingResponse],
)
async def get_my_bookings(
    user_id: str = Depends(get_current_user),
):
    try:
        result = get_bookings_for_user(
            supabase=supabase,
            user_id=user_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch bookings: {str(exc)}",
        )

    return result.data or []


# --------------------------------------------------
# PROFESSIONAL — VIEW INCOMING BOOKINGS
# --------------------------------------------------


@router.get(
    "/professional",
    response_model=list[BookingResponse],
)
async def get_professional_bookings(
    user_id: str = Depends(require_professional),
):
    try:
        result = get_bookings_for_professional(
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
            detail=f"Could not fetch professional bookings: {str(exc)}",
        )

    return result.data or []


# --------------------------------------------------
# PROFESSIONAL — UPDATE BOOKING STATUS
# --------------------------------------------------


@router.patch(
    "/{booking_id}/status",
    response_model=BookingResponse,
)
async def change_booking_status(
    booking_id: str,
    status: str,
    user_id: str = Depends(require_professional),
):
    try:
        professional_result = (
            supabase
            .table("professionals")
            .select("id")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        if not professional_result.data:
            raise HTTPException(
                status_code=404,
                detail="Professional profile not found.",
            )

        professional_id = professional_result.data["id"]

        booking_result = (
            supabase
            .table("bookings")
            .select(
                "id, professional_id, status, message, requested_at"
            )
            .eq("id", booking_id)
            .eq("professional_id", professional_id)
            .maybe_single()
            .execute()
        )

        if not booking_result.data:
            raise HTTPException(
                status_code=404,
                detail="Booking not found or access denied.",
            )

        result = update_booking_status(
            supabase=supabase,
            booking_id=booking_id,
            status=status,
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
            detail=f"Could not update booking: {str(exc)}",
        )

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail="Booking could not be updated.",
        )

    booking = result.data[0]

    return {
        "id": booking["id"],
        "professional_id": booking["professional_id"],
        "status": booking["status"],
        "message": booking.get("message"),
        "requested_at": booking["requested_at"],
    }