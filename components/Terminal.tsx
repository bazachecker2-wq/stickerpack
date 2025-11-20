import React, { useState, useRef, useEffect } from 'react';
import { executeCommand } from '../services/mockApi';

const Terminal: React.FC = () => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>(['Telegent MS-DOS Prompt. Type "help" for a list of commands.']);
    const [isProcessing, setIsProcessing] = useState(false);
    const endOfHistoryRef = useRef<null | HTMLDivElement>(null);
    const inputRef = useRef<null | HTMLInputElement>(null);

    useEffect(() => {
        endOfHistoryRef.current?.scrollIntoView({ behavior: 'auto' });
        inputRef.current?.focus();
    }, [history]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        setIsProcessing(true);
        const command = input;
        setHistory(prev => [...prev, `C:\\> ${command}`]);
        setInput('');

        const output = await executeCommand(command);
        setHistory(prev => [...prev, ...output.split('\n')]);
        setIsProcessing(false);
    };
    
    const focusInput = () => {
      inputRef.current?.focus();
    }

    return (
        <div 
            className="h-full flex flex-col bg-black text-white p-2"
            style={{fontFamily: 'W95FA, monospace'}}
            onClick={focusInput}
        >
            <div className="flex-1 overflow-y-auto">
                {history.map((line, index) => (
                    <div key={index} className="whitespace-pre-wrap">{line}</div>
                ))}
                <div ref={endOfHistoryRef} />
            </div>
            <form onSubmit={handleFormSubmit} className="flex items-center mt-2">
                <span>C:\&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    disabled={isProcessing}
                    className="flex-1 bg-transparent border-none text-white focus:ring-0 ml-2 focus:outline-none"
                    autoFocus
                />
            </form>
        </div>
    );
};

export default Terminal;