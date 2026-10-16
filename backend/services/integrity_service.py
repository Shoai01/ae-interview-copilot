"""
Session-level integrity scoring and auto-submit.

Every proctoring flag episode is worth points; once a session's total reaches
INTEGRITY_AUTO_SUBMIT_POINTS the exam is ended automatically. The browser polls
`check()` and submits when told to, so the decision is made server-side from the
stored flags (a refresh or a tampered page can't reset it).

Everything tunable is read from the environment — see the INTEGRITY_* block in
.env.example. Values are read on each call so a restart is the only step needed
to change them.

Scoring per episode of one flag type, with `dur` = seconds it was open
(still-open episodes count up to now):
    0                                    if dur < MIN_SECONDS (or the weight is 0)
    weight                               otherwise
  + ESCALATE_POINTS per full ESCALATE_EVERY_SECONDS beyond MIN_SECONDS

A candidate who simply stays out of fullscreen or off camera therefore keeps
losing points instead of paying a flat fee once.
"""
import datetime
import logging
import os
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from models import domain
from models.domain import FraudFlagType, SessionStatus
from repositories import viva_repository

logger = logging.getLogger(__name__)

# Episodes of one type that restart within this many seconds of the previous one
# ending are one continuous episode: the page closes and reopens an episode when
# the active question changes mid-flag, which must not be scored twice.
CONTINUATION_GAP_SECONDS = 2.0

_DEFAULT_POINTS = {
    FraudFlagType.FACE_MISMATCH: 5,
    FraudFlagType.MULTIPLE_FACES: 3,
    FraudFlagType.TAB_SWITCH: 2,
    FraudFlagType.FULLSCREEN_EXIT: 2,
    FraudFlagType.NO_FACE: 1,
    FraudFlagType.BACKGROUND_NOISE: 0,
}
# A glance away from the camera is normal; only absences this long start scoring.
_DEFAULT_MIN_SECONDS = {FraudFlagType.NO_FACE: 10}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def is_enabled() -> bool:
    return os.environ.get("INTEGRITY_AUTO_SUBMIT_ENABLED", "1") != "0"


def final_warning_points() -> int:
    return _env_int("INTEGRITY_FINAL_WARNING_POINTS", 6)


def auto_submit_points() -> int:
    return _env_int("INTEGRITY_AUTO_SUBMIT_POINTS", 10)


def poll_seconds() -> int:
    return max(2, _env_int("INTEGRITY_POLL_SECONDS", 5))


def escalate_every_seconds() -> int:
    return _env_int("INTEGRITY_ESCALATE_EVERY_SECONDS", 30)


def escalate_points() -> int:
    return _env_int("INTEGRITY_ESCALATE_POINTS", 1)


def points_for(flag_type: FraudFlagType) -> int:
    return max(0, _env_int(f"INTEGRITY_POINTS_{flag_type.value}", _DEFAULT_POINTS.get(flag_type, 0)))


def min_seconds_for(flag_type: FraudFlagType) -> int:
    return max(0, _env_int(f"INTEGRITY_MIN_SECONDS_{flag_type.value}", _DEFAULT_MIN_SECONDS.get(flag_type, 0)))


def _parse(ts: Optional[str]) -> Optional[datetime.datetime]:
    """ISO string from a flag event -> naive UTC datetime (None if unparseable)."""
    if not ts:
        return None
    try:
        dt = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
    if dt.tzinfo:
        dt = dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    return dt


def _episodes(events_by_row: List[list], now: datetime.datetime) -> List[Tuple[datetime.datetime, datetime.datetime]]:
    """
    Merge every stored event of one flag type (across all questions) into
    continuous (start, end) episodes. An episode that never got an END is closed
    where the next one of that type begins, or at `now` if it is the latest.
    """
    parsed = []
    for events in events_by_row:
        for e in events or []:
            start = _parse(e.get("start"))
            if start:
                parsed.append((start, _parse(e.get("end"))))
    parsed.sort(key=lambda p: p[0])

    closed = []  # (start, end, was_unclosed_and_capped)
    for i, (start, end) in enumerate(parsed):
        capped = False
        if end is None:
            if i + 1 < len(parsed):
                end, capped = parsed[i + 1][0], True
            else:
                end = now
        closed.append((start, max(start, min(end, now)), capped))  # never negative, never in the future

    merged: List[Tuple[datetime.datetime, datetime.datetime]] = []
    prev_capped = False
    for start, end, capped in closed:
        # An episode cut off by the next one's start is a separate episode, not a continuation.
        if merged and not prev_capped and (start - merged[-1][1]).total_seconds() <= CONTINUATION_GAP_SECONDS:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
        prev_capped = capped
    return merged


def _score_episode(flag_type: FraudFlagType, seconds: float) -> int:
    weight = points_for(flag_type)
    min_s = min_seconds_for(flag_type)
    if weight <= 0 or seconds < min_s:
        return 0
    points = weight
    every = escalate_every_seconds()
    if every > 0:
        points += escalate_points() * int((seconds - min_s) // every)
    return points


def compute_points(db: Session, session_id: int, now: Optional[datetime.datetime] = None) -> Dict[str, int]:
    """Points per flag type for the whole session (types with 0 points omitted)."""
    now = now or datetime.datetime.utcnow()
    rows = (
        db.query(domain.FraudFlag)
        .join(domain.VivaQuestion, domain.FraudFlag.viva_question_id == domain.VivaQuestion.id)
        .filter(domain.VivaQuestion.session_id == session_id)
        .all()
    )
    by_type: Dict[FraudFlagType, List[list]] = {}
    for row in rows:
        by_type.setdefault(row.flag_type, []).append(row.events)

    breakdown: Dict[str, int] = {}
    for flag_type, events_by_row in by_type.items():
        total = sum(_score_episode(flag_type, (end - start).total_seconds())
                    for start, end in _episodes(events_by_row, now))
        if total:
            breakdown[flag_type.value] = total
    return breakdown


def check(db: Session, session: domain.VivaSession) -> dict:
    """
    Current integrity status of a session. When the limit has been reached on a
    live session, the reason is stored on it (and stays — a later refresh of the
    exam page still ends the exam).
    """
    enabled = is_enabled()
    limit = auto_submit_points()
    warn_at = final_warning_points()

    breakdown = compute_points(db, session.id)
    points = sum(breakdown.values())

    terminate = bool(session.end_reason)
    if enabled and not terminate and points >= limit and limit > 0:
        if session.status == SessionStatus.IN_PROGRESS:
            session.end_reason = (
                f"Auto-submitted: integrity limit reached ({points} of {limit} points) — "
                + ", ".join(f"{k} {v}" for k, v in sorted(breakdown.items(), key=lambda kv: -kv[1]))
            )
            viva_repository.save_session(db, session)
            logger.info("Session %s auto-submitted for integrity: %s", session.id, session.end_reason)
        terminate = True

    return {
        "enabled": enabled,
        "points": points,
        "final_warning": enabled and not terminate and warn_at > 0 and points >= warn_at,
        "terminate": enabled and terminate,
        "end_reason": session.end_reason,
        "poll_seconds": poll_seconds(),
    }
