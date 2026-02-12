import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Maximize2, Minimize2, Zap, Shield, Globe, Upload, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logo from '../assets/cleanlogo.png';
import ReactiveBackground from './ReactiveBackground';


const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const ChatDialog = ({ isFullScreen = false, useKb = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [animationState, setAnimationState] = useState('idle');
    const [attachedFiles, setAttachedFiles] = useState([]); // OpenAI style staging
    const scrollRef = useRef();
    const messagesEndRef = useRef(null);


    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const renderMessage = (content) => {
        if (!content) return null;

        // Split by SOURCES: to separate citations
        const parts = content.split(/SOURCES:/i);
        const mainText = parts[0];
        const sourcesText = parts[1];

        // Function to handle bold text (**text**)
        const formatText = (text) => {
            const regex = /\*\*(.*?)\*\*/g;
            const segments = text.split(regex);
            return segments.map((part, i) =>
                i % 2 === 1 ? <b key={i} style={{ fontWeight: 800, color: 'inherit' }}>{part}</b> : part
            );
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{formatText(mainText)}</div>
                {sourcesText && (
                    <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(0,0,0,0.05)',
                        fontSize: '0.85em',
                        opacity: 0.8
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Globe size={14} /> SOURCES
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{sourcesText.trim()}</div>
                    </div>
                )}
            </div>
        );
    };

    useEffect(() => {
        const scrollToBottom = () => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            }
        };

        // Use a small timeout to ensure the DOM has updated
        const timeoutId = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(timeoutId);
    }, [messages]);

    const [uploading, setUploading] = useState(false);

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const validFiles = files.filter(file => {
            const name = file.name.toLowerCase();
            if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
                alert(`File ${file.name} is not a PDF or DOCX.`);
                return false;
            }
            return true;
        });

        setAttachedFiles(prev => [...prev, ...validFiles]);
        e.target.value = null; // Reset input
    };

    const removeFile = (index) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if ((!input.trim() && attachedFiles.length === 0) || loading || uploading) return;

        const currentInput = input;
        const currentFiles = [...attachedFiles];

        // Add user message to UI
        const fileNames = currentFiles.map(f => f.name).join(', ');
        const displayContent = currentInput + (fileNames ? `\n[Attached: ${fileNames}]` : '');

        const userMsg = { role: 'user', content: displayContent, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);

        setInput('');
        setAttachedFiles([]);
        setLoading(true);
        setAnimationState('thinking');

        try {
            // 1. Upload all and chunk files first if any
            for (const file of currentFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('file_type', 'customer');
                await axios.post(`${API_BASE}/upload`, formData);
            }

            // 2. Send chat query
            const formData = new FormData();
            formData.append('query', currentInput || "Tell me about the attached documents");
            formData.append('use_kb', useKb);
            const res = await axios.post(`${API_BASE}/chat`, formData);

            setAnimationState('response');
            setMessages(prev => [...prev, { role: 'bot', content: res.data.answer, timestamp: new Date() }]);
            // Reset to idle after response animation
            setTimeout(() => setAnimationState('idle'), 2000);
        } catch (e) {
            setAnimationState('idle');
            setMessages(prev => [...prev, { role: 'bot', content: "Failed to process request. Is the backend running?", timestamp: new Date() }]);
        } finally {
            setLoading(false);
        }
    };


    const containerStyle = isFullScreen ? {
        width: '100%',
        maxWidth: '1000px',
        height: '90%',
        maxHeight: '850px',
        background: 'rgba(15, 15, 20, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '32px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        position: 'relative'
    } : {

        position: 'fixed',
        bottom: '100px',
        right: '24px',
        width: '400px',
        height: '500px',
        background: 'rgba(20, 20, 25, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        zIndex: 101,
        overflow: 'hidden'
    };

    const chatContent = (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{
                padding: isFullScreen ? '24px' : '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                    <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 10px #10b981'
                    }}></div>
                    <span style={{ fontWeight: 'bold', fontSize: isFullScreen ? '20px' : '14px', color: '#ffffff' }}>
                        SkyEngineering AI
                    </span>
                </div>
                {!isFullScreen && (
                    <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                )}

            </div>

            {/* Messages */}
            <div ref={scrollRef} className="scroll-smooth" style={{
                flex: 1,
                padding: isFullScreen ? '32px' : '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                scrollBehavior: 'smooth',
                overflowAnchor: 'none'
            }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: isFullScreen ? '40px' : '20px', padding: '0 20px' }}>
                        <img src={logo} alt="SkyChat Logo" style={{ width: '100px', height: '80px', marginBottom: '0px' }} />
                        <h1 style={{ fontSize: isFullScreen ? '42px' : '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '12px' }}>
                            Welcome to SkyEngineering
                        </h1>
                        <p style={{ fontSize: isFullScreen ? '20px' : '16px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '48px' }}>
                            Ask questions, get help, or just chat!
                        </p>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '10px',
                            maxWidth: '700px',
                            margin: '0 auto'
                        }}>
                            {[
                                { title: 'Natural Conversations', desc: 'Chat naturally with our AI assistant', icon: <MessageSquare size={20} color="#8b5cf6" />, bg: 'rgba(255, 255, 255, 0.03)' },
                                { title: 'Fast Responses', desc: 'Get quick and accurate answers', icon: <Zap size={20} color="#f59e0b" />, bg: 'rgba(255, 255, 255, 0.03)' },
                                { title: 'Secure & Private', desc: 'Your conversations are protected', icon: <Shield size={20} color="#10b981" />, bg: 'rgba(255, 255, 255, 0.03)' },
                                { title: 'Always Available', desc: '24/7 assistance whenever you need it', icon: <Globe size={20} color="#3b82f6" />, bg: 'rgba(255, 255, 255, 0.03)' }
                            ].map((feature, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '20px',
                                    background: feature.bg,
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '20px',
                                    textAlign: 'left',
                                    transition: 'transform 0.2s',
                                    cursor: 'default'
                                }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', marginBottom: '4px' }}>{feature.title}</h4>
                                        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.4 }}>{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, idx) => (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={idx}
                        style={{
                            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}
                    >
                        <div style={{
                            padding: m.role === 'user' ? '12px 20px' : '16px 24px',
                            borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                            background: m.role === 'user' ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'rgba(255, 255, 255, 0.08)',
                            color: '#ffffff',
                            fontSize: isFullScreen ? '17px' : '14px',
                            lineHeight: 1.6,
                            border: m.role === 'bot' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                            boxShadow: m.role === 'user' ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none'
                        }}>
                            {m.role === 'user' ? m.content : renderMessage(m.content)}
                        </div>
                        {m.timestamp && (
                            <div style={{
                                fontSize: '11px',
                                color: '#9ca3af',
                                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                marginTop: '2px',
                                paddingLeft: m.role === 'user' ? '0' : '8px',
                                paddingRight: m.role === 'user' ? '8px' : '0'
                            }}>
                                {formatTime(m.timestamp)}
                            </div>
                        )}
                    </motion.div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', padding: '12px 18px', borderRadius: '16px 16px 16px 0', background: 'rgba(255,255,255,0.08)' }}>
                        <div className="dot-flashing"></div>
                    </div>
                )}
                <div ref={messagesEndRef} style={{ float: 'left', clear: 'both' }} />
            </div>

            {/* Input Area */}
            <div style={{ padding: isFullScreen ? '24px' : '16px', background: 'transparent', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>

                {/* File Attachment Staging */}
                <AnimatePresence>
                    {attachedFiles.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}
                        >
                            {attachedFiles.map((file, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    padding: '6px 12px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: '#ffffff',
                                    fontSize: '13px'
                                }}>
                                    <Paperclip size={14} />
                                    <span>{file.name}</span>
                                    <button
                                        onClick={() => removeFile(idx)}
                                        style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: isFullScreen ? '12px 20px' : '10px 14px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: uploading ? 0.3 : 0.7 }}>
                        <Paperclip size={20} color="#ffffff" />
                        <input type="file" multiple hidden accept=".pdf,.docx" onChange={handleFileUpload} disabled={uploading} />
                    </label>

                    <input
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            if (e.target.value.trim() && animationState === 'idle') {
                                setAnimationState('typing');
                            } else if (!e.target.value.trim() && animationState === 'typing') {
                                setAnimationState('idle');
                            }
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your message or attach a document..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: '#ffffff',
                            outline: 'none',
                            fontSize: isFullScreen ? '18px' : '14px'
                        }}
                    />

                    <button
                        onClick={handleSend}
                        disabled={loading || uploading || (!input.trim() && attachedFiles.length === 0)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: (loading || uploading || (!input.trim() && attachedFiles.length === 0)) ? 'rgba(255,255,255,0.2)' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Send size={isFullScreen ? 20 : 18} />
                    </button>

                </div>
                {isFullScreen && (
                    <p style={{ marginTop: '12px', fontSize: '12px', opacity: 0.4, textAlign: 'center' }}>
                        SkyEngineering can make mistakes. Consider checking important information.
                    </p>
                )}
            </div>

            <style jsx="true">{`
                .dot-flashing {
                    position: relative;
                    width: 6px;
                    height: 6px;
                    border-radius: 5px;
                    background-color: #6366f1;
                    color: #6366f1;
                    animation: dot-flashing 1s infinite linear alternate;
                    animation-delay: .5s;
                }
                .dot-flashing::before, .dot-flashing::after {
                    content: '';
                    display: inline-block;
                    position: absolute;
                    top: 0;
                }
                .dot-flashing::before {
                    left: -12px;
                    width: 6px;
                    height: 6px;
                    border-radius: 5px;
                    background-color: #6366f1;
                    color: #6366f1;
                    animation: dot-flashing 1s infinite alternate;
                    animation-delay: 0s;
                }
                .dot-flashing::after {
                    left: 12px;
                    width: 6px;
                    height: 6px;
                    border-radius: 5px;
                    background-color: #6366f1;
                    color: #6366f1;
                    animation: dot-flashing 1s infinite alternate;
                    animation-delay: 1s;
                }
                @keyframes dot-flashing {
                    0% { background-color: #6366f1; }
                    50%, 100% { background-color: rgba(99, 102, 241, 0.2); }
                }
            `}</style>
        </div >
    );

    if (isFullScreen) {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <ReactiveBackground state={animationState} />
                <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {chatContent}
                </div>
            </div>
        );
    }


    return (
        <>
            {/* Floating Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)',
                        cursor: 'pointer',
                        border: 'none',
                        zIndex: 100,
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <MessageSquare size={28} />
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        style={{ position: 'fixed', bottom: '100px', right: '24px', zIndex: 101 }}
                    >
                        {chatContent}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatDialog;
