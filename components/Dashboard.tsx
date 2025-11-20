import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getBotStats, getChartDataForRange, getPluginStats, startBot, getLogs } from '../services/mockApi';
import { BotStats, ChartData, PluginStats, LogEntry, LogLevel } from '../types';

const getLogLevelStyle = (level: LogLevel) => {
    switch (level) {
        case 'INFO': return { color: '#0000FF', fontWeight: 700 }; 
        case 'WARN': return { color: '#FF8C00', fontWeight: 700 }; 
        case 'ERROR': return { color: '#FF0000', fontWeight: 700 };
        case 'DEBUG': return { color: '#666', fontStyle: 'italic' };
        default: return { color: '#000' };
    }
};

const StatCard: React.FC<{ title: string; value: string | number; children?: React.ReactNode }> = ({ title, value, children }) => (
    <div className="card flex flex-col justify-between min-h-[120px]">
        <div className="flex justify-between items-start">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</h3>
          {children}
        </div>
        <p className="text-4xl font-black font-heading mt-2 truncate">{value}</p>
    </div>
);

const LiveFeed: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    useEffect(() => {
        const fetchLogs = async () => {
            const data = await getLogs();
            setLogs(data.slice(0, 15));
        };
        fetchLogs();
        const interval = setInterval(fetchLogs, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="card h-full flex flex-col !p-0 overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-gray-100">
                <h2 className="text-sm font-bold uppercase tracking-wider">LIVE FEED</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-white">
                {logs.length === 0 && <p className="text-gray-400">WAITING_FOR_DATA...</p>}
                {logs.map(log => (
                    <div key={log.id} className="flex gap-3 mb-2 pb-2 border-b border-dashed border-gray-300 last:border-0">
                        <span style={getLogLevelStyle(log.level)} className="w-12 shrink-0">{log.level}</span>
                        <span className="text-gray-800 break-all">{log.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PluginMetrics: React.FC = () => {
    const [stats, setStats] = useState<PluginStats[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            const data = await getPluginStats();
            setStats(data.sort((a,b) => b.messagesHandled - a.messagesHandled));
        };
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="card !p-0 overflow-hidden">
            <div className="p-4 border-b-2 border-black bg-black text-white">
                 <h2 className="text-sm font-bold uppercase tracking-wider">PLUGIN METRICS</h2>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b-2 border-black sticky top-0">
                        <tr>
                            <th className="px-6 py-3">PLUGIN</th>
                            <th className="px-6 py-3">MSG</th>
                            <th className="px-6 py-3">ERR</th>
                            <th className="px-6 py-3">STATE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map(plugin => (
                            <tr key={plugin.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-6 py-3 font-bold">{plugin.name}</td>
                                <td className="px-6 py-3 font-mono">{plugin.messagesHandled}</td>
                                <td className={`px-6 py-3 font-mono ${plugin.errors > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>{plugin.errors}</td>
                                <td className="px-6 py-3">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 border border-black ${plugin.enabled ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                        {plugin.enabled ? 'ON' : 'OFF'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const Dashboard: React.FC<{ isUserView?: boolean }> = ({ isUserView = false }) => {
    const [stats, setStats] = useState<BotStats | null>(null);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

    useEffect(() => {
        const initialFetch = async () => {
            setLoading(true);
            const statsData = await getBotStats();
            setStats(statsData);
            if (statsData.status === 'online') {
                const chartData = await getChartDataForRange(timeRange);
                setChartData(chartData);
            }
            setLoading(false);
        };
        initialFetch();
        const interval = setInterval(async () => {
            const statsData = await getBotStats();
            setStats(statsData);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

     useEffect(() => {
        if(!loading && stats?.status === 'online') {
            const fetchChartData = async () => {
                const data = await getChartDataForRange(timeRange);
                setChartData(data);
            }
            fetchChartData();
        }
    }, [timeRange, loading, stats?.status]);
    
    const handleStartBot = async () => {
        setLoading(true);
        await startBot();
        const statsData = await getBotStats();
        setStats(statsData);
        setLoading(false);
    };

    if (loading) return <div className="flex items-center justify-center h-full font-bold text-xl animate-pulse">LOADING SYSTEM DATA...</div>;

    if (!stats) return <div className="card text-red-600 font-bold border-red-600">ERROR_FETCHING_STATS</div>;
    
    if (stats.status === 'offline') {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8">
                <div className="card max-w-md text-center p-8">
                     <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-6 border-4 border-black"></div>
                     <h1 className="text-3xl font-black uppercase mb-2">SYSTEM OFFLINE</h1>
                     <p className="text-gray-500 mb-6">Bot instance is currently sleeping.</p>
                     {!isUserView && 
                        <button onClick={handleStartBot} className="button w-full justify-center">
                           INITIALIZE SYSTEM
                        </button>
                     }
                </div>
            </div>
        );
    }
    
    return (
        <div className="grid gap-6 p-2">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard title="STATUS" value={stats.status.toUpperCase()}>
                    <div className={`w-4 h-4 border-2 border-black rounded-full ${stats.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                </StatCard>
                <StatCard title="UPTIME" value={stats.uptime} />
                <StatCard title="MESSAGES" value={stats.messagesProcessed} />
                <StatCard title="USERS" value={stats.activeUsers} />
                <StatCard title="MEMORY" value={stats.memoryUsage} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`card flex flex-col ${isUserView ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
                     <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
                         <h2 className="text-lg font-bold uppercase">ACTIVITY LOG</h2>
                         <div className="flex gap-2">
                            {['24h', '7d', '30d'].map((range) => (
                                <button 
                                    key={range}
                                    onClick={() => setTimeRange(range as any)}
                                    className={`px-3 py-1 text-xs font-bold border-2 border-black uppercase ${timeRange === range ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
                                >
                                    {range}
                                </button>
                            ))}
                         </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                <XAxis dataKey="name" stroke="#000" tick={{fontSize: 10, fontWeight: 600}} axisLine={false} tickLine={false} dy={10} />
                                <YAxis stroke="#000" tick={{fontSize: 10, fontWeight: 600}} axisLine={false} tickLine={false} dx={-10}/>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', color: '#000', boxShadow: '4px 4px 0px black', borderRadius: 0 }} 
                                    itemStyle={{ color: '#000', fontFamily: 'monospace' }}
                                />
                                <Line type="step" dataKey="messages" stroke="#000" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#000', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#000' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="lg:h-full">
                    <LiveFeed />
                </div>
            </div>
             <PluginMetrics />
        </div>
    );
};

export default Dashboard;