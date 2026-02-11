from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import os
import asyncio
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordRequestForm

# Project-specific imports
from backend.database import get_db, engine
from backend import models, schemas, crud
from backend.auth import create_access_token, get_current_user, verify_password, get_password_hash, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, oauth2_scheme

# Existing RAG and file handling imports (will be refactored later)
from .legacy_models import store, Document, Clause, Assessment, AssessmentResult
from .ingestion import parse_document
from .rag import rag_engine
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import io
import shutil

# Ensure storage directory exists
STORAGE_DIR = "backend/storage"
os.makedirs(STORAGE_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database tables are created via create_db.py script
    # No session cleanup task for now, as chat history is persistent
    yield

app = FastAPI(title="3D Compliance Intelligence API", lifespan=lifespan)

# CORS setup for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.xlsx'}

# Dependency to get session ID (for existing RAG endpoints, will be updated)
def get_sid(x_session_id: str = Header("default")):
    return x_session_id

# --- User Authentication Endpoints ---
@app.post("/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/auth/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# --- Chat Session Endpoints ---
@app.post("/users/me/sessions", response_model=schemas.ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    session: schemas.ChatSessionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return crud.create_user_chat_session(db=db, session=session, user_id=current_user.id)

@app.get("/users/me/sessions", response_model=List[schemas.ChatSessionResponse])
def read_chat_sessions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    sessions = crud.get_chat_sessions(db=db, user_id=current_user.id, skip=skip, limit=limit)
    return sessions

@app.get("/users/me/sessions/{session_id}", response_model=schemas.ChatSessionResponse)
def read_chat_session(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id
    ).first()
    if db_session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return db_session

# --- Chat Message Endpoints ---
@app.post("/users/me/sessions/{session_id}/messages", response_model=schemas.ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def create_chat_message(
    session_id: int,
    message: schemas.ChatMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id
    ).first()
    if db_session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return crud.create_chat_message(db=db, message=message, session_id=session_id)

@app.get("/users/me/sessions/{session_id}/messages", response_model=List[schemas.ChatMessageResponse])
def read_chat_messages(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    db_session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id
    ).first()
    if db_session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    messages = crud.get_chat_messages(db=db, session_id=session_id, skip=skip, limit=limit)
    return messages

# --- Existing RAG and File Handling Endpoints (Placeholder for now) ---
# These endpoints will need significant refactoring to integrate with the new
# user and chat session management. For now, they are left as is, but their
# functionality related to 'session_id' and 'store' will not work correctly
# without further changes.

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    file_type: str = Form(...),  # 'regulation' | 'customer'
    version: str = Form("1.0"),
    namespace: str = Form(None),
    session_id: str = Depends(get_sid) # This will need to be tied to a user's chat session
):
    # Check file extension
    filename_lower = file.filename.lower()
    if not any(filename_lower.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400, 
            detail=f"Only {', '.join(ALLOWED_EXTENSIONS)} files are supported."
        )
    
    print(f"DEBUG: Uploading {file.filename} as {file_type} to session {session_id}")
    content = await file.read()
    doc_id = parse_document(content, file.filename, file_type, version, namespace=namespace, session_id=session_id)
    
    # Save the file to physical storage
    file_path = os.path.join(STORAGE_DIR, f"{doc_id}_{file.filename}")
    with open(file_path, "wb") as f:
        f.write(content)
        
    print(f"DEBUG: Uploaded {file.filename}, doc_id: {doc_id} in session {session_id}")
    return {"doc_id": doc_id, "filename": file.filename}

@app.get("/documents/{doc_id}/download")
def download_document(doc_id: int, session_id: str = Depends(get_sid)):
    doc = store.get_document(session_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Find the file in storage
    # We prefix with doc_id_ to avoid name collisions
    file_path = None
    for f in os.listdir(STORAGE_DIR):
        if f.startswith(f"{doc_id}_"):
            file_path = os.path.join(STORAGE_DIR, f)
            break
            
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found in storage")
        
    return FileResponse(file_path, filename=doc.filename)

@app.get("/documents")
def list_documents(session_id: str = Depends(get_sid)):
    docs = store.get_all_documents(session_id)
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "version": d.version,
            "uploaded_at": d.uploaded_at.isoformat()
        }
        for d in docs
    ]

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: int, session_id: str = Depends(get_sid)):
    doc = store.get_document(session_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete related assessments
    assessments = store.get_assessments_by_doc(session_id, doc_id)
    for a in assessments:
        store.delete_assessment(session_id, a.id)
    
    # Delete document and its clauses
    store.delete_document(session_id, doc_id)
    
    return {"message": "Document deleted"}

@app.patch("/documents/{doc_id}/type")
def update_document_type(doc_id: int, file_type: str = Form(...), session_id: str = Depends(get_sid)):
    doc = store.get_document(session_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if file_type not in ["regulation", "customer"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    doc.file_type = file_type
    return {"message": "Document type updated", "file_type": file_type}

@app.post("/reset")
def reset_data(session_id: str = Depends(get_sid)):
    store.reset(session_id)
    rag_engine.clear_index(session_id=session_id)
    return {"message": f"Data cleared for session {session_id}"}

@app.post("/assess")
async def assess_compliance(
    customer_doc_id: int = Form(...),
    regulation_doc_id: int = Form(...),
    use_kb: bool = Form(False),
    session_id: str = Depends(get_sid)
):
    print(f"DEBUG: Assessing compliance for session {session_id}. Customer Doc: {customer_doc_id}, Reg Doc: {regulation_doc_id}")
    customer_clauses = store.get_clauses_by_document(session_id, customer_doc_id)
    print(f"DEBUG: Found {len(customer_clauses)} clauses in customer doc")
    
    if not customer_clauses:
        print(f"DEBUG: FAILURE - No clauses for customer doc {customer_doc_id}")
        raise HTTPException(status_code=400, detail="No clauses found in customer document")
    
    assessment = store.add_assessment(
        session_id=session_id,
        customer_doc_id=customer_doc_id, 
        regulation_doc_id=regulation_doc_id
    )
    
    import asyncio
    semaphore = asyncio.Semaphore(10)
    
    async def process_clause(c_clause):
        async with semaphore:
            # Retrieve similar regulation clauses
            similar_docs = rag_engine.retrieve_similar_clauses(c_clause.text, doc_id=regulation_doc_id, use_kb=use_kb, session_id=session_id)
            
            if not similar_docs:
                return None
                
            best_match_doc, score = similar_docs[0]
            reg_clause_id_val = best_match_doc.metadata['clause_id']
            reg_clause = store.get_clause_by_doc_and_clause_id(session_id, regulation_doc_id, reg_clause_id_val)
            
            if not reg_clause:
                return None
                
            # Run LLM Analysis
            analysis = await rag_engine.analyze_compliance(c_clause.text, reg_clause.text)
            
            # Defensive logging
            if not isinstance(analysis, dict) or 'status' not in analysis:
                print(f"DEBUG: CRITICAL ERROR - Analysis returned invalid object: {analysis}")
            
            try:
                return store.add_result(
                    session_id=session_id,
                    assessment_id=assessment.id,
                    customer_clause_id=c_clause.id,
                    regulation_clause_id=reg_clause.id,
                    status=analysis.get('status', 'UNKNOWN'),
                    risk=analysis.get('risk', 'HIGH'),
                    reasoning=analysis.get('reasoning', 'Analysis failed'),
                    evidence_text=analysis.get('evidence_text', 'N/A'),
                    confidence=analysis.get('confidence', 0.0)
                )
            except Exception as e:
                print(f"DEBUG: Error adding result to store: {e}")
                print(f"DEBUG: Analysis was: {analysis}")
                return None

    # Process all clauses in parallel with concurrency limit
    results_raw = await asyncio.gather(*[process_clause(c) for c in customer_clauses])
    results = [r for r in results_raw if r is not None]
        
    return {"assessment_id": assessment.id, "results_count": len(results)}

@app.get("/debug/vector-store")
def debug_vector_store(session_id: str = Depends(get_sid)):
    info = {
        "vector_store_exists": rag_engine.vector_store is not None,
        "total_documents": len(store.get_session(session_id).documents),
        "total_clauses": len(store.get_session(session_id).clauses),
        "session_id": session_id
    }
    
    if rag_engine.vector_store is not None:
        try:
            # Note: This is a hacky way to check size, might not be accurate for Pinecone
            info["vector_store_size"] = "Dynamic (Pinecone)"
        except Exception as e:
            info["vector_store_error"] = str(e)
    
    return info

@app.post("/chat")
async def chat_with_docs(
    query: str = Form(...),
    use_kb: bool = Form(False),
    session_id: str = Depends(get_sid)
):
    # Search across documents with optional knowledge base
    similar_docs = rag_engine.retrieve_similar_clauses(query, top_k=5, use_kb=use_kb, session_id=session_id)
    
    if not similar_docs:
        return {"answer": "I couldn't find any relevant information in your documents. Please upload some documents first."}
    
    # Build context with document NAME (not just ID), numbered for citation mapping
    context_parts = []
    for i, (d, score) in enumerate(similar_docs, 1):
        # Fallback to metadata if store is cleared (e.g. for permanent KB)
        doc_id = d.metadata.get('doc_id')
        doc_obj = store.get_document(session_id, int(doc_id)) if doc_id else None
        doc_name = doc_obj.filename if doc_obj else d.metadata.get('doc_name', 'Unknown')
        clause_id = d.metadata.get('clause_id', 'N/A')
        page = d.metadata.get('page_number', 'N/A')
        context_parts.append(
            f"REF [{i}]:\n"
            f"File: {doc_name} | Clause: {clause_id} | Page: {page}\n"
            f"Content: {d.page_content}"
        )
    
    context = "\n\n---\n\n".join(context_parts)
    
    # Use LLM to answer the question based on context
    answer = rag_engine.answer_general_question(query, context)
    return {"answer": answer}

@app.get("/graph/{assessment_id}")
def get_graph_data(assessment_id: int, session_id: str = Depends(get_sid)):
    assessment = store.get_assessment(session_id, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    results = store.get_results_by_assessment(session_id, assessment_id)
    
    nodes = []
    edges = []
    
    # Add regulation nodes (planets)
    reg_clauses = store.get_clauses_by_document(session_id, assessment.regulation_doc_id)
    for rc in reg_clauses:
        nodes.append({
            "id": f"reg_{rc.id}",
            "label": rc.clause_id,
            "type": "regulation",
            "page": rc.page_number,
            "doc_id": assessment.regulation_doc_id,
            "text": rc.text[:100] + "..."
        })
        
    # Add customer nodes and edges
    for r in results:
        cust_clause = store.get_clause(session_id, r.customer_clause_id)
        nodes.append({
            "id": f"cust_{r.customer_clause_id}",
            "label": cust_clause.clause_id if cust_clause else str(r.customer_clause_id),
            "type": "customer",
            "status": r.status,
            "risk": r.risk,
            "doc_id": assessment.customer_doc_id,
            "page": cust_clause.page_number if cust_clause else None,
            "reasoning": r.reasoning,
            "evidence": r.evidence_text
        })
        edges.append({
            "from": f"cust_{r.customer_clause_id}",
            "to": f"reg_{r.regulation_clause_id}",
            "status": r.status
        })
        
    return {"nodes": nodes, "edges": edges}

@app.get("/report/{assessment_id}")
def generate_report(assessment_id: int, session_id: str = Depends(get_sid)):
    assessment = store.get_assessment(session_id, assessment.id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    results = store.get_results_by_assessment(session_id, assessment.id)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    elements.append(Paragraph(f"SkyEngineering Report", styles['Title']))
    elements.append(Spacer(1, 12))
    
    # Header info
    customer_doc = store.get_document(session_id, assessment.customer_doc_id)
    reg_doc = store.get_document(session_id, assessment.regulation_doc_id)
    
    elements.append(Paragraph(f"Project Document: {customer_doc.filename if customer_doc else 'N/A'}", styles['Normal']))
    elements.append(Paragraph(f"Regulatory Standard: {reg_doc.filename if reg_doc else 'N/A'}", styles['Normal']))
    elements.append(Paragraph(f"Date: {assessment.created_at.strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Spacer(1, 24))
    
    # Table data
    data = [["Clause ID", "Status", "Risk", "Reasoning"]]
    for r in results:
        cust_clause = store.get_clause(session_id, r.customer_clause_id)
        reasoning = r.reasoning
        data.append([
            cust_clause.clause_id if cust_clause else f"Clause {r.customer_clause_id}",
            r.status,
            r.risk,
            Paragraph(reasoning, styles['Normal'])
        ])
    
    table = Table(data, colWidths=[80, 80, 60, 280])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#6366f1")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=compliance_report_{assessment_id}.pdf"
    })

# Mount the frontend static files
# Make sure to build the frontend first: npm run build
DIST_PATH = "frontend/dist"
if os.path.exists(DIST_PATH):
    app.mount("/assets", StaticFiles(directory=f"{DIST_PATH}/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve the file if it exists, otherwise serve index.html for SPA routing
        local_path = os.path.join(DIST_PATH, full_path)
        if full_path != "" and os.path.exists(local_path):
            return FileResponse(local_path)
        return FileResponse(os.path.join(DIST_PATH, "index.html"))
else:
    print(f"WARNING: Static files not found at {DIST_PATH}. Frontend will not be served.")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)