import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  // 對話管理
  const [conversations, setConversations] = useState([]);
  
  // 當前對話訊息
  const [currentMessage, setCurrentMessage] = useState('');
  
  // 使用者類型 (staff, customer)
  const [userType, setUserType] = useState('staff');
  
  // 辨識狀態 (idle, recording, processing)
  const [recognitionStatus, setRecognitionStatus] = useState('idle');
  
  // 回饋資料
  const [feedback, setFeedback] = useState({
    satisfaction: 0,
    comment: ''
  });

  // messageID 固定 id 命名規則（sender + number）
  const generateNextMessageId = (sender) => {
    const senderMessage = conversations.filter(msg => msg.sender === sender);
    const nextNumber = senderMessage.length + 1;
    const newId = `${sender}-${nextNumber}`;
    console.log(`newId: ${newId}`);

    return newId;
  }

  // 新增訊息
  const addMessage = (message, sender) => {
    console.log('AppContext.js addMessage 被調用');
    console.log('message: ', message, ', sender: ', sender);

    const newId = generateNextMessageId(sender);
    const newMessage = {
      id: newId,
      text: message,
      sender,
      timestamp: new Date().toISOString()
    };
    
    setConversations(prev => [...prev, newMessage]);
    console.log('new message: ', newMessage);

    return newMessage.id;
  };

  // 編輯現有訊息
  const editMessage = (messageId, newText) => {
    console.log('AppContext.js addMessage 被調用');
    console.log('target messageId: ', messageId);
    console.log('new text: ', newText);

    setConversations(prev => {
      const found = prev.find(msg => msg.id === messageId);
      if (!found) {
        console.log('cannot find: ', messageId);
        return prev;
      }

      return prev.map(msg =>
        msg.id === messageId ? {...msg, text: newText } : msg
      );
    });
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
    setConversations,
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
    clearConversations, 
    generateNextMessageId
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};