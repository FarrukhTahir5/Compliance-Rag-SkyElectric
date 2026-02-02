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
        
        # Check if existing vector store exists
        if os.path.exists(self.vector_db_path):
            try:
                # Load existing vector store
                existing_vector_store = FAISS.load_local(
                    self.vector_db_path, 
                    self.embeddings, 
                    allow_dangerous_deserialization=True
                )
                
                # Create new vector store with new documents
                new_vector_store = FAISS.from_texts(texts, self.embeddings, metadatas=metadatas)
                
                # Merge the vector stores
                existing_vector_store.merge_from(new_vector_store)
                
                # Save the merged vector store
                existing_vector_store.save_local(self.vector_db_path)
                
                return existing_vector_store
            except Exception as e:
                print(f"Error loading existing vector store, creating new one: {e}")
                # If loading fails, create a new one
                vector_store = FAISS.from_texts(texts, self.embeddings, metadatas=metadatas)
                vector_store.save_local(self.vector_db_path)
                return vector_store
        else:
            # Create new vector store if none exists
            vector_store = FAISS.from_texts(texts, self.embeddings, metadatas=metadatas)
            vector_store.save_local(self.vector_db_path)
            return vector_store

    def retrieve_similar_clauses(self, query_text: str, top_k: int = 5, doc_id: int = None):
        print(f"DEBUG: Searching for: '{query_text}' in vector store at {self.vector_db_path}")
        
        if not os.path.exists(self.vector_db_path):
            print(f"DEBUG: Vector store path does not exist: {self.vector_db_path}")
            return []
            
        try:
            vector_store = FAISS.load_local(self.vector_db_path, self.embeddings, allow_dangerous_deserialization=True)
            print(f"DEBUG: Vector store loaded successfully")
            
            # Check how many documents are in the vector store
            try:
                total_docs = len(vector_store.docstore._dict)
                print(f"DEBUG: Vector store contains {total_docs} documents")
            except:
                print("DEBUG: Could not determine vector store size")
        except Exception as e:
            print(f"DEBUG: Error loading vector store: {e}")
            return []
        
        # We increase k because we might filter out some documents
        # For a truly robust solution, we'd use the vector store's native filter if supported
        docs_with_scores = vector_store.similarity_search_with_score(query_text, k=top_k * 2)
        
        print(f"DEBUG: Found {len(docs_with_scores)} documents before filtering")
        
        if doc_id:
            filtered_docs = [
                (doc, score) for doc, score in docs_with_scores 
                if doc.metadata.get('doc_id') == doc_id
            ]
            print(f"DEBUG: After filtering by doc_id {doc_id}: {len(filtered_docs)} documents")
            return filtered_docs[:top_k]
        
        print(f"DEBUG: Returning {len(docs_with_scores[:top_k])} documents")
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

    def answer_general_question(self, query: str, context: str):
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful compliance assistant. 
            Answer the user's question accurately based ONLY on the provided document context.
            If the context doesn't contain the answer, say you don't know based on these documents.
            Always cite the Source/Page number if available in the context.
            
            Context:
            {context}"""),
            ("user", "{query}")
        ])
        
        chain = prompt | self.llm
        try:
            result = chain.invoke({"query": query, "context": context})
            return result.content
        except Exception as e:
            return f"Error answering question: {str(e)}"

rag_engine = RAGEngine()
