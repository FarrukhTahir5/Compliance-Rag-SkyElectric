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
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [assessmentId, setAssessmentId] = useState(null);
  const [mode, setMode] = useState('chat');
  const [useKb, setUseKb] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(() => localStorage.getItem('selectedChatId'));

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

  // Consolidated persistence hook for selectedChatId
  useEffect(() => {
    if (selectedChatId) localStorage.setItem('selectedChatId', selectedChatId);
    else localStorage.removeItem('selectedChatId');
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
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_BASE}/users/me/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatHistory(res.data);

      // Auto-load messages if we have a selectedChatId and messages are currently empty
      if (selectedChatId && messages.length === 0) {
        const currentChat = res.data.find(c => c.id === selectedChatId);
        if (currentChat && currentChat.messages) {
          setMessages(currentChat.messages.map(msg => ({
            role: (msg.role === 'assistant' || msg.role === 'bot') ? 'bot' : 'user',
            content: msg.content
          })));
        }
      }
    } catch (err) {
      console.error("Sync failed", err);
      if (err.response && err.response.status === 401) logout();
    } finally {
      setLoadingHistory(false);
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

  const saveMessageToBackend = async (chatId, message) => {
    if (!token || !user) return;
    try {
      let targetChatId = chatId;
      if (!targetChatId) {
        const newSession = await axios.post(`${API_BASE}/users/me/sessions`, {
          title: message.content.substring(0, 30) || "New Chat"
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        targetChatId = newSession.data.id;
        setSelectedChatId(targetChatId);
        setChatHistory(prev => [newSession.data, ...prev]);
      }

      await axios.post(`${API_BASE}/users/me/sessions/${targetChatId}/messages`, message, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local history immediately to show correct node count/title
      // This prevents the "0 nodes" lag
      setChatHistory(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          return { ...chat, messages: [...(chat.messages || []), message] };
        }
        return chat;
      }));
    } catch (err) {
      console.error("Failed to save message", err);
    }
  };

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
            saveMessageToBackend={saveMessageToBackend}
            loadingHistory={loadingHistory}
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