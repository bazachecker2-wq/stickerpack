import React, { useState, useEffect, useRef } from 'react';
import { getLogs } from '../services/mockApi';
import { LogEntry, LogLevel } from '../types';

const Logs: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<LogLevel | 'ALL'>('ALL');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            const data = await getLogs();
            setLogs(data);
            setLoading(false);
        };
        fetchLogs();
        const interval = setInterval(async () => {
            const data = await getLogs();
            setLogs(data);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const filteredLogs = logs.filter(log => filter === 'ALL' || log.level === filter);

    const FilterButton: React.FC<{ level: LogLevel | 'ALL' }> = ({ level }) => {
        let colorClass = 'hover:bg-gray-100';
        if (filter === level) {
            colorClass = 'bg-black text-white';
        }
        return (
            <button
                onClick={() => setFilter(level)}
                className={`px-4 py-1 text-xs font-bold border-2 border-black uppercase transition-colors ${colorClass}`}
            >
                {level}
            </button>
        );
    };
    
    const getLogColor = (level: LogLevel) => {
        switch(level) {
            case 'INFO': return 'text-blue-600';
            case 'WARN': return 'text-orange-500';
            case 'ERROR': return 'text-red-600';
            case 'DEBUG': return 'text-gray-400';
            default: return 'text-black';
        }
    }

    return (
        <div className="h-full flex flex-col p-4 gap-4 bg-gray-50">
            <div className="flex flex-wrap gap-2 p-4 bg-white border-2 border-black shadow-hard">
                <FilterButton level="ALL" />
                <FilterButton level="INFO" />
                <FilterButton level="WARN" />
                <FilterButton level="ERROR" />
                <FilterButton level="DEBUG" />
                <div className="ml-auto font-mono text-xs flex items-center text-gray-400">
                    {filteredLogs.length} EVENTS
                </div>
            </div>
            
            <div className="flex-1 bg-white border-2 border-black shadow-hard overflow-hidden flex flex-col">
                 <div className="bg-gray-100 border-b-2 border-black p-2 flex text-xs font-bold uppercase text-gray-500">
                     <div className="w-24 px-2">Time</div>
                     <div className="w-16 px-2">Level</div>
                     <div className="flex-1 px-2">Message</div>
                 </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
                    {loading && <p className="p-4">LOADING LOGS...</p>}
                    {filteredLogs.map(log => (
                        <div key={log.id} className="flex hover:bg-gray-50 py-1 border-b border-dashed border-gray-100">
                            <span className="w-24 px-2 text-gray-400 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={`w-16 px-2 font-bold shrink-0 ${getLogColor(log.level)}`}>{log.level}</span>
                            <span className="flex-1 px-2 break-all text-gray-800">{log.message}</span>
                        </div>
                    ))}
                    <div ref={bottomRef}></div>
                </div>
            </div>
        </div>
    );
};

export default Logs;