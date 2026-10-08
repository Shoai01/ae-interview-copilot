"""
One-off / repeatable backfill for the STT keyterm pipeline: extracts keyterms
for every active question that hasn't been processed yet (existing bank content
from before the pipeline existed, edits, or earlier failed attempts).

    python backfill_keyterms.py            # only questions still pending
    python backfill_keyterms.py --all      # re-extract every active question

Safe to re-run: already-processed questions are skipped (unless --all), and
re-extraction replaces a question's links rather than duplicating them.
"""
import argparse
import logging

from core.database import SessionLocal
from models import domain
from services import keyterm_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--all", action="store_true", help="re-extract every active question, not just pending ones")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.all:
            ids = [r[0] for r in db.query(domain.QuestionBank.id).filter(domain.QuestionBank.is_active.is_(True)).order_by(domain.QuestionBank.id)]
        else:
            ids = keyterm_service.pending_question_ids(db)
        print(f"{len(ids)} question(s) to process")
        done = keyterm_service.extract_and_store(db, ids)
        print(f"Extracted keyterms for {done}/{len(ids)} question(s)")
        if done < len(ids):
            print("Some questions failed and stay pending — check the log above and re-run.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
