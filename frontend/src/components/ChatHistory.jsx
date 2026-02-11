import React from 'react';
import { Clock, Plus } from 'lucide-react';

const ChatHistory = ({ history, onLoadHistory, onNewChat, selectedChatId }) => {
    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', textTransform: 'uppercase', opacity: 0.6, margin: 0 }}>
                    <Clock size={16} /> Chat History
                </h3>
                <button onClick={onNewChat} style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    padding: '5px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                }}>
                    <Plus size={16} /> New Chat
                </button>
            </div>

            {(!history || history.length === 0) ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '20px' }}>
                    No chat history yet. Start a new chat!
                </div>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }}>
                    {history.map((chat) => (
                        <li
                            key={chat.id}
                            onClick={() => onLoadHistory(chat)}
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                background: chat.id === selectedChatId ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                                border: chat.id === selectedChatId ? '1px solid #6366f1' : '1px solid transparent',
                                cursor: 'pointer',
                                marginBottom: '10px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {chat.title || 'Untitled Chat'}
                            </div>
                            <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
                                {chat.messages.length} messages | {new Date(chat.create_time).toLocaleString()}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default ChatHistory;