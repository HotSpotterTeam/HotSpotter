from fastapi import APIRouter, status

router = APIRouter()


@router.post("/register", status_code=status.HTTP_200_OK)
async def register():
    """Register new user - TBD"""
    return {"status": "TBD", "endpoint": "/api/auth/register"}


@router.post("/login", status_code=status.HTTP_200_OK)
async def login():
    """Login user - TBD (should return JWT)"""
    return {"status": "TBD", "endpoint": "/api/auth/login"}


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout():
    """Logout user - TBD"""
    return {"status": "TBD", "endpoint": "/api/auth/logout"}


@router.get("/me", status_code=status.HTTP_200_OK)
async def me():
    """Get current user info (protected) - TBD"""
    return {"status": "TBD", "endpoint": "/api/auth/me"}


@router.put("/profile", status_code=status.HTTP_200_OK)
async def update_profile():
    """Update user profile (protected) - TBD"""
    return {"status": "TBD", "endpoint": "/api/auth/profile"}
