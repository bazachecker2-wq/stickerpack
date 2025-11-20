
import React, { useState, useEffect, useRef } from 'react';
import { runAgentCouncil } from '../services/mockApi';
import { CouncilMessage } from '../types';

const AgentCouncil: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<CouncilMessage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ideContent, setIdeContent] = useState<string>('# Ожидание кода от Совета ИИ...');
    const [currentAgent, setCurrentAgent] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isProcessing) return;

        setMessages([]);
        setIdeContent('# Инициализация среды разработки...\n# Подключение агентов...');
        setIsProcessing(true);
        
        // Add user message
        setMessages([{ 
            id: 'user-prompt', 
            agentName: 'User', 
            role: 'Lead', // User acts as client
            content: prompt, 
            isFinal: false 
        }]);

        const userRequest = prompt;
        setPrompt('');

        try {
            // Fetch the full script from the AI
            const script = await runAgentCouncil(userRequest);
            
            // "Stream" the script to the UI to simulate real-time conversation
            for (const msg of script) {
                setCurrentAgent(msg.role);
                
                // Simulate typing delay based on content length
                const delay = Math.min(Math.max(msg.content.length * 20, 1000), 3000);
                await new Promise(r => setTimeout(r, delay));

                setMessages(prev => [...prev, msg]);
                
                if (msg.codeSnippet) {
                    setIdeContent(msg.codeSnippet);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
            setCurrentAgent(null);
        }
    };

    // Strict B&W/Grayscale for roles
    const getRoleColor = (role: string) => {
        return '#FFFFFF';
    };
    
    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'Architect': return '[ARCHITECT]';
            case 'Critic': return '[CRITIC]';
            case 'Coder': return '[CODER]';
            case 'Researcher': return '[RESEARCHER]';
            case 'Lead': return '[LEAD]';
            default: return '[USER]';
        }
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', gap: '24px' }}>
            {/* LEFT: COUNCIL CHAT */}
            <div className="card flex flex-col h-full p-0 overflow-hidden">
                <div className="p-4 border-b border-white bg-black flex justify-between items-center">
                    <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
                        <span>🤖</span> СОВЕТ ИИ
                    </h2>
                    {isProcessing && currentAgent && (
                        <span className="text-xs blink">
                            {currentAgent} печатает...
                        </span>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
                    {messages.length === 0 && (
                        <div className="text-center text-white mt-10 opacity-50">
                            <p>Совет ИИ готов к работе.</p>
                            <p className="text-xs mt-2">"Архитектор", "Критик", "Кодер", "Исследователь"</p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.agentName === 'User' ? 'items-end' : 'items-start'}`}>
                            <div 
                                className="max-w-[90%] border border-white p-3 bg-black relative"
                                style={{ 
                                    borderColor: msg.isFinal ? '#FFFFFF' : '#666666',
                                    borderLeftWidth: msg.agentName !== 'User' ? '4px' : '1px'
                                }}
                            >
                                <div className="flex justify-between items-center mb-1 gap-4">
                                    <span className="font-bold text-xs uppercase text-white">
                                        {msg.agentName} <span className="opacity-50">{getRoleLabel(msg.role)}</span>
                                    </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap text-white leading-relaxed font-mono">
                                    {msg.content}
                                </p>
                                {msg.isFinal && (
                                    <div className="mt-2 text-[10px] uppercase text-white border-t border-white pt-1 font-bold">
                                        ★ Финальное решение
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="p-4 border-t border-white bg-black flex gap-2">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Опишите задачу для Совета..."
                        className="input-field flex-1"
                        disabled={isProcessing}
                    />
                    <button type="submit" className="button" disabled={isProcessing || !prompt.trim()}>
                        {isProcessing ? '...' : 'START'}
                    </button>
                </form>
            </div>

            {/* RIGHT: IDE / WORKSPACE */}
            <div className="card flex flex-col h-full p-0 overflow-hidden">
                <div className="p-4 border-b border-white bg-black flex justify-between items-center">
                    <h2 className="text-lg font-bold uppercase tracking-widest flex items-center gap-2">
                        <span>💻</span> IDE / TERMINAL
                    </h2>
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full border border-white"></div>
                        <div className="w-3 h-3 rounded-full border border-white"></div>
                        <div className="w-3 h-3 rounded-full border border-white bg-white"></div>
                    </div>
                </div>
                <div className="flex-1 bg-black p-4 overflow-auto font-mono text-sm relative group">
                    <textarea
                        readOnly
                        value={ideContent}
                        className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-white"
                        style={{ fontFamily: "'Fira Code', 'Courier New', monospace", lineHeight: '1.5' }}
                    />
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-gray-500">READ ONLY MODE</span>
                    </div>
                </div>
                <div className="p-2 bg-black border-t border-white text-[10px] font-mono text-white flex gap-4">
                    <span>STATUS: {isProcessing ? 'EXECUTING_AGENTS' : 'IDLE'}</span>
                    <span>MEM: 64MB</span>
                    <span>CPU: 12%</span>
                </div>
            </div>
        </div>
    );
};

export default AgentCouncil;
