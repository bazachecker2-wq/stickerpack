import React, { useState, useEffect, useRef } from 'react';
import { ChatState } from '../types';
import { getAllChats } from '../services/mockApi';

const AdminChatsView: React.FC = () => {
    const [chats, setChats] = useState<ChatState>({});
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
        const fetchChats = async () => {
            setLoading(true);
            const data = await getAllChats();
            setChats(data);
            const users = Object.keys(data);
            if (users.length > 0 && !selectedUser) {
                setSelectedUser(users[0]);
            }
            setLoading(false);
        };
        fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [selectedUser]);

    const users = Object.keys(chats);
    const selectedChat = selectedUser ? chats[selectedUser] : [];
    
    if (loading) return <p>Загрузка чатов...</p>;

    return (
        <div className="h-full flex flex-col p-1">
            <div className="flex-1 flex win95-panel overflow-hidden">
                {/* User List */}
                <aside className="w-1/3 xl:w-1/4 border-r-2 border-gray-400" style={{overflowY: 'auto'}}>
                    <div className="p-1">
                        {users.length === 0 ? (
                            <p className="text-sm p-2">Чаты отсутствуют.</p>
                        ) : (
                            <ul>
                                {users.map(user => (
                                    <li key={user}>
                                        <button
                                            onClick={() => setSelectedUser(user)}
                                            className={`w-full text-left p-2 my-0.5 flex items-center ${
                                                selectedUser === user ? 'bg-[#000080] text-white' : 'hover:bg-[#e0e0e0]'
                                            }`}
                                        >
                                            <img src="https://i.imgur.com/jV8o3aC.png" alt="chat" className="h-4 w-4 mr-2 flex-shrink-0" />
                                            <span className="truncate">{user}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </aside>

                {/* Chat Display */}
                <main className="flex-1 flex flex-col bg-white">
                    {selectedUser ? (
                        <>
                            <header className="p-2 border-b-2 border-gray-400 bg-[#c0c0c0]">
                                <h2 className="font-bold">Чат с: <span className="text-blue-800">{selectedUser}</span></h2>
                            </header>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                               {selectedChat.map(msg => (
                                    <div key={msg.id} className="max-w-lg">
                                        <p>
                                            <span className={`font-bold ${msg.sender === 'user' ? 'text-red-800' : 'text-blue-800'}`}>{msg.sender === 'user' ? selectedUser : "Бот"}: </span>
                                            {msg.text}
                                        </p>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <p>Выберите пользователя для просмотра чата.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminChatsView;