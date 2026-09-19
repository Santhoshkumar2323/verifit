from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from admin import router as admin_router
from bookings import router as bookings_router
from comments import router as comments_router
from posts import router as posts_router
from professionals import router as professionals_router
from users import router as users_router
from verification import router as verification_router


app = FastAPI(
    title="VeriFit API",
    description="Backend API for the VeriFit platform.",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://verifit.onrender.com",
        "https://verifit-ivory.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    posts_router,
    prefix="/posts",
    tags=["Posts"],
)

app.include_router(
    users_router,
    prefix="/users",
    tags=["Users"],
)

app.include_router(
    professionals_router,
    prefix="/professionals",
    tags=["Professionals"],
)

app.include_router(
    bookings_router,
    prefix="/bookings",
    tags=["Bookings"],
)

app.include_router(
    verification_router,
    prefix="/verification",
    tags=["Verification"],
)

app.include_router(
    comments_router,
    tags=["Comments"],
)

app.include_router(
    admin_router,
    prefix="/admin",
    tags=["Admin"],
)


@app.get(
    "/health",
    tags=["System"],
)
async def health_check():
    return {
        "status": "ok",
        "service": "verifit-api",
    }