import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChatDialog from './components/ChatDialog';
import Sidebar from './components/Sidebar';
import ChatHistory from './components/ChatHistory';


const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function App() {
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assessmentId, setAssessmentId] = useState(null);
  const [mode, setMode] = useState('chat'); // Simplified to chat mode
  const [useKb, setUseKb] = useState(true); // Enabled by default as requested
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedChatIndex, setSelectedChatIndex] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }
  }, []);

  const handleLoadHistory = (chat, index) => {
    // Save current chat before loading a different one (if not empty and not already saved)
    if (messages.length > 0 && selectedChatIndex === null) {
      let newHistory = [...chatHistory, messages];
      setChatHistory(newHistory);
      localStorage.setItem('chatHistory', JSON.stringify(newHistory));
    }
    
    setMessages(chat);
    setSelectedChatIndex(index);
  };

  const handleSaveChat = () => {
    // This function now just starts a new chat since auto-save handles saving
    if (messages.length > 0) {
      setMessages([]);
      setSelectedChatIndex(null);
    }
  };

  // Auto-save messages to history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      let newHistory;
      if (selectedChatIndex !== null) {
        // Update existing chat in history
        newHistory = [...chatHistory];
        newHistory[selectedChatIndex] = messages;
      } else {
        // Add new chat to history or update the most recent one
        if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].length === 0) {
          // Replace empty chat with current messages
          newHistory = [...chatHistory];
          newHistory[newHistory.length - 1] = messages;
        } else {
          // Add new chat to history
          newHistory = [...chatHistory, messages];
          setSelectedChatIndex(chatHistory.length); // Set index to the new chat
        }
      }
      setChatHistory(newHistory);
      localStorage.setItem('chatHistory', JSON.stringify(newHistory));
    }
  }, [messages, selectedChatIndex, chatHistory]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Auto-save is now handled by the messages useEffect, so this is just a backup
      if (messages.length > 0 && selectedChatIndex === null) {
        let newHistory = [...chatHistory, messages];
        localStorage.setItem('chatHistory', JSON.stringify(newHistory));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [messages, chatHistory, selectedChatIndex]);


  // Multi-session management
  React.useEffect(() => {
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

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f9fafb' }}>

      {isSidebarOpen && (
        <Sidebar
          onAssessmentComplete={handleAssessmentComplete}
          selectedNode={selectedNode}
          onStartAnalysis={handleStartAnalysis}
          onNodeClick={handleNodeClick}
          assessmentId={assessmentId}
          mode={mode}
          useKb={useKb}
          toggleSidebar={toggleSidebar}
        >
          <ChatHistory history={chatHistory} onLoadHistory={handleLoadHistory} />
        </Sidebar>
      )}
      <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>

        {!isSidebarOpen && (
          <button onClick={toggleSidebar} style={{
            position: 'absolute',
            top: '20px',
            left: '10px',
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            border: 'none',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            padding: '10px 15px',
            zIndex: 100
          }}>
            Open Sidebar
          </button>
        )}
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ width: '100%', height: '100%', padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <ChatDialog
              isFullScreen={true}
              useKb={useKb}
              messages={messages}
              setMessages={setMessages}
              onSaveChat={handleSaveChat}
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
