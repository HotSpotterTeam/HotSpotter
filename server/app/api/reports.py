from fastapi import APIRouter, status, Path

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def list_reports():
    """Get all reports (with filters) - TBD"""
    return {"status": "TBD", "endpoint": "/api/reports"}


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_report(id: str = Path(...)):
    """Get single report - TBD"""
    return {"status": "TBD", "endpoint": f"/api/reports/{id}"}


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_report(id: str = Path(...)):
    """Update report (protected, owner only) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/reports/{id}"}


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_report(id: str = Path(...)):
    """Delete report (protected, owner/admin only) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/reports/{id}"}


@router.post("/{id}/vote", status_code=status.HTTP_200_OK)
async def vote_report(id: str = Path(...)):
    """Upvote/downvote report (protected) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/reports/{id}/vote"}


@router.put("/{id}/verify", status_code=status.HTTP_200_OK)
async def verify_report(id: str = Path(...)):
    """Verify report (admin only) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/reports/{id}/verify"}
