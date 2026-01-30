from pypdf import PdfReader
from io import BytesIO
from typing import List, Dict
import re
from .models import SessionLocal, Document, Clause
from .rag import rag_engine

def parse_pdf(file_content: bytes, filename: str, file_type: str, version: str = "1.0"):
    reader = PdfReader(BytesIO(file_content))
    clauses = []
    
    # regex for clause-like patterns
    pattern = r'(?m)^(\d+\.[\d\.]+|[A-Z]\.[\d\.]+|Article\s+\d+:?)\s+(.*)'
    
    for page_num, page in enumerate(reader.pages):
        page_text = page.extract_text()
        matches = list(re.finditer(pattern, page_text))
        
        if not matches:
            # Fallback: split by double newlines on this page
            paragraphs = page_text.split("\n\n")
            for i, p in enumerate(paragraphs):
                if len(p.strip()) > 20:
                    clauses.append({
                        "clause_id": f"P-{page_num}-{i}",
                        "text": p.strip(),
                        "page_number": page_num + 1,
                        "severity": "UNKNOWN"
                    })
        else:
            for i in range(len(matches)):
                start = matches[i].start()
                end = matches[i+1].start() if i + 1 < len(matches) else len(page_text)
                clause_id = matches[i].group(1).strip()
                text = page_text[start:end].strip()
                clauses.append({
                    "clause_id": clause_id,
                    "text": text,
                    "page_number": page_num + 1,
                    "severity": "MUST" if "shall" in text.lower() or "must" in text.lower() else "SHOULD"
                })

    # Save to DB
    db = SessionLocal()
    db_doc = Document(filename=filename, file_type=file_type, version=version)
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    ingest_clauses = []
    for c in clauses:
        db_clause = Clause(
            document_id=db_doc.id,
            clause_id=c['clause_id'],
            text=c['text'],
            page_number=c['page_number'],
            severity=c['severity']
        )
        db.add(db_clause)
        ingest_clauses.append({
            "clause_id": c['clause_id'],
            "doc_id": db_doc.id,
            "text": c['text'],
            "page_number": c['page_number']
        })
    
    db.commit()
    
    doc_id = db_doc.id # Capture ID while session is active

    # Ingest into Vector DB
    if file_type == 'regulation':
        rag_engine.ingest_documents(ingest_clauses)
    
    db.close()
    return doc_id
