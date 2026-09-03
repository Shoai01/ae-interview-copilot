from ai.base import get_embeddings_model
import os
import pymupdf as fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_community.vectorstores import FAISS
import random
import numpy as np
from langchain_google_vertexai import ChatVertexAI
from langchain_core.prompts import PromptTemplate
from models import domain
from ai.text_quality import is_good_chunk, normalize_for_dedup

# The directory where FAISS index will be saved
FAISS_INDEX_PATH = "faiss_index"

from pydantic import BaseModel, Field




def _existing_chunk_texts(vector_store: FAISS) -> set:
    """Normalized text of every chunk already in the index, for cross-document dedup."""
    texts = set()
    for doc_id in vector_store.index_to_docstore_id.values():
        doc = vector_store.docstore.search(doc_id)
        if doc is not None:
            texts.add(normalize_for_dedup(doc.page_content))
    return texts


def _filter_and_dedupe_chunks(chunks: list[str], metadatas: list[dict], already_seen: set = None):
    """
    Drop low-signal chunks (too short / too much non-text noise) and exact
    duplicates (repeated headers/footers, the same passage split twice)
    before they get embedded and stored. This keeps the index — and every
    chunk question_gen can later draw from — made of substantive, distinct
    content instead of noise or redundant copies.
    """
    seen_snapshot = set() if already_seen is None else set(already_seen)

    def dedupe_pass(apply_quality_filter: bool):
        seen = set(seen_snapshot)
        kept_chunks, kept_metadatas = [], []
        for chunk, metadata in zip(chunks, metadatas):
            if apply_quality_filter and not is_good_chunk(chunk):
                continue
            key = normalize_for_dedup(chunk)
            if key in seen:
                continue
            seen.add(key)
            kept_chunks.append(chunk)
            kept_metadatas.append(metadata)
        return kept_chunks, kept_metadatas

    kept_chunks, kept_metadatas = dedupe_pass(apply_quality_filter=True)
    if not kept_chunks and chunks:
        # The quality filter rejected everything (e.g. a short source doc
        # entirely below the noise threshold) — fall back to dedup-only so a
        # legitimate small document doesn't end up stored as zero chunks.
        kept_chunks, kept_metadatas = dedupe_pass(apply_quality_filter=False)
    return kept_chunks, kept_metadatas


def get_knowledge_documents(db, module_id: int):
    return db.query(domain.KnowledgeDocument).filter(domain.KnowledgeDocument.module_id == module_id).all()

def get_knowledge_document(db, doc_id: int):
    return db.query(domain.KnowledgeDocument).filter(domain.KnowledgeDocument.id == doc_id).first()

def delete_knowledge_document(db, doc: domain.KnowledgeDocument):
    db.delete(doc)
    db.commit()

def process_and_store_pdf(db=None, module_id=None, file_content: bytes = None, source_filename: str = ""):
    # 1. Extract Text from PDF using PyMuPDF from memory stream
    doc = fitz.open(stream=file_content, filetype="pdf")
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"
    
    if not full_text.strip():
        raise ValueError("No extractable text found in the PDF.")
        
    if db and module_id:
        doc_entry = domain.KnowledgeDocument(
            module_id=module_id,
            filename=source_filename,
            extracted_text=full_text
        )
        db.add(doc_entry)
        db.commit()
        db.refresh(doc_entry)
    
    # 2. Chunk the text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
    )
    raw_chunks = text_splitter.split_text(full_text)

    # We also want to store metadata so we know which module this chunk belongs to
    raw_metadatas = [{"module_id": module_id, "source": source_filename} for _ in raw_chunks]

    # 3. Generate embeddings and save to FAISS local vector store
    embeddings_model = get_embeddings_model()

    # Check if index already exists
    if os.path.exists(FAISS_INDEX_PATH):
        try:
            # Load existing and add new
            vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings_model, allow_dangerous_deserialization=True)
            # Drop low-signal/noisy chunks and anything that duplicates a chunk
            # already in the index, so question_gen only ever draws from
            # substantive, distinct context.
            chunks, metadatas = _filter_and_dedupe_chunks(
                raw_chunks, raw_metadatas, already_seen=_existing_chunk_texts(vector_store)
            )
            if chunks:
                vector_store.add_texts(texts=chunks, metadatas=metadatas)
                vector_store.save_local(FAISS_INDEX_PATH)
        except AssertionError:
            # The dimension of the existing index does not match the new embeddings
            print("FAISS dimension mismatch detected, rebuilding entire index...")
            rebuild_faiss_index(db)
            chunks = raw_chunks
        except Exception as e:
            print("Failed to append to existing FAISS index, rebuilding:", e)
            rebuild_faiss_index(db)
            chunks = raw_chunks
    else:
        # Create new index
        chunks, metadatas = _filter_and_dedupe_chunks(raw_chunks, raw_metadatas)
        if chunks:
            vector_store = FAISS.from_texts(texts=chunks, embedding=embeddings_model, metadatas=metadatas)
            # Save the index locally
            vector_store.save_local(FAISS_INDEX_PATH)

    return len(chunks)

def rebuild_faiss_index(db):
    """
    Rebuilds the entire FAISS index from the remaining KnowledgeDocument entries in the database.
    """
    import shutil
    
    # 1. Delete the existing FAISS index on disk
    if os.path.exists(FAISS_INDEX_PATH):
        shutil.rmtree(FAISS_INDEX_PATH)
        
    # 2. Get all remaining documents
    docs = db.query(domain.KnowledgeDocument).all()
    if not docs:
        return # Nothing to build
        
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
    )
    
    all_chunks = []
    all_metadatas = []
    seen_texts = set()

    for doc in docs:
        raw_chunks = text_splitter.split_text(doc.extracted_text)
        raw_metadatas = [{"module_id": doc.module_id, "source": doc.filename} for _ in raw_chunks]
        chunks, metadatas = _filter_and_dedupe_chunks(raw_chunks, raw_metadatas, already_seen=seen_texts)
        seen_texts.update(normalize_for_dedup(c) for c in chunks)
        all_chunks.extend(chunks)
        all_metadatas.extend(metadatas)

    if all_chunks:
        embeddings_model = get_embeddings_model()
        vector_store = FAISS.from_texts(texts=all_chunks, embedding=embeddings_model, metadatas=all_metadatas)
        vector_store.save_local(FAISS_INDEX_PATH)


