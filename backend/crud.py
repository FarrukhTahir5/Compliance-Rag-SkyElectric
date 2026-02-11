from sqlalchemy.orm import Session
from backend import models, schemas
from backend.auth import get_password_hash

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_chat_sessions(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.ChatSession).filter(models.ChatSession.user_id == user_id).offset(skip).limit(limit).all()

def create_user_chat_session(db: Session, session: schemas.ChatSessionCreate, user_id: int):
    db_session = models.ChatSession(**session.dict(), user_id=user_id)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_chat_messages(db: Session, session_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.ChatMessage).filter(models.ChatMessage.session_id == session_id).offset(skip).limit(limit).all()

def create_chat_message(db: Session, message: schemas.ChatMessageCreate, session_id: int):
    db_message = models.ChatMessage(**message.dict(), session_id=session_id)
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message
