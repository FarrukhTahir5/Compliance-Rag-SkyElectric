import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, Info, Database, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const Sidebar = ({ onAssessmentComplete, selectedNode, onStartAnalysis, onNodeClick, assessmentId }) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedDocs, setSelectedDocs] = useState([]);
    
    // Color palette for file highlighting
    const colors = [
        { bg: '#70df27ff', border: '#21e03aff', name: 'green' },
        { bg: '#4ecdc4', border: '#26a69a', name: 'teal' },
        { bg: '#45b7d1', border: '#2196f3', name: 'blue' },
        { bg: '#96ceb4', border: '#66bb6a', name: 'green' },
        { bg: '#ffeaa7', border: '#ffeb3b', name: 'yellow' },
        { bg: '#dda0dd', border: '#ba68c8', name: 'plum' },
        { bg: '#fab1a0', border: '#ff7043', name: 'orange' },
        { bg: '#fd79a8', border: '#e91e63', name: 'pink' },
        { bg: '#a29bfe', border: '#673ab7', name: 'purple' },
        { bg: '#6c5ce7', border: '#3f51b5', name: 'indigo' }
    ];
    
    const getFileColor = (index) => colors[index % colors.length];

    useEffect(() => {
        fetchDocs();
    }, []);

    const fetchDocs = async () => {
        try {
            const res = await axios.get(`${API_BASE}/documents`);
            setFiles(res.data);
            
            // Auto-select all uploaded documents
            const allDocIds = res.data.map(doc => doc.id);
            setSelectedDocs(allDocIds);
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!confirm("Delete this document?")) return;

        // Optimistic update
        const originalFiles = [...files];
        const originalSelected = [...selectedDocs];
        setFiles(files.filter(f => f.id !== id));
        setSelectedDocs(selectedDocs.filter(docId => docId !== id));

        try {
            await axios.delete(`${API_BASE}/documents/${id}`);
            // Refresh in background to stay in sync
            fetchDocs();
        } catch (e) {
            alert("Delete failed");
            setFiles(originalFiles); // Rollback if failed
            setSelectedDocs(originalSelected);
        }
    };

    const handleReset = async () => {
        if (!confirm("This will clear ALL documents and assessments. Proceed?")) return;
        try {
            await axios.post(`${API_BASE}/reset`);
            fetchDocs();
            setSelectedDocs([]);
            onAssessmentComplete(null); // Reset graph
        } catch (e) { alert("Reset failed"); }
    };

    const handleUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (!selectedFiles.length) return;

        // Check file types
        for (const file of selectedFiles) {
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                alert("Only PDF files are allowed.");
                return;
            }
        }

        // Check max 10 documents total
        if (files.length + selectedFiles.length > 10) {
            alert("Maximum 10 documents allowed. Please remove some documents first.");
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const uploadPromises = selectedFiles.map(async (file, index) => {
                const formData = new FormData();
                formData.append('file', file);
                // Set all documents as 'customer' type since we're treating them uniformly
                formData.append('file_type', 'customer');

                return await axios.post(`${API_BASE}/upload`, formData, {
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        // Average progress across all files
                        const totalProgress = ((index + (percentCompleted / 100)) / selectedFiles.length) * 100;
                        setUploadProgress(Math.round(totalProgress));
                    }
                });
            });

            await Promise.all(uploadPromises);
            fetchDocs(); // This will auto-select all documents including new ones
        } catch (e) {
            alert("Upload failed. Check if backend is running.");
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const runAssessment = async () => {
        if (selectedDocs.length < 1) {
            alert("Please upload at least 1 document to analyze.");
            return;
        }

        onStartAnalysis(); // Trigger loading state immediately in App.jsx

        try {
            // Get all selected documents
            const selectedFiles = files.filter(f => selectedDocs.includes(f.id));
            
            if (selectedFiles.length === 0) {
                alert("No documents selected for analysis.");
                onAssessmentComplete(null);
                return;
            }

            // For now, we'll use the first two documents for the backend API
            // If there's only one document, use it for both customer and regulation
            const firstDoc = selectedFiles[0];
            const secondDoc = selectedFiles.length > 1 ? selectedFiles[1] : firstDoc;

            const res = await axios.post(`${API_BASE}/assess?customer_doc_id=${firstDoc.id}&regulation_doc_id=${secondDoc.id}`);
            onAssessmentComplete(res.data.assessment_id);
        } catch (e) {
            alert("Assessment failed. Ensure API key is set in backend.");
            onAssessmentComplete(null);
        }
    };

    const toggleDocSelection = (docId) => {
        setSelectedDocs(prev => {
            if (prev.includes(docId)) {
                return prev.filter(id => id !== docId);
            } else {
                return [...prev, docId];
            }
        });
    };

    return (
        <div className="glass-panel" style={{ width: '400px', height: '100vh', padding: '24px', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }}>
            <h1 style={{ fontSize: '24px', margin: '0 0 24px 0', background: 'linear-gradient(to right, #a855f7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Compliance Galaxy
            </h1>

            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', textTransform: 'uppercase', opacity: 0.6 }}>
                    <Upload size={16} /> Data Ingestion
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '12px' }}>
                    <label className="btn-primary" style={{ fontSize: '12px', textAlign: 'center', padding: '12px', background: 'linear-gradient(135deg, #4ecdc4 0%, #45b7d1 100%)' }}>
                        📎 UPLOAD DOCUMENTS (Max 10)
                        <input type="file" hidden accept=".pdf" multiple onChange={(e) => handleUpload(e)} />
                    </label>
                    <div style={{ fontSize: '10px', opacity: 0.6, textAlign: 'center', marginTop: '8px', padding: '8px', background: 'rgba(78, 205, 196, 0.1)', borderRadius: '6px', border: '1px solid rgba(78, 205, 196, 0.3)' }}>
                        ✨ Documents are automatically selected for analysis after upload!
                        <br />Click any document to toggle selection. All document types are supported.
                    </div>
                </div>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', textTransform: 'uppercase', opacity: 0.6 }}>
                    <Database size={16} /> Knowledge Base
                    {selectedDocs.length > 0 && (
                        <span style={{ 
                            marginLeft: 'auto',
                            background: 'linear-gradient(135deg, #4ecdc4, #45b7d1)', 
                            color: 'white', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            fontSize: '10px', 
                            fontWeight: 'bold'
                        }}>
                            {selectedDocs.length}/{files.length} SELECTED
                        </span>
                    )}
                </h3>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {uploading && (
                        <div style={{
                            padding: '12px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FileText size={18} color="#a855f7" className="animate-pulse" />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>Uploading...</div>
                                    <div style={{ fontSize: '11px', opacity: 0.5 }}>{uploadProgress}% completed</div>
                                </div>
                            </div>
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                height: '2px',
                                background: 'linear-gradient(to right, #a855f7, #6366f1)',
                                width: `${uploadProgress}%`,
                                transition: 'width 0.2s ease-out'
                            }}></div>
                        </div>
                    )}
                    {files.map((f, index) => {
                        const color = getFileColor(index);
                        const isSelected = selectedDocs.includes(f.id);
                        
                        return (
                            <div
                                key={f.id}
                                onClick={() => toggleDocSelection(f.id)}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: isSelected
                                        ? `linear-gradient(135deg, ${color.bg}40, ${color.bg}20)`
                                        : 'rgba(255,255,255,0.05)',
                                    border: `2px solid ${isSelected ? color.border : 'transparent'}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    position: 'relative',
                                    transition: 'all 0.2s ease',
                                    boxShadow: isSelected ? `0 0 15px ${color.bg}30` : 'none'
                                }}
                            >
                                <div
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: color.bg,
                                        boxShadow: `0 0 8px ${color.bg}60`,
                                        animation: isSelected ? 'pulse 2s infinite' : 'none'
                                    }}
                                />
                                <FileText size={18} color={isSelected ? color.border : '#888'} />
                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                    <div style={{ 
                                        fontSize: '14px', 
                                        fontWeight: isSelected ? 600 : 500, 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap',
                                        color: isSelected ? color.border : 'inherit'
                                    }}>
                                        {f.filename}
                                    </div>
                                    <div style={{ fontSize: '11px', opacity: 0.5 }}>
                                        v{f.version} • {f.file_type} • {color.name}
                                    </div>
                                </div>
                                {isSelected && (
                                    <div style={{
                                        background: color.bg,
                                        color: 'white',
                                        borderRadius: '10px',
                                        padding: '2px 8px',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase'
                                    }}>
                                        SELECTED
                                    </div>
                                )}
                                <button
                                    onClick={(e) => handleDelete(e, f.id)}
                                    style={{ 
                                        background: 'transparent', 
                                        border: 'none', 
                                        color: '#ef4444', 
                                        opacity: 0.5, 
                                        cursor: 'pointer', 
                                        padding: '4px' 
                                    }}
                                    onMouseEnter={(e) => e.target.style.opacity = 1}
                                    onMouseLeave={(e) => e.target.style.opacity = 0.5}
                                >
                                    <XCircle size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={runAssessment}
                    disabled={selectedDocs.length < 1}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        marginTop: '16px',
                        padding: '14px',
                        background: selectedDocs.length < 1 
                            ? 'rgba(255,255,255,0.1)' 
                            : selectedDocs.length === 1
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                        color: selectedDocs.length < 1 ? 'rgba(255,255,255,0.3)' : 'white',
                        boxShadow: selectedDocs.length > 0 ? '0 0 20px rgba(168, 85, 247, 0.4)' : 'none',
                        transform: selectedDocs.length > 0 ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {selectedDocs.length === 0
                        ? "📥 UPLOAD DOCUMENTS FIRST"
                        : selectedDocs.length === 1
                            ? "🔍 ANALYZE 1 DOCUMENT"
                            : `🚀 ANALYZE ${selectedDocs.length} DOCUMENTS`}
                </button>
                <button
                    onClick={handleReset}
                    style={{ width: '100%', marginTop: '12px', padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                >
                    RESET ALL DATABASE
                </button>

                {assessmentId && (
                    <button
                        onClick={() => window.open(`${API_BASE}/report/${assessmentId}`, '_blank')}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            marginTop: '24px',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <Download size={18} />
                        DOWNLOAD PDF REPORT
                    </button>
                )}
            </section>

            <AnimatePresence>
                {selectedNode && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="glass-panel"
                        style={{ padding: '20px', background: 'rgba(255,255,255,0.03)' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            {selectedNode.status === 'COMPLIANT' ? <CheckCircle color="#10b981" size={24} /> : selectedNode.status === 'PARTIAL' ? <AlertTriangle color="#f59e0b" size={24} /> : selectedNode.status === 'NON_COMPLIANT' ? <XCircle color="#ef4444" size={24} /> : <Info color="#6366f1" size={24} />}
                            <h3 style={{ margin: 0, flex: 1 }}>Clause {selectedNode.label}</h3>
                            {selectedNode.page && (
                                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', marginRight: '8px' }}>
                                    PAGE {selectedNode.page}
                                </span>
                            )}
                            <button
                                onClick={() => onNodeClick(null)}
                                style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: '#ef4444', 
                                    cursor: 'pointer', 
                                    padding: '4px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.7,
                                    transition: 'opacity 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = 1}
                                onMouseLeave={(e) => e.target.style.opacity = 0.7}
                                title="Close details"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <span style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>AI Reasoning</span>
                            <p style={{ fontSize: '14px', opacity: 0.8, lineHeight: 1.6, margin: 0 }}>
                                {selectedNode.reasoning || selectedNode.text}
                            </p>
                        </div>

                        {selectedNode.evidence && selectedNode.evidence !== 'N/A' && (
                            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderLeft: '3px solid #6366f1', borderRadius: '4px' }}>
                                <span style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: '4px', color: '#6366f1' }}>Literal Evidence Citation</span>
                                <p style={{ fontSize: '13px', fontStyle: 'italic', opacity: 0.9, margin: 0 }}>
                                    "{selectedNode.evidence}"
                                </p>
                            </div>
                        )}

                        {selectedNode.risk && (
                            <div style={{ display: 'flex', gap: '24px' }}>
                                <div>
                                    <span style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase' }}>Risk Level</span>
                                    <div style={{ color: selectedNode.risk === 'HIGH' ? '#ef4444' : selectedNode.risk === 'MEDIUM' ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}>{selectedNode.risk}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '11px', opacity: 0.5, textTransform: 'uppercase' }}>Status</span>
                                    <div style={{ color: selectedNode.status === 'COMPLIANT' ? '#10b981' : selectedNode.status === 'PARTIAL' ? '#f59e0b' : '#ef4444', fontWeight: 'bold' }}>{selectedNode.status}</div>
                                </div>
                            </div>
                        )}
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Sidebar;
