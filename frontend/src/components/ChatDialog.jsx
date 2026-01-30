import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const ChatDialog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('query', input);
            const res = await axios.post(`${API_BASE}/chat`, formData);

            setMessages(prev => [...prev, { role: 'bot', content: res.data.answer }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'bot', content: "Failed to connect to the AI analyst. Is the backend running?" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Toggle Button */}
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

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        style={{
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
                        }}
                    >
                        {/* Header */}
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                                <span style={{ fontWeight: 'bold' }}>AI Compliance Assistant</span>
                            </div>
                            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', opacity: 0.5, cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {messages.length === 0 && (
                                <div style={{ opacity: 0.4, textAlign: 'center', marginTop: '40px' }}>
                                    <Bot size={40} style={{ margin: '0 auto 10px' }} />
                                    <p>Ask me anything about your compliance documents!</p>
                                </div>
                            )}
                            {messages.map((m, idx) => (
                                <div key={idx} style={{
                                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    background: m.role === 'user' ? '#6366f1' : 'rgba(255,255,255,0.08)',
                                    color: 'white',
                                    fontSize: '14px',
                                    lineHeight: 1.5
                                }}>
                                    {m.content}
                                </div>
                            ))}
                            {loading && (
                                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)' }}>
                                    <div className="dot-flashing"></div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px' }}>
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask a question..."
                                    style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '14px' }}
                                />
                                <button onClick={handleSend} disabled={loading} style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
                                    <Send size={18} />
                                </button>
                            </div>
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
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatDialog;
