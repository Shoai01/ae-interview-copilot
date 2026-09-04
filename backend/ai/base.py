from typing import Any, Optional
from pydantic import Field
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_google_vertexai import ChatVertexAI
from langchain_google_vertexai._utils import create_retry_decorator
from google.genai.types import EmbedContentConfig

from models.domain import LLMCallSite
from services.llm_usage_service import track_llm_call


class TrackedVertexAIEmbeddings(VertexAIEmbeddings):
    """
    VertexAIEmbeddings that also records token usage to llm_usage_logs for the
    admin usage dashboard. The base LangChain wrapper only returns the raw
    vectors and silently discards the per-call token_count Vertex AI's
    embed_content API returns — this re-implements the retry call to capture
    it before handing back the same [[float]] shape callers already expect.
    """
    usage_db: Any = Field(default=None, exclude=True)
    usage_module_id: Optional[int] = Field(default=None, exclude=True)
    usage_user_id: Optional[int] = Field(default=None, exclude=True)

    def _get_embeddings_with_retry(
        self,
        texts: list,
        embeddings_type: Optional[str] = None,
        dimensions: Optional[int] = None,
        title: Optional[str] = None,
    ) -> list:
        retry_decorator = create_retry_decorator(max_retries=self.max_retries)

        @retry_decorator
        def _completion_with_retry_inner(generation_method, **kwargs):
            return generation_method(**kwargs)

        params = {
            "model": self.model_name,
            "contents": texts,
            "config": EmbedContentConfig(
                task_type=embeddings_type, output_dimensionality=dimensions, title=title
            ),
        }
        with track_llm_call(
            self.usage_db, LLMCallSite.EMBEDDING, self.model_name,
            module_id=self.usage_module_id, user_id=self.usage_user_id
        ) as usage:
            response = _completion_with_retry_inner(self.client.models.embed_content, **params)
            embeddings = response.embeddings or []
            token_total = sum(
                int(e.statistics.token_count)
                for e in embeddings
                if e.statistics and e.statistics.token_count is not None
            )
            # Only report a count if every embedding actually carried statistics —
            # a partial sum would silently understate usage.
            if embeddings and all(e.statistics and e.statistics.token_count is not None for e in embeddings):
                usage["input_tokens"] = token_total
                usage["output_tokens"] = 0  # embeddings have no generated/output tokens
            return [e.values for e in embeddings]


def get_embeddings_model(db=None, module_id: Optional[int] = None, user_id: Optional[int] = None):
    # Use LangChain's Vertex AI embeddings wrapper (subclassed for usage tracking)
    # Project is inferred from GOOGLE_APPLICATION_CREDENTIALS
    return TrackedVertexAIEmbeddings(
        model_name="text-embedding-004",
        usage_db=db,
        usage_module_id=module_id,
        usage_user_id=user_id,
    )

def get_chat_model(temperature=0.7):
    return ChatVertexAI(
        model_name="gemini-2.5-flash",
        temperature=temperature
    )
