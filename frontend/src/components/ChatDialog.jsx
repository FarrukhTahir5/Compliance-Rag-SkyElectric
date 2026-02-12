import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Zap, Shield, Globe, Terminal, Sparkles, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import logo from '../assets/cleanlogo.png';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const ChatDialog = ({ isFullScreen = false, useKb = false, messages, setMessages, currentChatId, openMobileSidebar, saveMessageToBackend, loadingHistory }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef();
    const { token } = useAuth();

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        // Explicitly save user message
        await saveMessageToBackend(currentChatId, userMsg);

        try {
            const formData = new FormData();
            formData.append('query', input);
            formData.append('use_kb', useKb);
            const res = await axios.post(`${API_BASE}/chat`, formData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const botMsg = { role: 'bot', content: res.data.answer, timestamp: new Date() };
            setMessages(prev => [...prev, botMsg]);

            // Explicitly save bot response
            // We pass currentChatId but it might have been updated by the user message save if it was a new chat
            // App.jsx state update for selectedChatId might not be immediate for this call, 
            // but saveMessageToBackend in App.jsx handles the null case.
            await saveMessageToBackend(currentChatId, botMsg);

        } catch (e) {
            setMessages(prev => [...prev, { role: 'bot', content: "Neural link interrupted. Please check connection.", timestamp: new Date() }]);
        } finally {
            setLoading(false);
        }
    };

    const containerStyle = isFullScreen ? {
        width: '100%',
        maxWidth: '1200px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    } : {
        position: 'fixed',
        bottom: '100px',
        right: '24px',
        width: '440px',
        maxWidth: 'calc(100vw - 48px)',
        height: '600px',
        maxHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 101,
        overflow: 'hidden'
    };

    const chatContent = (
        <div className="glass-card" style={{ ...containerStyle, borderRadius: isFullScreen ? 0 : 24, border: isFullScreen ? 'none' : '1px solid var(--glass-border)', background: '#ffffff' }}>
            {/* Header */}
            <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#ffffff',
                height: '72px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                        onClick={openMobileSidebar}
                        className="mobile-only btn-secondary"
                        style={{ padding: '8px', border: 'none', borderRadius: '10px' }}
                    >
                        <Menu size={20} />
                    </button>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(79, 70, 229, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bot size={24} color="var(--primary)" />
                    </div>
                    <div>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-main)', display: 'block' }}>
                            Neural Gateway
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operational</span>
                        </div>
                    </div>
                </div>
                {!isFullScreen && (
                    <button onClick={() => setIsOpen(false)} style={{ background: '#f8fafc', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}>
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{
                flex: 1,
                padding: '24px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                background: '#fcfdfe',
                position: 'relative'
            }}>
                {loadingHistory && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(255, 255, 255, 0.8)',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            style={{ width: '32px', height: '32px', border: '2px solid #e2e8f0', borderTopColor: 'var(--primary)', borderRadius: '50%' }}
                        />
                        <span style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Synchronizing Neural Link...</span>
                    </div>
                )}

                {messages.length === 0 && !loadingHistory && (
                    <div style={{ textAlign: 'center', marginTop: '40px', padding: '0 20px' }}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                            <img src={logo} alt="SkyChat Logo" style={{ width: '100px', opacity: 0.6, marginBottom: '20px' }} />
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>Initialize Query Protocol</h2>
                            <p style={{ color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 40px', lineHeight: 1.6, fontSize: '15px' }}>
                                Access SkyEngineering's advanced intelligence network to analyze technical compliance and engineering data.
                            </p>
                        </motion.div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px',
                            maxWidth: '700px',
                            margin: '0 auto'
                        }}>
                            {[
                                { title: 'Technical Compliance', desc: 'Standard validation', icon: <Shield size={18} /> },
                                { title: 'Engineering Insights', desc: 'Pattern logic', icon: <Sparkles size={18} /> },
                                { title: 'Protocol Search', desc: 'Neural retrieval', icon: <Zap size={18} /> },
                                { title: 'Global Standards', desc: 'Cross-reg data', icon: <Globe size={18} /> }
                            ].map((feature, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    style={{ padding: '16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'left', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}
                                >
                                    <div style={{ color: 'var(--primary)', marginBottom: '10px' }}>{feature.icon}</div>
                                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>{feature.title}</h4>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{feature.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, idx) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={idx}
                        style={{
                            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                        }}
                    >
                        <div style={{
                            padding: '14px 18px',
                            borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: m.role === 'user' ? 'var(--primary)' : '#ffffff',
                            color: m.role === 'user' ? 'white' : 'var(--text-main)',
                            border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                            fontSize: '15px',
                            lineHeight: 1.5,
                            boxShadow: m.role === 'user' ? '0 4px 12px rgba(79, 70, 229, 0.2)' : '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                            {m.content}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', opacity: 0.6 }}>
                            {formatTime(m.timestamp)}
                        </div>
                    </motion.div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', padding: '12px 16px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            style={{ display: 'flex', gap: '6px' }}
                        >
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', opacity: 0.6 }} />
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', opacity: 0.3 }} />
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div style={{ padding: '20px 24px', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    background: '#f8fafc',
                    padding: '6px 6px 6px 16px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    alignItems: 'center'
                }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Initialize query..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            outline: 'none',
                            fontSize: '15px',
                            padding: '10px 0'
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="btn-primary"
                        style={{ padding: '0', width: '40px', height: '40px', borderRadius: '12px', opacity: !input.trim() ? 0.5 : 1 }}
                    >
                        <Send size={18} />
                    </button>
                </div>
                {isFullScreen && (
                    <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.7 }}>
                        Intelligence engine may hallucinate. Verify critical data protocols.
                    </p>
                )}
            </div>
        </div>
    );

    if (isFullScreen) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', background: '#f8fafc' }}>
                {chatContent}
            </div>
        );
    }

    return (
        <>
            {!isOpen && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(true)}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 30px var(--primary-glow)',
                        cursor: 'pointer',
                        border: 'none',
                        zIndex: 100
                    }}
                >
                    <MessageSquare size={28} />
                </motion.button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.98 }}
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