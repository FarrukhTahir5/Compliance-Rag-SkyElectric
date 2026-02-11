import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChatDialog from './components/ChatDialog';
import Sidebar from './components/Sidebar';
import ChatHistory from './components/ChatHistory';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// ProtectedRoute component to guard routes
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AppContent() {
  const { user, token, logout } = useAuth();
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assessmentId, setAssessmentId] = useState(null);
  const [mode, setMode] = useState('chat'); // Simplified to chat mode
  const [useKb, setUseKb] = useState(true); // Enabled by default as requested
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null); // Use chat ID instead of index
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    if (user && token) {
      syncChatsWithBackend();
    } else {
      // Clear chat history if logged out
      setChatHistory([]);
      setMessages([]);
      setSelectedChatId(null);
    }
  }, [user, token]); // Re-sync when user or token changes

  const syncChatsWithBackend = async () => {
    if (!token) return;

    try {
      const res = await axios.get(`${API_BASE}/users/me/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatHistory(res.data);
    } catch (err) {
      console.error("Sync failed", err);
      // If token is invalid, log out the user
      if (err.response && err.response.status === 401) {
        logout();
      }
    }
  };

  const handleLoadHistory = (chatSession) => {
    setMessages(chatSession.messages.map(msg => ({ role: msg.role, content: msg.content })));
    setSelectedChatId(chatSession.id);
  };

  const handleNewChat = async () => {
    if (!token) return;
    try {
      const newSession = await axios.post(`${API_BASE}/users/me/sessions`, {
        title: "New Chat"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      syncChatsWithBackend(); // Refresh sidebar with new session
      setMessages([]);
      setSelectedChatId(newSession.data.id);
    } catch (err) {
      console.error("Failed to create new chat session", err);
    }
  };

  // Auto-save messages to backend whenever messages change
  useEffect(() => {
    const saveMessagesToBackend = async () => {
      if (messages.length > 0 && user && token) {
        try {
          // If no selectedChatId, create a new chat session first
          if (!selectedChatId) {
            const newSession = await axios.post(`${API_BASE}/users/me/sessions`, {
              title: "New Chat"
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedChatId(newSession.data.id);
            
            // Save the message to the new session
            const lastMessage = messages[messages.length - 1];
            await axios.post(`${API_BASE}/users/me/sessions/${newSession.data.id}/messages`, lastMessage, {
              headers: { Authorization: `Bearer ${token}` }
            });
          } else {
            // For simplicity, we'll just send the last message.
            // A more robust solution would involve sending all new messages or diffing.
            const lastMessage = messages[messages.length - 1];
            await axios.post(`${API_BASE}/users/me/sessions/${selectedChatId}/messages`, lastMessage, {
              headers: { Authorization: `Bearer ${token}` }
            });
          }
          syncChatsWithBackend(); // Refresh chat history in sidebar to show updated session
        } catch (err) {
          console.error("Auto-sync message failed", err);
        }
      }
    };
    saveMessagesToBackend();
  }, [messages, user, token, selectedChatId]);


  // Multi-session management (for RAG endpoints, will be refactored)
  React.useEffect(() => {
    // Generate or retrieve session ID
    let sid = sessionStorage.getItem('compliance_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem('compliance_session_id', sid);
    }

    // Set up global axios interceptor
    const interceptor = axios.interceptors.request.use((config) => {
      config.headers['X-Session-ID'] = sid; // This is for RAG endpoints
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });

    // Clean up on unmount
    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [token]); // Re-run if token changes

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
          <div style={{ padding: '0 15px' }}>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>{user.email}</span>
                </div>
                <button
                  onClick={logout}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
          <ChatHistory
            history={chatHistory}
            onLoadHistory={handleLoadHistory}
            onNewChat={handleNewChat}
            selectedChatId={selectedChatId}
          />
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
              currentChatId={selectedChatId}
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

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;