import os
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from typing import List, Dict

load_dotenv()

# Check if Pinecone is configured
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "")
USE_PINECONE = PINECONE_API_KEY and PINECONE_API_KEY != "your-pinecone-api-key"

if USE_PINECONE:
    from langchain_pinecone import PineconeVectorStore
    from pinecone import Pinecone
else:
    from langchain_community.vectorstores import FAISS

class RAGEngine:
    def __init__(self):
        # Using Gemini-2.0-flash-lite for enhanced performance and efficiency
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            output_dimensionality=768
        )
        self.llm = ChatGoogleGenerativeAI(
            model="models/gemini-2.0-flash-lite", 
            temperature=0,
            max_output_tokens=4096  # Explicit high limit for long answer lists
        )
        self.use_pinecone = USE_PINECONE
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "compliance-rag")
        self.vector_store = None
        
        if self.use_pinecone:
            try:
                # We don't initialize vector_store globally with a namespace here 
                # because we want to switch between namespaces dynamically
                self.vector_store = PineconeVectorStore(index_name=self.index_name, embedding=self.embeddings)
                print(f"DEBUG: Using Pinecone index: {self.index_name}")
            except Exception as e:
                print(f"DEBUG: Pinecone init failed, falling back to FAISS: {e}")
                self.use_pinecone = False
                self.vector_store = None
        else:
            print("DEBUG: Using in-memory FAISS (Pinecone not configured)")
            self.vector_store = None

    def get_session_namespace(self, session_id: str) -> str:
        """Helper to generate session-specific namespace."""
        return f"session_{session_id}"

    def ingest_documents(self, clauses: List[Dict], session_id: str = None, namespace: str = None):
        """Ingest documents into vector store."""
        if not clauses:
            return None
            
        # Determine namespace
        if not namespace:
            namespace = self.get_session_namespace(session_id) if session_id else "session"
            
        texts = [c['text'] for c in clauses]
        metadatas = [
            {
                "clause_id": str(c['clause_id']), 
                "doc_id": str(c['doc_id']),
                "doc_name": c.get('doc_name', 'Unknown'),
                "page_number": int(c.get('page_number', 1))
            } 
            for c in clauses
        ]
        
        try:
            if self.use_pinecone:
                try:
                    # Specific namespace for ingestion
                    self.vector_store.add_texts(texts, metadatas=metadatas, namespace=namespace)
                    print(f"DEBUG: Ingested {len(texts)} texts into namespace: {namespace}")
                except Exception as e:
                    if "dimension" in str(e).lower():
                        print(f"CRITICAL: Pinecone dimension mismatch. GEMINI uses 768, current index uses older dimension.")
                        raise Exception("Pinecone Dimension Mismatch: Please recreate your Pinecone index with 768 dimensions for Gemini.")
                    raise e
            else:
                # FAISS mode (no namespaces in basic FAISS wrapper)
                if self.vector_store is None:
                    self.vector_store = FAISS.from_texts(texts, self.embeddings, metadatas=metadatas)
                else:
                    self.vector_store.add_texts(texts, metadatas=metadatas)
        except Exception as e:
            print(f"DEBUG: Vector Store Ingestion Error: {e}")
            raise e
        
        return self.vector_store

    def clear_index(self, session_id: str = None, namespace: str = None):
        """Clear a specific namespace in the vector index."""
        if not namespace:
            namespace = self.get_session_namespace(session_id) if session_id else "session"
            
        if self.use_pinecone:
            try:
                from pinecone import Pinecone
                pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
                index = pc.Index(self.index_name)
                # Note: deleting with delete_all=True only works if we don't specify namespace? 
                # Actually index.delete(delete_all=True, namespace=namespace) is correct for Pinecone.
                index.delete(delete_all=True, namespace=namespace)
                print(f"DEBUG: Cleared Pinecone namespace: {namespace}")
            except Exception as e:
                print(f"DEBUG: Pinecone Clear Index Error (Namespace: {namespace}): {e}")
        else:
            self.vector_store = None

    def reciprocal_rank_fusion(self, search_results_list: List[List[tuple]], k=60):
        """
        Reciprocal Rank Fusion (RRF) to merge results from different sources.
        search_results_list: List of result lists, each result is (doc, score)
        """
        fused_scores = {}
        for results in search_results_list:
            for rank, (doc, _) in enumerate(results):
                # Composite key: source_type + doc_name + clause_id
                source_type = doc.metadata.get('source_type', 'UNKNOWN')
                doc_name = doc.metadata.get('doc_name', 'Unknown')
                clause_id = doc.metadata.get('clause_id', 'Unknown')
                key = f"{source_type}_{doc_name}_{clause_id}"
                
                if key not in fused_scores:
                    fused_scores[key] = (doc, 0)
                
                # RRF Formula: 1 / (k + rank + 1)
                fused_scores[key] = (doc, fused_scores[key][1] + 1 / (k + rank + 1))
        
        # Sort by fused score descending
        fused_results = sorted(fused_scores.values(), key=lambda x: x[1], reverse=True)
        return fused_results

    def retrieve_similar_clauses(self, query_text: str, top_k: int = 8, use_kb: bool = False, session_id: str = None, doc_id: int = None):
        if self.vector_store is None:
            return []
            
        session_ns = self.get_session_namespace(session_id) if session_id else "session"
        
        kb_results = []
        doc_results = []
        
        if self.use_pinecone:
            # Search Session Store (Uploaded Docs)
            try:
                doc_results = self.vector_store.similarity_search_with_score(
                    query_text, 
                    k=top_k, 
                    namespace=session_ns
                )
                # Label source for clarity
                for d, s in doc_results: d.metadata["source_type"] = "DOC"
            except Exception as e:
                print(f"DEBUG: Pinecone session search error: {e}")
                
            # Search Knowledge Base (Permanent)
            if use_kb:
                try:
                    kb_results = self.vector_store.similarity_search_with_score(
                        query_text, 
                        k=top_k, 
                        namespace="permanent"
                    )
                    # Label source for clarity
                    for d, s in kb_results: d.metadata["source_type"] = "KB"
                except Exception as e:
                    print(f"DEBUG: Pinecone KB search error: {e}")
        else:
            # FAISS fallback (no namespaces)
            all_res = self.vector_store.similarity_search_with_score(query_text, k=top_k * 2)
            for d, s in all_res: d.metadata["source_type"] = "FAISS"
            return all_res[:top_k]

        # Filter by doc_id if specified (usually for compliance assessment against a specific reg)
        if doc_id:
            combined = doc_results + kb_results
            filtered = [
                (doc, score) for doc, score in combined 
                if doc.metadata.get('doc_id') == str(doc_id)
            ]
            return filtered[:top_k]

        # Use RRF to fuse KB and Uploaded Doc results
        fused = self.reciprocal_rank_fusion([kb_results, doc_results])
        return fused[:top_k]

    async def analyze_compliance(self, customer_clause: str, regulation_context: str):
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a compliance expert. Compare the provided customer clause against the regulation context.
            Identify if it is COMPLIANT, PARTIAL, or NON_COMPLIANT.
            Provide:
            1. Status
            2. Risk Level (HIGH, MEDIUM, LOW)
            3. Reasoning
            4. Literal Evidence (quote from the regulation)
            5. Confidence score (0.0 to 1.0)
            
            Format response as JSON with those keys."""),
            ("user", "Customer Clause: {customer}\n\nRegulation Context: {context}")
        ])
        
        chain = prompt | self.llm
        print(f"DEBUG: Calling LLM for compliance analysis...")
        try:
            res = await chain.ainvoke({"customer": customer_clause, "context": regulation_context})
            print(f"DEBUG: LLM response received")
        except Exception as e:
            print(f"DEBUG: LLM Invocation Error: {e}")
            return {
                "status": "UNKNOWN",
                "risk": "HIGH",
                "reasoning": f"AI analysis failed: {str(e)}",
                "evidence_text": "N/A",
                "confidence": 0.0
            }
        
        import json
        import re
        
        try:
            content = res.content.strip()
            start = content.find('{')
            end = content.rfind('}')
            
            if start != -1 and end != -1:
                content = content[start:end+1]
            
            data = json.loads(content)
            
            normalized = {}
            for k, v in data.items():
                key = str(k).lower().replace(" ", "_")
                normalized[key] = v
                
            final = {
                "status": normalized.get("status", normalized.get("compliance_status", "UNKNOWN")),
                "risk": normalized.get("risk", normalized.get("risk_level", "HIGH")),
                "reasoning": normalized.get("reasoning", normalized.get("description", "No reasoning provided")),
                "evidence_text": normalized.get("evidence_text", normalized.get("literal_evidence", normalized.get("evidence", "N/A"))),
                "confidence": normalized.get("confidence", normalized.get("confidence_score", 0.0))
            }
            return final
        except Exception as e:
            print(f"DEBUG: CRITICAL - JSON Parse Error in rag.py: {e}")
            print(f"DEBUG: RAW content was: {res.content}")
            return {
                "status": "UNKNOWN",
                "risk": "HIGH",
                "reasoning": f"Failed to interpret AI response: {str(e)}",
                "evidence_text": "N/A",
                "confidence": 0.0
            }

    def answer_general_question(self, query: str, context: str, history: List[Dict] = None):
        history_str = ""
        if history:
            history_str = "\n".join([f"{m['role']}: {m['content']}" for m in history])

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful compliance assistant for SkyElectric.
            
            TASK 1: INTENT DETECTION
            - If the user says "hi", "hello", or general greetings, respond with a BRIEF, friendly greeting. 
            - If the user asks a question, PROVIDE DIRECT ANSWERS IMMEDIATELY.

            STRICT CONSTRAINT:
            - NEVER say "I will proceed to answer", "I will now answer", or similar planning phrases.
            - NEVER list the questions without providing their answers in the SAME message.

            INSTRUCTIONS FOR BALANCING KNOWLEDGE:
            1. **Internal Knowledge**: You are an expert in engineering, compliance, and regulatory standards. Use your extensive internal training data to provide context, explain general concepts, and answer industry-standard questions.
            2. **Document Context**: Use the provided Uploaded Documents ([DOC]) or Knowledge Base ([KB]) primarily for project-specific data, unique site details, and verifying specific clauses from the user's files.
            3. **Citation Strategy**: 
               - If an answer is derived from the provided context (DOC or KB), cite it using [DOC n] or [KB n].
               - If an answer is general industry knowledge not found in the documents, you do not need to cite a document, but you should mention your general expertise.
            4. **Conversational Tone**: Sound like a professional collaborator. Avoid making it look like you *only* know what is in the provided snippets.

            CITATION & SOURCE UNIFICATION (UNIFY DUPLICATE IDS):
            - Assign ONE UNIQUE index per UNIQUE (File + Clause) pair. 
            - If you use content from a specific file/clause multiple times, it MUST use the same [DOC n] or [KB n] index throughout the response.
            - NEVER assign different indices to the same document filename.
            
            RESPONSE FORMAT (MANDATORY):
            1. Lead with the primary answer(s).
            2. Use a numbered list for multiple answers.
               - (Optional) Start with a brief phrase like "Based on my general knowledge and the uploaded documents..." if appropriate, but never a generic placeholder.
            3. Use **bold** for key terms.
            4. **MANDATORY SOURCES SECTION (ONLY IF CITED):**
               - At the very end, include the SOURCES section ONLY IF you used content from [DOC n] or [KB n] in your response.
               - IF NO CITATIONS ARE USED, DO NOT INCLUDE THE "SOURCES:" HEADER OR SECTION AT ALL.
            
            SOURCES SECTION FORMAT (IF APPLICABLE):
            SOURCES:
            - [Source Type] File: filename | Clause: ID | Page: #
            (List each unique filename/clause combo ONCE only)
            
            Conversation History:
            {history}
            
            Context:
            {context}"""),
            ("user", "{query}")
        ])
        
        chain = prompt | self.llm
        res = chain.invoke({"query": query, "context": context, "history": history_str})
        return res.content


# Global RAG instance
rag_engine = RAGEngine()
