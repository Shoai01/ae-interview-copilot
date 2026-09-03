"""Shared chunk-quality helpers used by both ingestion (knowledge_service)
and generation (question_gen) so the two sides agree on what counts as a
usable piece of context."""


def is_good_chunk(text: str, min_length: int = 150) -> bool:
    """Reject chunks that are too short or too noisy (tables, page numbers,
    OCR garbage) to make a decent interview question or embedding target."""
    if len(text.strip()) < min_length:
        return False
    alnum_space = sum(1 for c in text if c.isalnum() or c.isspace())
    if alnum_space / max(1, len(text)) < 0.75:
        return False
    return True


def normalize_for_dedup(text: str) -> str:
    """Collapse whitespace/case so near-identical chunks (e.g. repeated
    headers/footers, or the same page split twice) hash the same."""
    return " ".join(text.split()).lower()
