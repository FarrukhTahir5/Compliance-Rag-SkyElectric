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

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

function AppContent() {
  const { user, token, logout } = useAuth();
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assessmentId, setAssessmentId] = useState(null);
  const [mode, setMode] = useState('chat');
  const [useKb, setUseKb] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(() => {
    return sessionStorage.getItem('selectedChatId') || null;
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const openMobileSidebar = () => setIsMobileSidebarOpen(true);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedChatId) sessionStorage.setItem('selectedChatId', selectedChatId);
    else sessionStorage.removeItem('selectedChatId');
  }, [selectedChatId]);

  useEffect(() => {
    if (user && token) syncChatsWithBackend();
    else {
      setChatHistory([]);
      setMessages([]);
      setSelectedChatId(null);
    }
  }, [user, token]);

  const syncChatsWithBackend = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/users/me/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatHistory(res.data);
      if (selectedChatId && messages.length === 0) {
        const currentChat = res.data.find(c => c.id === selectedChatId);
        if (currentChat) {
          setMessages(currentChat.messages.map(msg => ({ role: msg.role, content: msg.content })));
        }
      }
    } catch (err) {
      console.error("Sync failed", err);
      if (err.response && err.response.status === 401) logout();
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
      const createdSession = { ...newSession.data, messages: [] };
      setChatHistory(prev => [createdSession, ...prev]);
      setSelectedChatId(createdSession.id);
      setMessages([]);
      await syncChatsWithBackend();
    } catch (err) {
      console.error("Failed to create new chat session", err);
    }
  };

  useEffect(() => {
    const saveMessagesToBackend = async () => {
      if (messages.length > 0 && user && token) {
        try {
          if (!selectedChatId) {
            const newSession = await axios.post(`${API_BASE}/users/me/sessions`, {
              title: "New Chat"
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedChatId(newSession.data.id);
            const lastMessage = messages[messages.length - 1];
            await axios.post(`${API_BASE}/users/me/sessions/${newSession.data.id}/messages`, lastMessage, {
              headers: { Authorization: `Bearer ${token}` }
            });
          } else {
            const lastMessage = messages[messages.length - 1];
            await axios.post(`${API_BASE}/users/me/sessions/${selectedChatId}/messages`, lastMessage, {
              headers: { Authorization: `Bearer ${token}` }
            });
          }
          syncChatsWithBackend();
        } catch (err) {
          console.error("Auto-sync message failed", err);
        }
      }
    };
    saveMessagesToBackend();
  }, [messages, user, token, selectedChatId]);

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>
      <Sidebar
        onAssessmentComplete={() => { }}
        selectedNode={selectedNode}
        onStartAnalysis={() => { }}
        onNodeClick={() => { }}
        assessmentId={assessmentId}
        mode={mode}
        useKb={useKb}
        toggleSidebar={toggleSidebar}
        chatHistory={chatHistory}
        onLoadHistory={handleLoadHistory}
        onNewChat={handleNewChat}
        selectedChatId={selectedChatId}
        isMobileOpen={isMobileSidebarOpen}
        closeMobileSidebar={closeMobileSidebar}
      />

      <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ChatDialog
            isFullScreen={true}
            useKb={useKb}
            messages={messages}
            setMessages={setMessages}
            currentChatId={selectedChatId}
            openMobileSidebar={openMobileSidebar}
          />
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<ProtectedRoute><AppContent /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}

export default App;