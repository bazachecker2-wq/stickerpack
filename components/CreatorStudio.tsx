
import React, { useState, useRef, useEffect } from 'react';
import { chatWithIDE_AI, addPlugin, updatePlugin } from '../services/mockApi';
import { Plugin } from '../types';
import CodeIcon from './icons/CodeIcon';
import { translations } from '../utils/translations';

type InstallStatus = 'idle' | 'installing' | 'success';
type AIMessage = { sender: 'user' | 'ai' | 'system'; text: string; };

interface CreatorStudioProps {
    isReadOnly?: boolean;
    pluginToEdit?: Plugin | null;
    onSaveSuccess: () => void;
    language: 'ru' | 'en';
}

const CreatorStudio: React.FC<CreatorStudioProps> = ({ isReadOnly = false, pluginToEdit = null, onSaveSuccess, language }) => {
    const t = translations[language].ide;
    const comm = translations[language].common;
    
    const isEditing = !!pluginToEdit;
    const [pluginName, setPluginName] = useState(pluginToEdit?.name || 'new-plugin');
    const [code, setCode] = useState(pluginToEdit?.code || '');
    const [aiChatHistory, setAiChatHistory] = useState<AIMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [installStatus, setInstallStatus] = useState<InstallStatus>('idle');
    const chatHistoryRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if(aiChatHistory.length === 0) {
            const initialText = isEditing
                ? (language === 'ru' ? `Код плагина '${pluginToEdit.name}' загружен.` : `Plugin '${pluginToEdit.name}' loaded.`)
                : (language === 'ru' ? 'Опишите плагин...' : 'Describe the plugin...');
            setAiChatHistory([{ sender: 'system', text: initialText }]);
        }
    }, [isEditing, pluginToEdit, language]);

     useEffect(() => {
        setPluginName(pluginToEdit?.name || 'new-plugin');
        setCode(pluginToEdit?.code || '');
        setAiChatHistory([]);
        setInstallStatus('idle');
    }, [pluginToEdit]);

    useEffect(() => {
        chatHistoryRef.current?.scrollTo({ top: chatHistoryRef.current.scrollHeight, behavior: 'smooth' });
    }, [aiChatHistory]);

    const handleAiSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isAiLoading) return;
        const newHistory: AIMessage[] = [...aiChatHistory, { sender: 'user', text: userInput }];
        setAiChatHistory(newHistory);
        setUserInput('');
        setIsAiLoading(true);
        setInstallStatus('idle');
        try {
            const aiResponse = await chatWithIDE_AI(code, userInput);
            setCode(aiResponse);
            setAiChatHistory([...newHistory, { sender: 'ai', text: comm.success }]);
        } catch (err: any) {
            setAiChatHistory([...newHistory, { sender: 'system', text: `${comm.error}: ${err.toString()}` }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSaveOrInstall = async () => {
        if (!code || !pluginName || isReadOnly) return;
        setInstallStatus('installing');
        try {
            if (isEditing && pluginToEdit) {
                await updatePlugin(pluginToEdit.id, { name: pluginName, code });
            } else {
                await addPlugin(pluginName, "AI Generated", 'AI Assistant', code);
            }
            setInstallStatus('success');
            setTimeout(onSaveSuccess, 1200);
        } catch (err) {
            setInstallStatus('idle');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full p-4 bg-gray-50">
            <div className="card flex flex-col h-full p-0 overflow-hidden !bg-white !shadow-hard">
                <div className="p-4 border-b-2 border-black bg-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <CodeIcon className="w-5 h-5"/>
                         <span className="font-bold font-heading">{t.editor_title}</span>
                    </div>
                    <input type="text" value={pluginName} onChange={(e) => setPluginName(e.target.value)} className="input-field !w-48 !py-1" placeholder="Plugin Name"/>
                </div>
                <div className="flex-1 relative bg-[#1e1e1e]">
                     <textarea
                        value={code}
                        onChange={(e) => { setCode(e.target.value); setInstallStatus('idle'); }}
                        className="w-full h-full absolute inset-0 bg-transparent text-gray-300 p-4 font-mono text-sm resize-none focus:outline-none"
                        spellCheck={false}
                        placeholder="# Code..."
                    />
                </div>
                <div className="p-4 border-t-2 border-black bg-white flex justify-between items-center gap-4">
                   <div className="text-xs font-mono text-gray-500">
                       {installStatus === 'success' ? <span className="text-green-600 font-bold">{t.success}</span> : t.ready}
                       {isReadOnly && <span className="text-orange-500 ml-2">{comm.read_only}</span>}
                   </div>
                    <button className="button" onClick={handleSaveOrInstall} disabled={installStatus !== 'idle' || isReadOnly || !code}>
                        {installStatus === 'idle' && (isEditing ? t.save_btn : t.install_btn)}
                        {installStatus === 'installing' && '...'}
                        {installStatus === 'success' && 'OK'}
                    </button>
                </div>
            </div>
            <div className="card flex flex-col h-full p-0 overflow-hidden !bg-white !shadow-hard">
                <div className="p-4 border-b-2 border-black bg-black text-white">
                    <h3 className="font-bold font-heading flex items-center gap-2"><span>🤖</span> {t.ai_assistant}</h3>
                </div>
                 <div ref={chatHistoryRef} className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-gray-50">
                    {aiChatHistory.map((msg, index) => (
                        <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[90%] p-3 border-2 border-black shadow-hard-hover ${msg.sender === 'user' ? 'bg-white' : 'bg-yellow-100'}`}>
                                <p className="text-sm font-mono">{msg.text}</p>
                            </div>
                            <span className="text-[10px] font-bold mt-1 uppercase text-gray-400">{msg.sender}</span>
                        </div>
                    ))}
                     {isAiLoading && <p className="text-xs text-center font-mono animate-pulse mt-2">{t.ai_thinking}</p>}
                </div>
                <form onSubmit={handleAiSubmit} className="p-4 border-t-2 border-black bg-white flex gap-2">
                    <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder={t.ai_placeholder} className="input-field flex-1" disabled={isAiLoading}/>
                    <button type="submit" className="button bg-black text-white hover:bg-gray-800" disabled={!userInput.trim() || isAiLoading}>{comm.send}</button>
                </form>
            </div>
        </div>
    );
};

export default CreatorStudio;
