"""
In-memory data store for temporary document storage.
Data is cleared when the server restarts.
"""
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class Document:
    id: int
    filename: str
    file_type: str  # 'regulation' or 'customer'
    version: str
    uploaded_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Clause:
    id: int
    document_id: int
    clause_id: str  # e.g., "A.5.1"
    text: str
    page_number: int
    severity: str  # "MUST", "SHOULD", etc.


@dataclass
class Assessment:
    id: int
    customer_doc_id: int
    regulation_doc_id: int
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class AssessmentResult:
    id: int
    assessment_id: int
    customer_clause_id: int
    regulation_clause_id: int
    status: str  # "COMPLIANT", "PARTIAL", "NON_COMPLIANT"
    risk: str  # "HIGH", "MEDIUM", "LOW"
    reasoning: str
    evidence_text: str
    confidence: float


class InMemoryStore:
    """Thread-safe in-memory data store."""
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        """Clear all data."""
        self.documents: Dict[int, Document] = {}
        self.clauses: Dict[int, Clause] = {}
        self.assessments: Dict[int, Assessment] = {}
        self.assessment_results: Dict[int, AssessmentResult] = {}
        self._doc_counter = 0
        self._clause_counter = 0
        self._assessment_counter = 0
        self._result_counter = 0
    
    # Document operations
    def add_document(self, filename: str, file_type: str, version: str = "1.0") -> Document:
        self._doc_counter += 1
        doc = Document(
            id=self._doc_counter,
            filename=filename,
            file_type=file_type,
            version=version
        )
        self.documents[doc.id] = doc
        return doc
    
    def get_document(self, doc_id: int) -> Optional[Document]:
        return self.documents.get(doc_id)
    
    def get_all_documents(self) -> List[Document]:
        return list(self.documents.values())
    
    def delete_document(self, doc_id: int) -> bool:
        if doc_id not in self.documents:
            return False
        del self.documents[doc_id]
        # Delete related clauses
        clause_ids_to_delete = [c.id for c in self.clauses.values() if c.document_id == doc_id]
        for cid in clause_ids_to_delete:
            del self.clauses[cid]
        return True
    
    # Clause operations
    def add_clause(self, document_id: int, clause_id: str, text: str, 
                   page_number: int, severity: str) -> Clause:
        self._clause_counter += 1
        clause = Clause(
            id=self._clause_counter,
            document_id=document_id,
            clause_id=clause_id,
            text=text,
            page_number=page_number,
            severity=severity
        )
        self.clauses[clause.id] = clause
        return clause
    
    def get_clause(self, clause_id: int) -> Optional[Clause]:
        return self.clauses.get(clause_id)
    
    def get_clauses_by_document(self, doc_id: int) -> List[Clause]:
        return [c for c in self.clauses.values() if c.document_id == doc_id]
    
    def get_clause_by_doc_and_clause_id(self, doc_id: int, clause_id_str: str) -> Optional[Clause]:
        for c in self.clauses.values():
            if c.document_id == doc_id and c.clause_id == clause_id_str:
                return c
        return None
    
    # Assessment operations
    def add_assessment(self, customer_doc_id: int, regulation_doc_id: int) -> Assessment:
        self._assessment_counter += 1
        assessment = Assessment(
            id=self._assessment_counter,
            customer_doc_id=customer_doc_id,
            regulation_doc_id=regulation_doc_id
        )
        self.assessments[assessment.id] = assessment
        return assessment
    
    def get_assessment(self, assessment_id: int) -> Optional[Assessment]:
        return self.assessments.get(assessment_id)
    
    def get_assessments_by_doc(self, doc_id: int) -> List[Assessment]:
        return [a for a in self.assessments.values() 
                if a.customer_doc_id == doc_id or a.regulation_doc_id == doc_id]
    
    # Assessment result operations
    def add_result(self, assessment_id: int, customer_clause_id: int, 
                   regulation_clause_id: int, status: str, risk: str,
                   reasoning: str, evidence_text: str, confidence: float) -> AssessmentResult:
        self._result_counter += 1
        result = AssessmentResult(
            id=self._result_counter,
            assessment_id=assessment_id,
            customer_clause_id=customer_clause_id,
            regulation_clause_id=regulation_clause_id,
            status=status,
            risk=risk,
            reasoning=reasoning,
            evidence_text=evidence_text,
            confidence=confidence
        )
        self.assessment_results[result.id] = result
        return result
    
    def get_results_by_assessment(self, assessment_id: int) -> List[AssessmentResult]:
        return [r for r in self.assessment_results.values() if r.assessment_id == assessment_id]
    
    def delete_results_by_assessment(self, assessment_id: int):
        result_ids = [r.id for r in self.assessment_results.values() if r.assessment_id == assessment_id]
        for rid in result_ids:
            del self.assessment_results[rid]
    
    def delete_assessment(self, assessment_id: int):
        self.delete_results_by_assessment(assessment_id)
        if assessment_id in self.assessments:
            del self.assessments[assessment_id]


# Global in-memory store instance
store = InMemoryStore()
