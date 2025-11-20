import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { getUserChatHistory, sendMessageToBot, transcribeAudio } from '../services/mockApi';
import MicrophoneIcon from './icons/MicrophoneIcon';

interface ChatViewProps {
    username: string;
}

const ChatView: React.FC<ChatViewProps> = ({ username }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            const history = await getUserChatHistory(username);
            setMessages(history);
            setIsLoading(false);
        };
        fetchHistory();
    }, [username]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping || isRecording) return;
        const optimisticMessage: Message = { id: `user-${Date.now()}`, text: input, sender: 'user', timestamp: new Date().toLocaleTimeString() };
        setMessages(prev => [...prev, optimisticMessage]);
        const currentInput = input;
        setInput('');
        setIsTyping(true);
        try {
            const botResponse = await sendMessageToBot(username, currentInput);
            setMessages(prev => [...prev, botResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleToggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];
                mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    stream.getTracks().forEach(track => track.stop());
                    try {
                        const transcribedText = await transcribeAudio(audioBlob);
                        setInput(prev => prev + transcribedText);
                    } catch (error) { console.error("Transcription failed:", error); }
                    setIsRecording(false);
                };
                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                alert("Доступ к микрофону не был предоставлен.");
            }
        }
    };

    return (
        <div className="flex flex-col h-full win95-panel p-1">
            <header className="p-1 border-b-2" style={{borderColor: '#808080', borderBottomStyle: 'solid'}}>
                 <h1 className="text-xl font-bold">Чат с ботом</h1>
            </header>
           
            <main className="flex-1 overflow-y-auto p-2 space-y-2 win95-panel my-1 bg-white" style={{borderColor: '#808080 #ffffff #ffffff #808080'}}>
                {isLoading ? (
                    <p>Загрузка истории чата...</p>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-md">
                                <span className={`font-bold ${msg.sender === 'user' ? 'text-blue-800' : 'text-red-800'}`}>
                                    {msg.sender === 'user' ? username : 'Бот'}:
                                </span>
                                <p className="text-sm break-words win95-panel p-1">{msg.text}</p>
                            </div>
                        </div>
                    ))
                )}
                {isTyping && <p>Бот печатает...</p>}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-1">
                <form onSubmit={handleSend} className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={isRecording ? "Идет запись..." : "Напишите сообщение..."}
                        className="win95-text-field flex-1"
                        disabled={isTyping || isRecording}
                    />
                    <button
                        type="button"
                        onClick={handleToggleRecording}
                        className="win95-button"
                        style={isRecording ? {borderColor: '#000000 #ffffff #ffffff #000000', background: '#e0e0e0'} : {}}
                        disabled={isTyping}
                    >
                        <MicrophoneIcon className="h-5 w-5" />
                    </button>
                    <button
                        type="submit"
                        className="win95-button"
                        disabled={!input.trim() || isTyping || isRecording}
                    >
                        Отпр.
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default ChatView;