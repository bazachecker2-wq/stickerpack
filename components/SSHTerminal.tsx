
import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { connectToSSH, sendSSHCommand, askStudioAssistant } from '../services/mockApi';

const SSHTerminal: React.FC = () => {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [host, setHost] = useState('');
    const [port, setPort] = useState('22');
    const [user, setUser] = useState('root');
    const [password, setPassword] = useState('');
    const [aiMode, setAiMode] = useState(false);
    const [aiCommand, setAiCommand] = useState('');
    
    const terminalContainerRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const currentLine = useRef('');

    // Initialize Terminal on Connect
    useEffect(() => {
        if (connected && terminalContainerRef.current) {
            const term = new Terminal({
                cursorBlink: true,
                theme: {
                    background: '#FFFFFF', // White background for Neo-Brutalist
                    foreground: '#000000', // Black text
                    cursor: '#000000',
                    selectionBackground: '#CCCCCC',
                    black: '#000000',
                    red: '#CC0000',
                    green: '#008000',
                    yellow: '#C4A000',
                    blue: '#0000CC',
                    magenta: '#CC00CC',
                    cyan: '#00CCCC',
                    white: '#FFFFFF',
                },
                fontFamily: "'Space Mono', 'Courier New', monospace",
                fontSize: 14,
                lineHeight: 1.2
            });

            const fitAddon = new FitAddon();
            term.loadAddon(fitAddon);
            term.open(terminalContainerRef.current);
            fitAddon.fit();

            xtermRef.current = term;
            fitAddonRef.current = fitAddon;

            term.write('\x1b[1;30mWelcome to TeleOS SSH Client v2.5\x1b[0m\r\n');
            term.write(`Connected to \x1b[1;34m${user}@${host}\x1b[0m\r\n`);
            if (aiMode) {
                term.write('\x1b[1;35m[ AI AGENT ACTIVE ]\x1b[0m Use the input field below for natural language commands.\r\n');
            } else {
                 term.write('\r\n$ ');
            }

            // Handle Input (Only active in Manual Mode)
            term.onData(async (data) => {
                if (aiMode) return; // Disable direct input in AI mode

                const code = data.charCodeAt(0);
                if (code === 13) { // Enter
                    term.write('\r\n');
                    const command = currentLine.current.trim();
                    currentLine.current = '';
                    
                    if (command.length > 0) {
                        if (command === 'exit') {
                            handleDisconnect();
                            return;
                        }
                        if (command === 'clear') {
                            term.clear();
                            term.write('$ ');
                            return;
                        }
                        await processCommand(command, term, false);
                    } else {
                        term.write('$ ');
                    }
                } else if (code === 127) { // Backspace
                    if (currentLine.current.length > 0) {
                        currentLine.current = currentLine.current.slice(0, -1);
                        term.write('\b \b');
                    }
                } else {
                    currentLine.current += data;
                    term.write(data);
                }
            });

            const resizeObserver = new ResizeObserver(() => {
                fitAddon.fit();
            });
            resizeObserver.observe(terminalContainerRef.current);

            return () => {
                term.dispose();
                resizeObserver.disconnect();
            };
        }
    }, [connected, aiMode, user, host]);

    // Effect to handle AI Mode toggle message dynamically
    useEffect(() => {
         if(xtermRef.current && connected) {
             if(aiMode) {
                  xtermRef.current.write('\r\n\x1b[1;35m=== AI MODE ENABLED ===\x1b[0m\r\n');
                  xtermRef.current.write('Type natural language commands in the field below.\r\n');
             } else {
                  xtermRef.current.write('\r\n\x1b[1;30m=== MANUAL MODE ===\x1b[0m\r\n$ ');
             }
         }
    }, [aiMode, connected]);

    const processCommand = async (command: string, term: Terminal, isAi: boolean) => {
        if (isAi) {
            term.write(`\r\n> \x1b[35mUser:\x1b[0m ${command}\r\n`);
            term.write('\x1b[35mAI Agent thinking...\x1b[0m\r\n');
            try {
                const response = await askStudioAssistant(`Translate this natural language request into a linux command and execute it: "${command}". Return the command output.`, false);
                term.write(response.text.replace(/\n/g, '\r\n'));
            } catch (e) {
                term.write(`\x1b[31mError: ${e}\x1b[0m`);
            }
        } else {
            try {
                const response = await sendSSHCommand(command);
                term.write(response.replace(/\n/g, '\r\n'));
            } catch (e) {
                term.write(`\x1b[31mError executing command\x1b[0m`);
            }
        }
        if (!isAi) term.write('\r\n$ ');
    };

    const handleAiSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiCommand.trim() || !xtermRef.current) return;
        await processCommand(aiCommand, xtermRef.current, true);
        setAiCommand('');
    }

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!host || !user || !password) return;
        setConnecting(true);
        await connectToSSH(host, user);
        setConnected(true);
        setConnecting(false);
    };

    const handleDisconnect = () => {
        setConnected(false);
        setHost('');
        setPassword('');
    };

    if (!connected) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-[#f0f0f0]">
                <div className="bg-white border-2 border-black shadow-[8px_8px_0px_black] max-w-md w-full p-8">
                    <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-center">
                        <h2 className="text-xl font-black font-mono">SSH_CONNECT</h2>
                        <div className="w-4 h-4 bg-red-500 border-2 border-black"></div>
                    </div>

                    <form onSubmit={handleConnect} className="space-y-4">
                        <div>
                            <label className="block font-bold text-xs mb-1 uppercase">Host Address</label>
                            <input 
                                type="text" 
                                value={host} 
                                onChange={e => setHost(e.target.value)} 
                                className="input-field"
                                placeholder="192.168.0.1"
                                autoFocus
                                required
                            />
                        </div>
                        
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block font-bold text-xs mb-1 uppercase">Username</label>
                                <input 
                                    type="text" 
                                    value={user} 
                                    onChange={e => setUser(e.target.value)} 
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div className="w-24">
                                <label className="block font-bold text-xs mb-1 uppercase">Port</label>
                                <input 
                                    type="number" 
                                    value={port} 
                                    onChange={e => setPort(e.target.value)} 
                                    className="input-field"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-xs mb-1 uppercase">Password</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="input-field"
                                required
                            />
                        </div>

                        <div className="pt-4">
                            <button type="submit" className="button w-full justify-center" disabled={connecting}>
                                {connecting ? 'CONNECTING...' : 'CONNECT'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-4 bg-[#f0f0f0]">
            {/* TOP BAR */}
            <div className="flex justify-between items-center mb-4 bg-white border-2 border-black p-2 shadow-[4px_4px_0px_0px_#000]">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col leading-tight px-2">
                        <span className="font-black text-lg uppercase font-mono">{user}@{host}</span>
                        <span className="text-xs font-bold uppercase text-gray-500">PORT: {port} • SSH-2.0</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 border-r-2 border-gray-200 pr-4">
                         <label className="flex items-center gap-2 cursor-pointer">
                             <span className="text-xs font-bold uppercase">AI AGENT:</span>
                             <div 
                                className={`w-10 h-5 border-2 border-black p-0.5 cursor-pointer transition-colors ${aiMode ? 'bg-black' : 'bg-white'}`}
                                onClick={() => setAiMode(!aiMode)}
                             >
                                 <div className={`w-3 h-3 bg-white border border-black transition-transform ${aiMode ? 'translate-x-5' : 'translate-x-0 bg-black'}`}></div>
                             </div>
                         </label>
                    </div>
                    <button onClick={handleDisconnect} className="button py-1 px-3 text-xs bg-red-600 text-white hover:bg-red-700 border-black">
                        DISCONNECT
                    </button>
                </div>
            </div>

            {/* TERMINAL CONTAINER */}
            <div className="flex-1 relative border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white mb-4">
                <div ref={terminalContainerRef} className="absolute inset-2" />
            </div>

            {/* AI INPUT BAR (VISIBLE ONLY IN AI MODE) */}
            {aiMode && (
                <form onSubmit={handleAiSubmit} className="flex gap-2 bg-white border-2 border-black p-2 shadow-[4px_4px_0px_0px_#000]">
                    <span className="font-bold flex items-center px-2 bg-yellow-300 border-2 border-black text-xs">AI</span>
                    <input 
                        type="text" 
                        value={aiCommand} 
                        onChange={e => setAiCommand(e.target.value)}
                        placeholder="Ask the AI to perform a task on the server..." 
                        className="flex-1 border-none outline-none font-mono text-sm font-bold"
                        autoFocus
                    />
                    <button type="submit" className="button py-1 px-4 text-xs">SEND</button>
                </form>
            )}
        </div>
    );
};

export default SSHTerminal;
