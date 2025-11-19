from fastapi import APIRouter, status, Path

router = APIRouter()


@router.get("/users", status_code=status.HTTP_200_OK)
async def list_users():
    """Get all users (admin only) - TBD"""
    return {"status": "TBD", "endpoint": "/api/admin/users"}


@router.put("/users/{id}/role", status_code=status.HTTP_200_OK)
async def change_user_role(id: str = Path(...)):
    """Change user role (admin only) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/admin/users/{id}/role"}


@router.delete("/users/{id}", status_code=status.HTTP_200_OK)
async def delete_user(id: str = Path(...)):
    """Delete user (admin only) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/admin/users/{id}"}


@router.get("/stats", status_code=status.HTTP_200_OK)
async def stats():
    """Get platform statistics (admin only) - TBD"""
    return {"status": "TBD", "endpoint": "/api/admin/stats"}


@router.post("/events/{id}/flag", status_code=status.HTTP_200_OK)
async def flag_event(id: str = Path(...)):
    """Flag event as false/inappropriate (admin only) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/admin/events/{id}/flag"}
