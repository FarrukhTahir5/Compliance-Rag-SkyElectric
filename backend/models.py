from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import datetime

Base = declarative_base()

class Document(Base):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True)
    filename = Column(String)
    file_type = Column(String) # 'regulation' or 'customer'
    version = Column(String)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    clauses = relationship("Clause", back_populates="document")

class Clause(Base):
    __tablename__ = 'clauses'
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey('documents.id'))
    clause_id = Column(String) # e.g., "A.5.1"
    text = Column(Text)
    page_number = Column(Integer)
    severity = Column(String) # "MUST", "SHOULD", etc.
    vector_index = Column(Integer) # Index in FAISS
    document = relationship("Document", back_populates="clauses")

class Assessment(Base):
    __tablename__ = 'assessments'
    id = Column(Integer, primary_key=True)
    customer_doc_id = Column(Integer, ForeignKey('documents.id'))
    regulation_doc_id = Column(Integer, ForeignKey('documents.id'))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    results = relationship("AssessmentResult", back_populates="assessment")

class AssessmentResult(Base):
    __tablename__ = 'assessment_results'
    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey('assessments.id'))
    customer_clause_id = Column(Integer, ForeignKey('clauses.id'))
    regulation_clause_id = Column(Integer, ForeignKey('clauses.id'))
    status = Column(String) # "COMPLIANT", "PARTIAL", "NON_COMPLIANT"
    risk = Column(String) # "HIGH", "MEDIUM", "LOW"
    reasoning = Column(Text)
    evidence_text = Column(Text) # Literal text from doc
    confidence = Column(Float)
    assessment = relationship("Assessment", back_populates="results")

DATABASE_URL = "sqlite:///./backend/data/compliance.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
