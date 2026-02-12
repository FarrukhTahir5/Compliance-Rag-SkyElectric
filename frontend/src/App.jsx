import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChatDialog from './components/ChatDialog';
import Sidebar from './components/Sidebar';


const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function App() {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assessmentId, setAssessmentId] = useState(null);
  const [mode, setMode] = useState('chat'); // Simplified to chat mode
  const [useKb, setUseKb] = useState(true); // Enabled by default as requested

  // Chat History State
  const [chatHistory, setChatHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);


  // Load chat history from localStorage on initial render
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('chatHistory');
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load chat history from localStorage", error);
      setChatHistory([]);
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    } catch (error) {
      console.error("Failed to save chat history to localStorage", error);
    }
  }, [chatHistory]);


  // Multi-session management
  useEffect(() => {
    // Generate or retrieve session ID
    let sid = sessionStorage.getItem('compliance_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem('compliance_session_id', sid);
    }

    // Set up global axios interceptor
    const interceptor = axios.interceptors.request.use((config) => {
      config.headers['X-Session-ID'] = sid;
      return config;
    });

    // Clean up on unmount
    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  const handleAssessmentComplete = async (assessmentId) => {
    if (!assessmentId) {
      setGraphData(null);
      setSelectedNode(null);
      setLoading(false);
      return;
    }

    setAssessmentId(assessmentId);
    try {
      const res = await axios.get(`${API_BASE}/graph/${assessmentId}`);
      setGraphData(res.data);
    } catch (e) {
      console.error("Failed to load graph", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAnalysis = () => {
    setLoading(true);
    setGraphData(null);
    setSelectedNode(null);
    setMode('graph'); // Switch to graph mode when analysis starts
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
  };

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
  };

  const handleDeleteChat = (chatId) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
  };

  const handleSendMessage = (message, chatId) => {
    const currentChatId = chatId || activeChatId;

    let newChatId = null;

    setChatHistory(prev => {
        if (currentChatId && prev.some(chat => chat.id === currentChatId)) {
            // Add message to an existing chat and move it to the top
            const updatedHistory = prev.map(chat =>
                chat.id === currentChatId
                    ? { ...chat, messages: [...chat.messages, message] }
                    : chat
            );
            const currentChat = updatedHistory.find(chat => chat.id === currentChatId);
            const otherChats = updatedHistory.filter(chat => chat.id !== currentChatId);
            return [currentChat, ...otherChats];
        } else {
            // Create a new chat
            newChatId = crypto.randomUUID();
            setActiveChatId(newChatId);
            return [{ id: newChatId, messages: [message] }, ...prev];
        }
    });
    
    return newChatId || currentChatId;
  };

  const activeChat = chatHistory.find(chat => chat.id === activeChatId);
  const messages = activeChat?.messages || [];

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f9fafb' }}>
      <Sidebar
        onAssessmentComplete={handleAssessmentComplete}
        selectedNode={selectedNode}
        onStartAnalysis={handleStartAnalysis}
        onNodeClick={handleNodeClick}
        assessmentId={assessmentId}
        mode={mode}
        useKb={useKb}
        chatHistory={chatHistory}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>


        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ width: '100%', height: '100%', padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <ChatDialog 
              isFullScreen={true} 
              useKb={useKb}
              messages={messages}
              onSendMessage={handleSendMessage}
              onNewChat={handleNewChat}
            />
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .btn-primary {
          background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
          border: none;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: transform 0.2s, opacity 0.2s;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          opacity: 0.9;
        }
        .btn-primary:active {
          transform: translateY(0);
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}

export default App;
