import React from 'react';
import { Clock, Plus, MessageSquare, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const ChatHistory = ({ history, onLoadHistory, onNewChat, selectedChatId }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1.5px', margin: 0 }}>
                    <Clock size={14} style={{ marginBottom: '-2px' }} /> History
                </h3>
                <button
                    onClick={onNewChat}
                    className="btn-primary"
                    style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        gap: '6px',
                        boxShadow: 'none'
                    }}
                >
                    <Plus size={14} /> New
                </button>
            </div>

            {(!history || history.length === 0) ? (
                <div style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    marginTop: '12px',
                    padding: '24px 16px',
                    background: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px dashed #e2e8f0',
                    fontSize: '12px'
                }}>
                    No logs found.
                </div>
            ) : (
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {history.map((chat) => {
                            const isSelected = chat.id === selectedChatId;
                            return (
                                <motion.li
                                    key={chat.id}
                                    whileHover={{ x: 4 }}
                                    onClick={() => onLoadHistory(chat)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: isSelected ? 'rgba(79, 70, 229, 0.05)' : '#ffffff',
                                        border: '1px solid',
                                        borderColor: isSelected ? 'rgba(79, 70, 229, 0.2)' : '#e2e8f0',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isSelected ? '0 2px 8px rgba(79, 70, 229, 0.05)' : 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: isSelected ? 'var(--primary)' : '#f1f5f9',
                                            color: isSelected ? 'white' : 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <MessageSquare size={14} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '13px',
                                                fontWeight: isSelected ? 700 : 500,
                                                color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {chat.title || 'Untitled'}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {chat.messages?.length || 0} nodes
                                            </div>
                                        </div>
                                    </div>
                                </motion.li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ChatHistory;