
import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { initSSHConnection } from '../services/mockApi';
import { translations } from '../utils/translations';

// Mobile Keyboard Helper Keys
const MOBILE_KEYS = [
    { label: 'ESC', key: '\x1b' },
    { label: 'TAB', key: '\t' },
    { label: 'CTRL+C', key: '\x03' },
    { label: '▲', key: '\x1b[A' },
    { label: '▼', key: '\x1b[B' },
    { label: '◀', key: '\x1b[D' },
    { label: '▶', key: '\x1b[C' },
    { label: '/', key: '/' },
    { label: '-', key: '-' },
    { label: 'HOME', key: '\x1b[H' },
    { label: 'END', key: '\x1b[F' },
];

const SSHTerminal: React.FC<{ language: 'ru' | 'en' }> = ({ language }) => {
    const t = translations[language].ssh;
    
    // Connection State
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState('');
    
    // Credentials
    const [host, setHost] = useState(localStorage.getItem('ssh_host') || '');
    const [port, setPort] = useState(localStorage.getItem('ssh_port') || '22');
    const [user, setUser] = useState(localStorage.getItem('ssh_user') || 'root');
    const [password, setPassword] = useState('');
    
    // Refs
    const terminalContainerRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    // Save credentials for convenience (excluding password)
    useEffect(() => {
        localStorage.setItem('ssh_host', host);
        localStorage.setItem('ssh_port', port);
        localStorage.setItem('ssh_user', user);
    }, [host, port, user]);

    // Initialize Terminal on Mount or Connection
    useEffect(() => {
        if (connected && terminalContainerRef.current && !xtermRef.current) {
            const term = new Terminal({
                cursorBlink: true,
                cursorStyle: 'block',
                theme: { 
                    background: '#1e1e1e', 
                    foreground: '#f0f0f0', 
                    cursor: '#FFD700', 
                    selectionBackground: 'rgba(255, 215, 0, 0.3)' 
                },
                fontFamily: "'Space Mono', 'Courier New', monospace",
                fontSize: window.innerWidth < 768 ? 12 : 14,
                lineHeight: 1.2,
                rendererType: 'canvas',
            });

            const fitAddon = new FitAddon();
            const webLinksAddon = new WebLinksAddon();
            
            term.loadAddon(fitAddon);
            term.loadAddon(webLinksAddon);
            
            term.open(terminalContainerRef.current);
            fitAddon.fit();
            
            xtermRef.current = term;
            fitAddonRef.current = fitAddon;

            term.focus();

            // Handle Resize
            const handleResize = () => fitAddon.fit();
            window.addEventListener('resize', handleResize);

            // Input Handling: Send to WebSocket
            term.onData((data) => {
                if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(data);
                }
            });

            return () => {
                window.removeEventListener('resize', handleResize);
                term.dispose();
                xtermRef.current = null;
            };
        }
    }, [connected]);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!host || !user || !password) return;
        
        setConnecting(true);
        
        // 1. Authenticate / Handshake via API
        const result = await initSSHConnection(host, port, user, password);
        
        if (result.success && result.socketUrl) {
            // 2. Open WebSocket
            try {
                const ws = new WebSocket(result.socketUrl);
                
                ws.onopen = () => {
                    setConnected(true);
                    setConnecting(false);
                    // Send initial resize or auth token if needed by backend
                };

                ws.onmessage = (event) => {
                    if (xtermRef.current) {
                        // Direct stream from server to terminal
                        if (typeof event.data === 'string') {
                            xtermRef.current.write(event.data);
                        } else {
                            // Handle binary blobs if necessary
                            const reader = new FileReader();
                            reader.onload = () => {
                                xtermRef.current?.write(reader.result as string);
                            };
                            reader.readAsText(event.data);
                        }
                    }
                };

                ws.onerror = (err) => {
                    console.error("WebSocket Error", err);
                    setError('Connection Error. Check console.');
                    setConnecting(false);
                    setConnected(false);
                };

                ws.onclose = () => {
                    setConnected(false);
                    xtermRef.current?.write('\r\n\x1b[31m[Connection Closed]\x1b[0m\r\n');
                    socketRef.current = null;
                };

                socketRef.current = ws;

            } catch (wsErr) {
                setError('Failed to establish WebSocket connection.');
                setConnecting(false);
            }
        } else {
            setError(result.error || 'Authentication failed.');
            setConnecting(false);
        }
    };

    const handleDisconnect = () => {
        if (socketRef.current) {
            socketRef.current.close();
        }
        setConnected(false);
    };

    const sendSpecialKey = (key: string) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(key);
            xtermRef.current?.focus();
        }
    };

    if (!connected) {
        return (
            <div className="flex flex-col h-full bg-[#f0f0f0] overflow-y-auto p-4 md:p-8 font-mono">
                <div className="max-w-md w-full mx-auto bg-white border-2 border-black shadow-[8px_8px_0px_black] p-6 md:p-8 animate-slide-up">
                    <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 animate-pulse rounded-full"></div>
                            <h2 className="text-xl font-black uppercase">SSH LOGIN</h2>
                        </div>
                        <div className="text-xs font-bold text-gray-400">v2.5</div>
                    </div>
                    
                    <form onSubmit={handleConnect} className="space-y-5">
                        <div>
                            <label className="block font-bold text-xs mb-1 uppercase tracking-wider">Host / IP</label>
                            <input 
                                type="text" 
                                value={host} 
                                onChange={e => setHost(e.target.value)} 
                                className="input-field text-base p-3" 
                                placeholder="192.168.1.1" 
                                autoCapitalize="none"
                                autoCorrect="off"
                                required
                            />
                        </div>
                        
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block font-bold text-xs mb-1 uppercase tracking-wider">User</label>
                                <input 
                                    type="text" 
                                    value={user} 
                                    onChange={e => setUser(e.target.value)} 
                                    className="input-field text-base p-3" 
                                    autoCapitalize="none"
                                    required
                                />
                            </div>
                            <div className="w-24">
                                <label className="block font-bold text-xs mb-1 uppercase tracking-wider">Port</label>
                                <input 
                                    type="number" 
                                    value={port} 
                                    onChange={e => setPort(e.target.value)} 
                                    className="input-field text-base p-3 text-center" 
                                    required
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block font-bold text-xs mb-1 uppercase tracking-wider">Password</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="input-field text-base p-3" 
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-100 border-l-4 border-red-500 p-3 text-red-700 text-xs font-bold uppercase">
                                {error}
                            </div>
                        )}
                        
                        <div className="pt-2">
                            <button 
                                type="submit" 
                                className="button w-full justify-center py-4 text-sm bg-black text-white hover:bg-gray-800 border-black active:translate-y-1 shadow-hard" 
                                disabled={connecting}
                            >
                                {connecting ? 'HANDSHAKE...' : 'CONNECT'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-[#f0f0f0] relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-2 bg-[#333] border-b border-black shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-mono text-xs truncate font-bold text-white">{user}@{host}</span>
                </div>
                <button 
                    onClick={handleDisconnect} 
                    className="bg-red-600 text-white px-3 py-1 text-[10px] font-bold border border-red-800 hover:bg-red-700 rounded-sm"
                >
                    EXIT
                </button>
            </div>

            {/* Terminal Container */}
            <div className="flex-1 relative overflow-hidden p-1">
                <div ref={terminalContainerRef} className="absolute inset-0 w-full h-full" />
            </div>

            {/* Mobile Virtual Keyboard Helper */}
            <div className="bg-[#252525] border-t border-[#444] p-1 flex gap-2 overflow-x-auto no-scrollbar shrink-0 pb-safe">
                {MOBILE_KEYS.map((k, i) => (
                    <button
                        key={i}
                        onClick={() => sendSpecialKey(k.key)}
                        onMouseDown={(e) => e.preventDefault()} // Prevent losing focus from terminal
                        className="flex-shrink-0 min-w-[3rem] h-10 bg-[#333] border-b-2 border-[#111] active:border-t-2 active:border-b-0 text-gray-200 font-mono text-xs font-bold rounded flex items-center justify-center touch-manipulation"
                    >
                        {k.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SSHTerminal;
