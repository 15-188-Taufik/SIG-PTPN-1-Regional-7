from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Cache hash to avoid rehashing on every request
_cached_hash: str | None = None
_cached_user_hash: str | None = None


def _get_admin_hash() -> str:
    global _cached_hash
    if _cached_hash is None:
        _cached_hash = get_password_hash(settings.ADMIN_PASSWORD)
    return _cached_hash


def _get_user_hash() -> str:
    global _cached_user_hash
    if _cached_user_hash is None:
        _cached_user_hash = get_password_hash(settings.USER_PASSWORD)
    return _cached_user_hash


@router.post("/login", response_model=TokenResponse, summary="Login ke sistem SIG PTPN")
def login(body: LoginRequest):
    """Login dengan kredensial. Mendukung peran Admin dan Eksekutif."""
    if body.username == settings.ADMIN_USERNAME:
        if verify_password(body.password, _get_admin_hash()):
            token = create_access_token({"sub": body.username, "role": "admin"})
            return TokenResponse(access_token=token, username=body.username)
            
    elif body.username == settings.USER_USERNAME:
        if verify_password(body.password, _get_user_hash()):
            token = create_access_token({"sub": body.username, "role": "user"})
            return TokenResponse(access_token=token, username=body.username)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Username atau password salah",
    )


@router.get("/me", summary="Cek info user yang sedang login")
def get_me(user: dict = Depends(get_current_user)):
    return {"username": user["username"], "role": user.get("role", "user"), "kebun": "PTPN Regional 7 Lampung"}
