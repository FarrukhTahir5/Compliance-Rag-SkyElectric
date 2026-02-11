import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, Info, Database, Download, X, ChevronsLeft, Plus, LogOut, Settings, Layout, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatHistory from './ChatHistory';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const Sidebar = ({ onAssessmentComplete, selectedNode, onStartAnalysis, onNodeClick, assessmentId, mode, useKb, toggleSidebar, chatHistory, onLoadHistory, onNewChat, selectedChatId, isMobileOpen, closeMobileSidebar }) => {
    const { user, logout } = useAuth();
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [isUploadVisible, setIsUploadVisible] = useState(false);

    useEffect(() => {
        if (user) {
            fetchDocs();
        } else {
            setFiles([]);
        }
    }, [user]);

    const fetchDocs = async () => {
        try {
            const res = await axios.get(`${API_BASE}/documents`);
            setFiles(res.data);
            const allDocIds = res.data.map(doc => doc.id);
            setSelectedDocs(allDocIds);
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!confirm("Delete this document?")) return;
        try {
            await axios.delete(`${API_BASE}/documents/${id}`);
            fetchDocs();
        } catch (e) {
            alert("Delete failed");
        }
    };

    const handleUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (!selectedFiles.length) return;
        setUploading(true);
        setUploadProgress(0);
        try {
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('file_type', 'customer');
                await axios.post(`${API_BASE}/upload`, formData, {
                    onUploadProgress: (p) => {
                        const percent = Math.round((p.loaded * 100) / p.total);
                        setUploadProgress(percent);
                    }
                });
            }
            fetchDocs();
        } catch (e) {
            alert("Upload failed.");
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const isGraphMode = mode === 'graph';
    const selectedFiles = files.filter(f => selectedDocs.includes(f.id));
    const hasStandard = selectedFiles.some(f => f.file_type === 'regulation');
    const hasProject = selectedFiles.some(f => f.file_type === 'customer');
    const canAnalyze = hasStandard && hasProject;

    const sidebarContent = (
        <div
            className="glass-panel"
            style={{
                width: '320px',
                height: '100vh',
                padding: '24px',
                flexShrink: 0,
                borderRadius: 0,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                background: '#ffffff',
                boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px var(--primary-glow)' }}>
                        <Layout size={20} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px', margin: 0, color: 'var(--text-main)' }}>
                            SKYCHAT
                        </h1>
                        <p style={{ fontSize: '9px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Neural Platform</p>
                    </div>
                </div>
                <button
                    onClick={toggleSidebar}
                    className="btn-secondary mobile-hide"
                    style={{ padding: '8px', borderRadius: '50%', width: '36px', height: '36px' }}
                >
                    <ChevronsLeft size={18} />
                </button>
                <button
                    onClick={closeMobileSidebar}
                    className="btn-secondary mobile-only"
                    style={{ padding: '8px', borderRadius: '50%', width: '36px', height: '36px', border: 'none' }}
                >
                    <X size={20} />
                </button>
            </div>

            {user && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: '#f8fafc',
                    borderRadius: '16px',
                    marginBottom: '28px',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', color: 'white' }}>
                        {user.email[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{user.email}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Operative</div>
                    </div>
                    <button onClick={logout} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ef4444'} onMouseLeave={(e) => e.target.style.color = '#64748b'}>
                        <LogOut size={16} />
                    </button>
                </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '28px', paddingRight: '4px' }}>
                <section>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Database size={14} /> Knowledge Core
                        </h3>
                        <button
                            onClick={() => setIsUploadVisible(!isUploadVisible)}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 700, borderRadius: '8px' }}
                        >
                            {isUploadVisible ? 'Close' : <Plus size={14} />}
                        </button>
                    </div>

                    <AnimatePresence>
                        {isUploadVisible && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden', marginBottom: '16px' }}
                            >
                                <label className="btn-primary" style={{ fontSize: '12px', padding: '12px', width: '100%', marginBottom: '12px' }}>
                                    <Upload size={16} /> Import Data
                                    <input type="file" hidden accept=".pdf,.docx" multiple onChange={handleUpload} />
                                </label>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {uploading && (
                            <div style={{ padding: '12px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '11px', marginBottom: '6px', color: 'var(--primary)', fontWeight: 600 }}>Syncing... {uploadProgress}%</div>
                                <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${uploadProgress}%` }}
                                        style={{ height: '100%', background: 'var(--primary)' }}
                                    />
                                </div>
                            </div>
                        )}
                        {files.map((f) => (
                            <motion.div
                                key={f.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                style={{
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                                }}
                            >
                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: f.file_type === 'regulation' ? 'rgba(79, 70, 229, 0.05)' : 'rgba(14, 165, 233, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileText size={14} color={f.file_type === 'regulation' ? 'var(--primary)' : 'var(--secondary)'} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>{f.filename}</div>
                                </div>
                                <button onClick={(e) => handleDelete(e, f.id)} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }} onMouseEnter={(e) => e.target.style.color = '#ef4444'} onMouseLeave={(e) => e.target.style.color = '#cbd5e1'}>
                                    <X size={12} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <ChatHistory
                        history={chatHistory}
                        onLoadHistory={(chat) => {
                            onLoadHistory(chat);
                            if (window.innerWidth <= 768) closeMobileSidebar();
                        }}
                        onNewChat={() => {
                            onNewChat();
                            if (window.innerWidth <= 768) closeMobileSidebar();
                        }}
                        selectedChatId={selectedChatId}
                    />
                </section>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '11px', borderRadius: '10px' }}>
                        <Settings size={14} /> Systems
                    </button>
                    <button className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '11px', borderRadius: '10px' }}>
                        <Info size={14} /> Help
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="mobile-hide">
                <motion.div
                    initial={{ x: -300 }}
                    animate={{ x: 0 }}
                    style={{ position: 'relative', zIndex: 100 }}
                >
                    {sidebarContent}
                </motion.div>
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <div className="mobile-only" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeMobileSidebar}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{ position: 'relative', zIndex: 1, height: '100%' }}
                        >
                            {sidebarContent}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Sidebar;