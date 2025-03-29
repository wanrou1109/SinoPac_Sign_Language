import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  // 對話管理
  const [conversations, setConversations] = useState([]);
  
  // 當前對話訊息
  const [currentMessage, setCurrentMessage] = useState('');
  
  // 使用者類型 (staff: 行員, customer: 聽障人士)
  const [userType, setUserType] = useState('staff');
  
  // 辨識狀態 (idle, recording, processing)
  const [recognitionStatus, setRecognitionStatus] = useState('idle');
  
  // 回饋資料
  const [feedback, setFeedback] = useState({
    satisfaction: 0,
    comment: ''
  });

  // 添加新的對話訊息
  const addMessage = (message, sender) => {
    const newMessage = {
      id: Date.now(),
      text: message,
      sender,
      timestamp: new Date().toISOString()
    };
    
    setConversations(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  // 編輯現有對話訊息
  const editMessage = (id, newText) => {
    setConversations(prev => 
      prev.map(msg => 
        msg.id === id ? { ...msg, text: newText } : msg
      )
    );
  };

  // 切換使用者類型
  const toggleUserType = () => {
    setUserType(prev => prev === 'staff' ? 'customer' : 'staff');
  };

  // 清空對話
  const clearConversations = () => {
    setConversations([]);
  };

  // 提供的上下文值
  const value = {
    conversations,
    currentMessage,
    setCurrentMessage,
    userType,
    setUserType,
    toggleUserType,
    recognitionStatus,
    setRecognitionStatus,
    feedback,
    setFeedback,
    addMessage,
    editMessage,
    clearConversations
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};