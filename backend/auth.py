from datetime import datetime, timedelta
from typing import Optional
import bcrypt

from jose import JWTError, jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models, schemas

# Using bcrypt directly instead of passlib to avoid compatibility issues

# Secret key for JWT. In a real application, this should be loaded from environment variables.
SECRET_KEY = "your-secret-key" # TODO: Replace with a strong, randomly generated key from environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt directly"""
    # Ensure password is within bcrypt's 72-byte limit
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # Truncate to 72 bytes, handling UTF-8 properly
        truncated_bytes = password_bytes[:72]
        try:
            password = truncated_bytes.decode('utf-8')
        except UnicodeDecodeError:
            # If we cut mid-character, try shorter lengths
            for i in range(71, 68, -1):
                try:
                    password = password_bytes[:i].decode('utf-8')
                    break
                except UnicodeDecodeError:
                    continue
            else:
                # Final fallback
                password = password_bytes[:72].decode('utf-8', errors='ignore')
    
    # Hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash using bcrypt directly"""
    # Handle password length
    password_bytes = plain_password.encode('utf-8')
    if len(password_bytes) > 72:
        # Truncate to 72 bytes, handling UTF-8 properly
        truncated_bytes = password_bytes[:72]
        try:
            plain_password = truncated_bytes.decode('utf-8')
        except UnicodeDecodeError:
            # If we cut mid-character, try shorter lengths
            for i in range(71, 68, -1):
                try:
                    plain_password = password_bytes[:i].decode('utf-8')
                    break
                except UnicodeDecodeError:
                    continue
            else:
                # Final fallback
                plain_password = password_bytes[:72].decode('utf-8', errors='ignore')
    
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user
