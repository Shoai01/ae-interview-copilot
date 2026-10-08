"""
STT keyterm pipeline.

Whenever a question is added to / edited in the question bank, a background job
extracts the spoken domain terms from it (ai.keyterm_extractor) and stores them
in stt_keyterms, linked to the questions that mention them. At exam time the
frontend (live captions) and the Enhance/regeneration path (batch STT) both ask
get_keyterms() for the terms to send to Deepgram — so there is one source of
truth instead of hand-synced lists.

Serving rules: a term is only served while an *active* question links to it and
an admin hasn't disabled it. Deepgram caps keyterms at ~500 tokens per request,
so the served list is ranked and trimmed to fit.
"""
import logging
import math
import os
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Callable, Iterable, Optional

from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from models import domain
from services.deepgram_keyterms import BASE_DEEPGRAM_KEYTERMS

logger = logging.getLogger(__name__)

EXTRACTION_BATCH_SIZE = 15
MAX_TERM_WORDS = 4
MIN_TERM_CHARS = 2
MAX_TERM_CHARS = 40
# Deepgram allows ~500 tokens of keyterms per request; stay under it and under
# a sane count so no single term's boost gets diluted.
MAX_SERVED_TERMS = 100
SERVED_TOKEN_BUDGET = 450

# Ordinary English / generic platform nouns. A term made only of these is
# rejected: boosting them makes Deepgram insert them where they weren't said.
GENERIC_WORDS = frozenset("""
a an the and or of to in on for with without by from at as is are be it its this that these those
process processes workflow workflows server servers project projects data run runs running step steps
publish catalog sequential parallel agent agents user users file files name names value values
field fields type types list lists table tables input output error errors test tests job jobs task
tasks system systems tool tools feature features option options setting settings page pages
screen screens button buttons menu menus click select create delete update edit view open close
start stop begin end execute execution
""".split())

_WHITESPACE = re.compile(r"\s+")
_EDGE_PUNCT = " \t\r\n\"'`.,;:!?()[]{}"


def term_key(term: str) -> str:
    return _WHITESPACE.sub(" ", term.strip()).lower()


def normalize_term(raw: str) -> Optional[str]:
    """Tidy one LLM-proposed term; None if it shouldn't be boosted."""
    if not isinstance(raw, str):
        return None
    term = _WHITESPACE.sub(" ", raw.strip(_EDGE_PUNCT))
    if not (MIN_TERM_CHARS <= len(term) <= MAX_TERM_CHARS):
        return None
    words = term.split(" ")
    if len(words) > MAX_TERM_WORDS:
        return None
    if not any(ch.isalpha() for ch in term):
        return None  # numbers / symbols only
    if all(w.lower().strip(_EDGE_PUNCT) in GENERIC_WORDS for w in words):
        return None
    if len(words) == 1:
        # A lone all-lowercase word ("locator") is an ordinary word the
        # recognizer already handles; only distinctive singles earn a slot:
        # acronyms (RPA), camelCase names (XPath, SolFlows), terms with digits /
        # hyphens / underscores, or capitalized names (Selenium).
        distinctive = (
            any(ch.isupper() for ch in term[1:])
            or any(ch.isdigit() for ch in term)
            or any(ch in "-_." for ch in term)
            or (term[0].isupper() and len(term) >= 4)
        )
        if not distinctive:
            return None
    return term


def clean_terms(raw_terms: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for raw in raw_terms:
        term = normalize_term(raw)
        if term is None:
            continue
        key = term_key(term)
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(term)
    return cleaned


# ---------------------------------------------------------------- storage ----

def _replace_question_links(db: Session, question: domain.QuestionBank, terms: list[str]) -> None:
    db.query(domain.QuestionKeyterm).filter(domain.QuestionKeyterm.question_id == question.id).delete(synchronize_session=False)
    for term in terms:
        key = term_key(term)
        row = db.query(domain.SttKeyterm).filter(
            domain.SttKeyterm.module_id == question.module_id,
            domain.SttKeyterm.term_key == key,
        ).first()
        if row is None:
            row = domain.SttKeyterm(module_id=question.module_id, term=term, term_key=key, enabled=True)
            db.add(row)
            db.flush()
        db.add(domain.QuestionKeyterm(question_id=question.id, keyterm_id=row.id))


def extract_and_store(
    db: Session,
    question_ids: Iterable[int],
    extractor: Optional[Callable[..., dict[int, list[str]]]] = None,
) -> int:
    """
    Extract + store keyterms for the given questions, EXTRACTION_BATCH_SIZE per
    LLM call. A failed batch leaves its questions pending (keyterms_extracted_at
    stays NULL) for the next backfill and never raises. Returns how many
    questions were processed.
    """
    if extractor is None:
        from ai.keyterm_extractor import extract_keyterms
        extractor = extract_keyterms

    ids = list(dict.fromkeys(question_ids))
    if not ids:
        return 0

    questions = db.query(domain.QuestionBank).filter(domain.QuestionBank.id.in_(ids)).order_by(domain.QuestionBank.id).all()
    by_module: dict[int, list[domain.QuestionBank]] = {}
    for q in questions:
        by_module.setdefault(q.module_id, []).append(q)

    processed = 0
    for module_id, module_questions in by_module.items():
        for start in range(0, len(module_questions), EXTRACTION_BATCH_SIZE):
            batch = module_questions[start:start + EXTRACTION_BATCH_SIZE]
            try:
                extracted = extractor([(q.text, q.ideal_answer) for q in batch], module_id=module_id, db=db)
                done = 0
                for position, q in enumerate(batch):
                    if position not in extracted:
                        continue  # model skipped it; stays pending
                    _replace_question_links(db, q, clean_terms(extracted[position]))
                    q.keyterms_extracted_at = datetime.utcnow()
                    done += 1
                db.commit()
                processed += done
            except Exception:
                db.rollback()
                logger.exception("Keyterm extraction failed for module %s (%d questions left pending)", module_id, len(batch))
    return processed


def pending_question_ids(db: Session) -> list[int]:
    """Active questions that still need extraction (new, edited, or failed before)."""
    rows = db.query(domain.QuestionBank.id).filter(
        domain.QuestionBank.keyterms_extracted_at.is_(None),
        domain.QuestionBank.is_active.is_(True),
    ).order_by(domain.QuestionBank.id).all()
    return [r[0] for r in rows]


# -------------------------------------------------------------- scheduling ---

# One worker: jobs run one at a time, so concurrent bulk uploads can't race on
# the (module_id, term_key) unique constraint.
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="keyterm-extract")


def pipeline_enabled() -> bool:
    return os.getenv("KEYTERM_PIPELINE_ENABLED", "1") != "0"


def _run_job(question_ids: list[int]) -> None:
    # The request's DB session is closed once the response is sent, so the job
    # opens its own.
    from core.database import SessionLocal
    db = SessionLocal()
    try:
        extract_and_store(db, question_ids)
    except Exception:
        logger.exception("Keyterm extraction job crashed")
    finally:
        db.close()


def schedule_extraction(question_ids: Iterable[int]) -> None:
    """Fire-and-forget: extract keyterms for these questions in the background.
    Never raises and never blocks the caller (question creation must not depend
    on the LLM)."""
    ids = [i for i in dict.fromkeys(question_ids) if i is not None]
    if not ids or not pipeline_enabled():
        return
    try:
        _executor.submit(_run_job, ids)
    except Exception:
        logger.exception("Could not schedule keyterm extraction")


# ----------------------------------------------------------------- serving ---

def _estimated_tokens(term: str) -> int:
    # Conservative: real tokenizers average ~3-4 chars/token on this kind of text.
    return math.ceil(len(term) / 3) + 1


def get_keyterms(db: Session, module_id: Optional[int] = None) -> list[str]:
    """
    Keyterms to send to Deepgram: the curated base list first, then extracted
    terms ranked by how many active questions mention them (multi-word terms
    break ties, then alphabetical), trimmed to Deepgram's limits. `module_id`
    scopes to one module; None spans all modules.
    """
    query = (
        db.query(domain.SttKeyterm.term, func.count(distinct(domain.QuestionBank.id)).label("mentions"))
        .join(domain.QuestionKeyterm, domain.QuestionKeyterm.keyterm_id == domain.SttKeyterm.id)
        .join(domain.QuestionBank, domain.QuestionBank.id == domain.QuestionKeyterm.question_id)
        .filter(domain.SttKeyterm.enabled.is_(True), domain.QuestionBank.is_active.is_(True))
    )
    if module_id is not None:
        query = query.filter(domain.SttKeyterm.module_id == module_id)
    rows = query.group_by(domain.SttKeyterm.id, domain.SttKeyterm.term).all()
    extracted = sorted(rows, key=lambda r: (-r.mentions, -len(r.term.split()), r.term.lower()))

    served: list[str] = []
    seen: set[str] = set()
    budget = SERVED_TOKEN_BUDGET
    for term in [*BASE_DEEPGRAM_KEYTERMS, *(r.term for r in extracted)]:
        key = term_key(term)
        if key in seen:
            continue
        cost = _estimated_tokens(term)
        if len(served) >= MAX_SERVED_TERMS or cost > budget:
            continue
        seen.add(key)
        served.append(term)
        budget -= cost
    return served


def list_terms(db: Session, module_id: Optional[int] = None) -> list[dict]:
    """Admin view: every extracted term with how many active questions use it."""
    mentions = func.count(distinct(domain.QuestionBank.id))
    query = (
        db.query(domain.SttKeyterm, mentions.label("mentions"))
        .outerjoin(domain.QuestionKeyterm, domain.QuestionKeyterm.keyterm_id == domain.SttKeyterm.id)
        .outerjoin(
            domain.QuestionBank,
            (domain.QuestionBank.id == domain.QuestionKeyterm.question_id) & (domain.QuestionBank.is_active.is_(True)),
        )
    )
    if module_id is not None:
        query = query.filter(domain.SttKeyterm.module_id == module_id)
    rows = query.group_by(domain.SttKeyterm.id).order_by(mentions.desc(), domain.SttKeyterm.term).all()
    return [
        {"id": k.id, "module_id": k.module_id, "term": k.term, "enabled": k.enabled, "mentions": count}
        for k, count in rows
    ]


def set_term_enabled(db: Session, keyterm_id: int, enabled: bool) -> Optional[domain.SttKeyterm]:
    row = db.query(domain.SttKeyterm).filter(domain.SttKeyterm.id == keyterm_id).first()
    if row is None:
        return None
    row.enabled = enabled
    db.commit()
    db.refresh(row)
    return row
