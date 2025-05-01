'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface Message {
  id: number;
  sender: 'user' | 'bot';
  text: string;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to simulate typing effect
  const simulateTyping = (fullText: string, messageId: number) => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    let currentText = '';
    let index = 0;
    const typingSpeed = 30;

    typingIntervalRef.current = setInterval(() => {
      if (index < fullText.length) {
        currentText += fullText.charAt(index);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === messageId ? { ...msg, text: currentText } : msg
          )
        );
        index++;
      } else {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }
    }, typingSpeed);
  };

  // sendMessage function
  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    const userMessageId = Date.now();
    const userMessage: Message = {
      sender: 'user',
      text: trimmedInput,
      id: userMessageId,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: trimmedInput }),
      });

      setIsLoading(false);

      if (!res.ok) {
        const errorData = await res.text();
        const errorMsgId = Date.now() + 1;
        const errorMessage: Message = {
          sender: 'bot',
          text: `Error: ${res.status} - ${
            errorData || 'Failed to fetch response'
          }`,
          id: errorMsgId,
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      const data = await res.json();

      if (data.error) {
        const errorMsgId = Date.now() + 1;
        const errorMessage: Message = {
          sender: 'bot',
          text: `API Error: ${data.error}`,
          id: errorMsgId,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else if (data.response) {
        const botMessageId = Date.now() + 1;
        const botMessagePlaceholder: Message = {
          sender: 'bot',
          text: '',
          id: botMessageId,
        };
        setMessages((prev) => [...prev, botMessagePlaceholder]);
        simulateTyping(data.response, botMessageId);
      } else {
        const errorMsgId = Date.now() + 1;
        const errorMessage: Message = {
          sender: 'bot',
          text: 'Received an unexpected response format.',
          id: errorMsgId,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Fetch error:', error);
      const errorMsgId = Date.now() + 1;
      const errorMessage: Message = {
        sender: 'bot',
        text: 'Failed to connect to the chatbot service.',
        id: errorMsgId,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // useEffects
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // handleKeyDown
  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  // --- Start of Return Statement ---
  return (
    // Use a subtle gradient background
    <div className="flex flex-col items-center justify-between min-h-screen p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-200 font-sans">
      {/* Header styling */}
      <h1 className="text-3xl sm:text-4xl font-semibold text-gray-800 mb-6 sm:mb-8 text-center">
        Chat with Abraham Lincoln 🎩
      </h1>

      {/* Chat message display area with updated styling */}
      <div className="flex flex-col w-full max-w-3xl flex-grow overflow-y-auto bg-white p-4 sm:p-6 rounded-xl shadow-lg mb-4 sm:mb-6 border border-gray-200">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            } mb-4`}
          >
            <div
              className={`rounded-xl px-4 py-2 max-w-[80%] sm:max-w-[75%] whitespace-pre-wrap break-words shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800 border border-gray-200'
              }`}
            >
              {/* Blinking cursor logic */}
              {msg.sender === 'bot' &&
              typingIntervalRef.current &&
              // Simple check to stop cursor on long final messages
              msg.text.length < 500
                ? `${msg.text}▌`
                : msg.text}
            </div>
          </div>
        ))}

        {/* Loading indicator styling to match bot messages */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="rounded-xl px-4 py-2 max-w-xs bg-gray-100 border border-gray-200 text-gray-600 animate-pulse">
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area container with integrated styling */}
      <div className="flex w-full max-w-3xl bg-white p-3 rounded-xl shadow-md items-center border border-gray-200">
        <textarea
          // Adjusted styling for better integration: no border/bg, uses container's
          className="flex-grow p-2 border-0 focus:ring-0 focus:outline-none text-black resize-none bg-transparent mr-2 placeholder-gray-500"
          // Start with 1 row, can grow if needed
          rows={1}
          placeholder="Ask Mr. Lincoln..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          style={{ maxHeight: '80px', overflowY: 'auto' }}
        />
        <button
          onClick={sendMessage}
          // Adjusted button style: slightly more padding, clear disabled state
          className={`bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-5 rounded-lg transition duration-150 ease-in-out flex-shrink-0 ${
            isLoading
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:shadow-md'
          }`}
          disabled={isLoading}
        >
          Send
        </button>
      </div>
      {/* Adjusted helper text styling */}
      <p className="text-xs sm:text-sm text-gray-500 mt-3 text-center">
        Press Enter to send, Shift+Enter for new line.
      </p>
    </div>
  );
}
