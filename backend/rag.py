import os
import json
from typing import List, Dict
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

# Load environment variables
load_dotenv()

class RAGEngine:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.vector_db_path = "backend/data/faiss_index"
        self.llm = ChatOpenAI(model="gpt-4-turbo-preview", temperature=0)

    def ingest_documents(self, clauses: List[Dict]):
        texts = [c['text'] for c in clauses]
        metadatas = [
            {"clause_id": c['clause_id'], "doc_id": c['doc_id'], "page_number": c.get('page_number', 1)} 
            for c in clauses
        ]
        
        vector_store = FAISS.from_texts(texts, self.embeddings, metadatas=metadatas)
        vector_store.save_local(self.vector_db_path)
        return vector_store

    def retrieve_similar_clauses(self, query_text: str, top_k: int = 5, doc_id: int = None):
        if not os.path.exists(self.vector_db_path):
            return []
        vector_store = FAISS.load_local(self.vector_db_path, self.embeddings, allow_dangerous_deserialization=True)
        
        # We increase k because we might filter out some documents
        # For a truly robust solution, we'd use the vector store's native filter if supported
        docs_with_scores = vector_store.similarity_search_with_score(query_text, k=top_k * 2)
        
        if doc_id:
            filtered_docs = [
                (doc, score) for doc, score in docs_with_scores 
                if doc.metadata.get('doc_id') == doc_id
            ]
            return filtered_docs[:top_k]
        
        return docs_with_scores[:top_k]

    def analyze_compliance(self, customer_clause: str, regulation_clause: str):
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a compliance analyst. 
            Compare the 'Customer Clause' against the 'Regulation Clause'.
            Determine if the customer clause is compliant.
            
            IMPORTANT: You MUST identify the exact text snippet from the Customer Clause that serves as evidence or violates the regulation.
            
            Output JSON format:
            {{
                "status": "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT",
                "risk": "HIGH" | "MEDIUM" | "LOW",
                "reasoning": "Reasoning for the decision",
                "evidence_text": "The exact literal quote from the customer document that supports this decision",
                "confidence": 0.0-1.0
            }}"""),
            ("user", "Customer Clause: {customer_clause}\n\nRegulation Clause: {regulation_clause}")
        ])
        
        chain = prompt | self.llm | JsonOutputParser()
        try:
            result = chain.invoke({
                "customer_clause": customer_clause,
                "regulation_clause": regulation_clause
            })
            return result
        except Exception as e:
            return {
                "status": "NON_COMPLIANT",
                "risk": "HIGH",
                "reasoning": f"Error during analysis: {str(e)}",
                "evidence_text": "N/A",
                "confidence": 0.0
            }

rag_engine = RAGEngine()
