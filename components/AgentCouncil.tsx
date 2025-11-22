
import React, { useState, useEffect, useRef } from 'react';
import { runAgentCouncil } from '../services/mockApi';
import { CouncilMessage } from '../types';
import { translations } from '../utils/translations';
import CouncilIcon from './icons/CouncilIcon';

const AgentCouncil: React.FC<{ language: 'ru' | 'en' }> = ({ language }) => {
    const t = translations[language].council;
    const comm = translations[language].common;

    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState<CouncilMessage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ideContent, setIdeContent] = useState<string>('# Waiting for agents...');
    const [currentAgent, setCurrentAgent] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isProcessing) return;
        setMessages([]);
        setIdeContent('# ...');
        setIsProcessing(true);
        setMessages([{ id: 'user-prompt', agentName: 'User', role: 'Lead', content: prompt, isFinal: false }]);
        const userRequest = prompt;
        setPrompt('');
        try {
            const script = await runAgentCouncil(userRequest);
            for (const msg of script) {
                setCurrentAgent(msg.role);
                const delay = Math.min(Math.max(msg.content.length * 20, 800), 2000);
                await new Promise(r => setTimeout(r, delay));
                setMessages(prev => [...prev, msg]);
                if (msg.codeSnippet) setIdeContent(msg.codeSnippet);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
            setCurrentAgent(null);
        }
    };
    
    const getRoleColor = (role: string) => {
        switch(role) {
            case 'Architect': return 'text-purple-600 bg-purple-50';
            case 'Coder': return 'text-blue-600 bg-blue-50';
            case 'Critic': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full overflow-hidden">
            {/* Discussion Panel */}
            <div className="card flex flex-col flex-1 !p-0 overflow-hidden shadow-sm min-h-[50%] lg:min-h-0 order-2 lg:order-1">
                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                    <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 font-mono text-gray-400">
                        <CouncilIcon className="w-4 h-4"/> {t.title}
                    </h2>
                    {isProcessing && currentAgent && <span className="text-[10px] font-bold text-blue-600 animate-pulse bg-blue-50 px-2 py-1 rounded">ACTIVE: {currentAgent}</span>}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 lg:space-y-6 bg-white">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                            <CouncilIcon className="w-12 h-12 lg:w-16 lg:h-16 text-gray-300"/>
                            <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">{t.idle}</p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.agentName === 'User' ? 'items-end' : 'items-start'} animate-fade-in`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-transparent ${getRoleColor(msg.role)}`}>
                                    {msg.agentName}
                                </span>
                            </div>
                            <div 
                                className={`max-w-[90%] p-3 lg:p-4 text-sm border shadow-sm ${
                                    msg.agentName === 'User' 
                                    ? 'bg-black text-white border-black rounded-l-xl rounded-tr-xl' 
                                    : 'bg-white text-gray-800 border-gray-200 rounded-r-xl rounded-tl-xl'
                                }`}
                            >
                                <p className="whitespace-pre-wrap leading-relaxed font-mono text-xs lg:text-sm">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                
                <form onSubmit={handleSubmit} className="p-3 lg:p-4 border-t border-gray-100 bg-gray-50 flex gap-2 shrink-0">
                    <input 
                        type="text" 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        placeholder={t.placeholder} 
                        className="input-field flex-1 !bg-white border-gray-200 text-sm" 
                        disabled={isProcessing}
                    />
                    <button type="submit" className="button bg-black text-white border-black hover:bg-gray-800 shadow-none px-4" disabled={isProcessing || !prompt.trim()}>
                        {isProcessing ? '...' : 'SEND'}
                    </button>
                </form>
            </div>

            {/* IDE Panel */}
            <div className="card flex flex-col h-1/3 lg:h-full lg:w-5/12 !p-0 overflow-hidden shadow-sm shrink-0 border border-black bg-[#1e1e1e] order-1 lg:order-2">
                <div className="p-2 lg:p-3 border-b border-gray-700 bg-[#1e1e1e] text-gray-400 flex justify-between items-center shrink-0">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest font-mono">LIVE CODE</h2>
                    <div className="flex gap-1.5 opacity-50">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                </div>
                <div className="flex-1 bg-[#1e1e1e] p-3 lg:p-4 overflow-auto font-mono text-xs relative group">
                    <textarea 
                        readOnly 
                        value={ideContent} 
                        className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-green-400 font-typewriter leading-loose custom-scrollbar"
                    />
                </div>
            </div>
        </div>
    );
};

export default AgentCouncil;
