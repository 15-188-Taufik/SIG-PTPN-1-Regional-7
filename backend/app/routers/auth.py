from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Cache hash to avoid rehashing on every request
_cached_hash: str | None = None


def _get_admin_hash() -> str:
    global _cached_hash
    if _cached_hash is None:
        _cached_hash = get_password_hash(settings.ADMIN_PASSWORD)
    return _cached_hash


@router.post("/login", response_model=TokenResponse, summary="Login ke sistem SIG PTPN")
def login(body: LoginRequest):
    """Login dengan kredensial bersama. Semua pengguna menggunakan username dan password yang sama."""
    if body.username != settings.ADMIN_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah",
        )
    if not verify_password(body.password, _get_admin_hash()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah",
        )
    token = create_access_token({"sub": body.username})
    return TokenResponse(access_token=token, username=body.username)


@router.get("/me", summary="Cek info user yang sedang login")
def get_me(user: dict = Depends(get_current_user)):
    return {"username": user["username"], "role": "admin", "kebun": "PTPN Regional 7 Lampung"}
