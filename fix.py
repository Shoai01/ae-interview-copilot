import re

with open('backend/services/knowledge_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract GeneratedQuestion class
gq_match = re.search(r'class GeneratedQuestion\(BaseModel\):\n.*?ideal_answer: str = Field\(description="Bullet points of what a good answer should include"\)\n', content, re.DOTALL)
gq_code = gq_match.group(0)

gen_match = re.search(r'def generate_dynamic_questions_for_session\(db, module_id: int, count: int = 5, set_name: str = "AI Generated Set"\):.*', content, re.DOTALL)
gen_code = gen_match.group(0)

question_gen_content = f"""import os
import random
import numpy as np
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field
from models import domain
from ai.base import get_embeddings_model, get_chat_model
from services.knowledge_service import FAISS_INDEX_PATH

{gq_code}
{gen_code}
"""

question_gen_content = question_gen_content.replace('llm = ChatVertexAI(model_name="gemini-2.5-flash", temperature=0.7)', 'llm = get_chat_model(temperature=0.7)')

with open('backend/ai/question_gen.py', 'w', encoding='utf-8') as f:
    f.write(question_gen_content)

# Remove them from knowledge_service.py
new_content = content.replace(gq_code, '')
new_content = new_content.replace(gen_code, '')

get_emb_func = """def get_embeddings_model():
    # Use LangChain's Vertex AI embeddings wrapper
    # Project is inferred from GOOGLE_APPLICATION_CREDENTIALS
    return VertexAIEmbeddings(model_name="text-embedding-004")"""
new_content = new_content.replace(get_emb_func, '')

new_content = 'from ai.base import get_embeddings_model\n' + new_content

with open('backend/services/knowledge_service.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
