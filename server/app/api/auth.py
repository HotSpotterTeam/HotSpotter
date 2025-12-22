from fastapi import APIRouter, status, HTTPException, Depends
from app.db import get_session
from app.models import User
from app.api.api_models import UserResponse, LoginResponse, GoogleLoginRequest
from app.jwt_utils import create_access_token
from app.google_auth_utils import verify_google_token
from app.api.auth_utils import get_current_user

router = APIRouter()


@router.post("/dev-login")
async def dev_login(user_id: int = 1):
    """
    DEV ONLY: Generate a JWT token for testing.
    Remove before production!
    """
    with get_session() as session:
        user = session.query(User).filter(User.id == user_id).first()

        if not user:
            # Create a test user if none exists
            user = User(
                email=f"testuser{user_id}@test.com",
                name=f"Test User {user_id}",
                google_id=f"test_google_{user_id}",
                is_admin=True  # Make admin for full testing
            )
            session.add(user)
            session.commit()
            session.refresh(user)

        # Generate JWT token (same way as google-login does)
        token = create_access_token({"sub": str(user.id)})

        return {
            "status": "success",
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "is_admin": user.is_admin
            }
        }
    

@router.post("/google", status_code=status.HTTP_200_OK)
async def google_login(request: GoogleLoginRequest):
    """
    Google OAuth login endpoint
    Accepts Google ID token, verifies it, and creates/finds user
    """
    google_user = verify_google_token(request.token)

    if not google_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

    with get_session() as session:
        user = session.query(User).filter(User.google_id == google_user['google_id']).first()

        if not user:
            user = session.query(User).filter(User.email == google_user['email']).first()

        if not user:
            user = User(
                email=google_user['email'],
                google_id=google_user['google_id'],
                name=google_user.get('name'),
                picture=google_user.get('picture'),
                username=google_user['email'].split('@')[0]
            )
            session.add(user)
            session.commit()
            session.refresh(user)
        else:
            if not user.google_id:
                user.google_id = google_user['google_id']
            user.name = google_user.get('name')
            user.picture = google_user.get('picture')
            session.commit()
            session.refresh(user)

        access_token = create_access_token(data={"sub": str(user.id), "email": user.email})

        user_response = UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            name=user.name,
            picture=user.picture
        )

        return LoginResponse(
            status="success",
            message="Login successful",
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )


@router.get("/me", status_code=status.HTTP_200_OK)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current user info from JWT token
    Used by frontend to restore session after page refresh

    Headers required:
        Authorization: Bearer <jwt-token>
    """
    return {
        "status": "success",
        "data": UserResponse(
            id=current_user.id,
            username=current_user.username,
            email=current_user.email,
            name=current_user.name,
            picture=current_user.picture
        )
    }


@router.put("/profile", status_code=status.HTTP_200_OK)
async def update_profile():
    """Update user profile (protected) - TBD"""
    return {"status": "TBD", "endpoint": "/api/auth/profile"}
