import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [userList, setUserList] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:5000');

    socket.onopen = () => {
      console.log('Connected to WebSocket server');
      setWs(socket);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
    
      if (data.type === 'message') {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            username: data.username,
            message: data.message,
            isSystemMessage: data.isSystemMessage || false,  // Only true for system messages (join/leave)
            isJoinMessage: data.isJoinMessage || false,  // Handle join messages
            isLeaveMessage: data.isLeaveMessage || false,  // Handle leave messages
          },
        ]);
      } else if (data.type === 'userList') {
        setUserList(data.users);
      }
    };
     

    socket.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleUsernameSubmit = () => {
    if (username.trim()) {
      ws.send(
        JSON.stringify({ type: 'setUsername', username })
      );
      setIsUsernameSet(true);
    }
  };

  const sendMessage = () => {
    if (input.trim() && isUsernameSet) {
      ws.send(
        JSON.stringify({ type: 'message', username, message: input })
      );
      setInput('');
    }
  };

  // Handle pressing Enter key to send message
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      {!isUsernameSet ? (
        <div className="username-container">
          <h2>Enter Your Username</h2>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="input-field"
          />
          <button onClick={handleUsernameSubmit} className="send-button">
            Set Username
          </button>
        </div>
      ) : (
        <>
          <h1 className="chat-title">Real-Time Chat</h1>
          <div className="chat-wrapper">
            <div className="user-list-container">
              <h3>Users</h3>
              <ul>
                {userList.map((user, index) => (
                  <li key={index}>{user}</li>
                ))}
              </ul>
            </div>

            <div className="messages-container">
              {messages.map((msg, index) => (
                <div
                  className={`message ${msg.isSystemMessage ? 'system-message' : ''} ${msg.isJoinMessage ? 'join-message' : ''} ${msg.isLeaveMessage ? 'leave-message' : ''}`}
                  key={index}
                >
                  {msg.isSystemMessage ? (
                    <em>{msg.message}</em>
                  ) : (
                    <>
                      <strong>{msg.username}:</strong> {msg.message}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="input-container">
              <input
                type="text"
                className="input-field"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}  // Trigger send on Enter key
                placeholder="Type a message..."
              />
              <button className="send-button" onClick={sendMessage}>
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
