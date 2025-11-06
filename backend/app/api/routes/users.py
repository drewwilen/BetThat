from fastapi import APIRouter, Depends
from ...schemas.user import UserResponse
from ...models.user import User
from ...api.dependencies import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

