from fastapi import APIRouter, status, HTTPException
from app.db import get_session
from app.models import User
from app.api.api_models import UserResponse, LoginResponse, GoogleLoginRequest
from app.jwt_utils import create_access_token
from app.google_auth_utils import verify_google_token

router = APIRouter()


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


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout():
    """
    Logout endpoint
    With JWT tokens, logout is handled client-side by deleting the token
    This endpoint just confirms the logout action
    """
    return {
        "status": "success",
        "message": "Logged out successfully"
    }


@router.get("/me", status_code=status.HTTP_200_OK)
async def me():
    """Get current user info (protected) - TBD"""
    return {"status": "TBD", "endpoint": "/api/auth/me"}


@router.put("/profile", status_code=status.HTTP_200_OK)
async def update_profile():
    """Update user profile (protected) - TBD"""
    return {"status": "TBD", "endpoint": "/api/auth/profile"}
