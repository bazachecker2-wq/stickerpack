
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getBotStats, getChartDataForRange, getPluginStats, startBot, getLogs } from '../services/mockApi';
import { BotStats, ChartData, PluginStats, LogEntry, LogLevel } from '../types';
import { translations } from '../utils/translations';

interface DashboardProps {
    isUserView?: boolean;
    language: 'ru' | 'en';
}

const StatCard: React.FC<{ title: string; value: string | number; children?: React.ReactNode }> = ({ title, value, children }) => (
    <div className="card flex flex-col justify-between min-h-[100px] md:min-h-[120px] hover:border-black transition-colors">
        <div className="flex justify-between items-start">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono">{title}</h3>
          {children}
        </div>
        <p className="text-2xl md:text-3xl font-bold font-heading mt-2 truncate text-black tracking-tight">{value}</p>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ isUserView = false, language }) => {
    const t = translations[language].dashboard;
    const comm = translations[language].common;

    const [stats, setStats] = useState<BotStats | null>(null);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
    const [logs, setLogs] = useState<LogEntry[]>([]);

    useEffect(() => {
        const initialFetch = async () => {
            setLoading(true);
            const statsData = await getBotStats();
            setStats(statsData);
            if (statsData.status === 'online') {
                const chartData = await getChartDataForRange(timeRange);
                setChartData(chartData);
            }
            const logsData = await getLogs();
            setLogs(logsData.slice(0, 10));
            setLoading(false);
        };
        initialFetch();
    }, [timeRange]);

    const handleStartBot = async () => {
        setLoading(true);
        await startBot();
        const statsData = await getBotStats();
        setStats(statsData);
        setLoading(false);
    };

    if (loading) return <div className="flex items-center justify-center h-full w-full font-mono text-xs tracking-widest text-gray-400 animate-pulse">{comm.loading}</div>;
    if (!stats) return <div className="card text-red-600 font-bold border-red-200 bg-red-50 m-4">{comm.error}</div>;
    
    if (stats.status === 'offline') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 bg-gray-50">
                <div className="card max-w-md text-center p-8 md:p-12 border border-gray-200 shadow-xl bg-white">
                     <div className="w-16 h-16 bg-gray-50 rounded-full mx-auto mb-6 flex items-center justify-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                     </div>
                     <h1 className="text-xl font-black uppercase mb-2 tracking-tight">{t.system_offline}</h1>
                     <p className="text-gray-400 mb-8 font-mono text-xs">{t.sleeping}</p>
                     {!isUserView && 
                        <button onClick={handleStartBot} className="button primary w-full justify-center py-4 rounded-lg shadow-sm">{t.initialize}</button>
                     }
                </div>
            </div>
        );
    }
    
    return (
        <div className="h-full overflow-y-auto pb-20 md:pb-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                <StatCard title={t.status} value={stats.status === 'online' ? comm.online : comm.offline}>
                    <div className={`w-2 h-2 rounded-full ${stats.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-400'}`}></div>
                </StatCard>
                <StatCard title={t.uptime} value={stats.uptime} />
                <StatCard title={t.messages} value={stats.messagesProcessed} />
                <StatCard title={t.users} value={stats.activeUsers} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="card lg:col-span-2 min-h-[300px] md:min-h-[350px] flex flex-col">
                     <div className="flex justify-between items-center mb-6">
                         <h2 className="text-xs font-bold uppercase tracking-widest font-mono">{t.activity}</h2>
                         <div className="flex gap-1">
                            {['24h', '7d', '30d'].map((range) => (
                                <button 
                                    key={range}
                                    onClick={() => setTimeRange(range as any)}
                                    className={`px-2 md:px-3 py-1 text-[10px] font-bold rounded-md uppercase transition-all ${timeRange === range ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}
                                >
                                    {range}
                                </button>
                            ))}
                         </div>
                    </div>
                    <div className="flex-1 w-full min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 10, fontWeight: 500, fontFamily: 'monospace'}} axisLine={false} tickLine={false} dy={10} />
                                <YAxis stroke="#9ca3af" tick={{fontSize: 10, fontWeight: 500, fontFamily: 'monospace'}} axisLine={false} tickLine={false} dx={-10}/>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', color: '#000', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} 
                                    itemStyle={{ color: '#000', fontFamily: 'monospace', fontSize: '12px' }}
                                    cursor={{ stroke: '#000', strokeWidth: 1 }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="messages" 
                                    stroke="#000" 
                                    strokeWidth={2} 
                                    dot={{ r: 3, fill: '#fff', stroke: '#000', strokeWidth: 2 }} 
                                    activeDot={{ r: 5, fill: '#FFD700', stroke: '#000' }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card min-h-[300px] md:min-h-[350px] flex flex-col !p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-xs font-bold uppercase tracking-widest font-mono">{t.live_feed}</h2>
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
                         {logs.map(log => (
                             <div key={log.id} className="pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                                 <div className="flex justify-between text-gray-400 mb-1">
                                     <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                     <span className={log.level === 'ERROR' ? 'text-red-500 font-bold' : 'text-blue-500'}>{log.level}</span>
                                 </div>
                                 <p className="text-gray-700 leading-tight">{log.message}</p>
                             </div>
                         ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
