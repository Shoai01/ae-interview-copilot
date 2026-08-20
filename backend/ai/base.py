from langchain_google_vertexai import VertexAIEmbeddings
from langchain_google_vertexai import ChatVertexAI

def get_embeddings_model():
    # Use LangChain's Vertex AI embeddings wrapper
    # Project is inferred from GOOGLE_APPLICATION_CREDENTIALS
    return VertexAIEmbeddings(model_name="text-embedding-004")

def get_chat_model(temperature=0.7):
    return ChatVertexAI(model_name="gemini-2.5-flash", temperature=temperature)
