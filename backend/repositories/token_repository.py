from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models.domain import TokenBlacklist


def blacklist_token(db: Session, token: str) -> None:
    if db.query(TokenBlacklist).filter(TokenBlacklist.token == token).first():
        return
    db.add(TokenBlacklist(token=token))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()


def is_token_blacklisted(db: Session, token: str) -> bool:
    return db.query(TokenBlacklist).filter(TokenBlacklist.token == token).first() is not None
