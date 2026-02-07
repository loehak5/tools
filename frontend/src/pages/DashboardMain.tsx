import { useEffect, useState } from 'react';
import { Users, Activity, Clock, TrendingUp, ShieldCheck, LogIn, Globe, Wifi, Play, Video, Eye } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Label
} from 'recharts';
import api from '../api/client';

const COLORS = {
    active: '#10b981',    // green-500
    offline: '#64748b',   // slate-500
    failed: '#ef4444',    // red-500
    challenge: '#f59e0b', // amber-500
    banned: '#7f1d1d',    // red-900
};

const StatCard = ({ title, value, icon: Icon, color, subtitle, loading }: any) => (
    <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 p-6 rounded-3xl relative overflow-hidden group hover:border-gray-700 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            {loading && (
                <div className="w-4 h-4 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin"></div>
            )}
        </div>
        <div>
            <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
            <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-bold text-white mt-1">{value}</p>
                {subtitle && <span className="text-xs text-gray-500 font-medium">{subtitle}</span>}
            </div>
        </div>
        <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${color} opacity-[0.03] rounded-full blur-3xl group-hover:opacity-[0.08] transition-opacity`}></div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timePeriod, setTimePeriod] = useState<'today' | 'yesterday' | '7days'>('today');

    const fetchStats = async () => {
        try {
            const response = await api.get('/dashboard/stats', {
                params: { period: timePeriod }
            });
            setStats(response.data);
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [timePeriod]); // Re-fetch when period changes

    useEffect(() => {
        const interval = setInterval(fetchStats, 10000); // 10s refresh for activities
        return () => clearInterval(interval);
    }, [timePeriod]);

    const formatTime = (isoString: string) => {
        if (!isoString) return 'Unknown';
        const date = new Date(isoString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    const pieData = stats ? [
        { name: 'Active', value: stats.accounts.breakdown.active, color: COLORS.active },
        { name: 'Offline', value: stats.accounts.breakdown.offline, color: COLORS.offline },
        { name: 'Issues', value: stats.accounts.issues, color: COLORS.failed },
    ].filter(d => d.value > 0) : [];

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'login': return <LogIn className="w-5 h-5 text-emerald-400" />;
            case 'check_session': return <Globe className="w-5 h-5 text-indigo-400" />;
            case 'post': return <TrendingUp className="w-5 h-5 text-blue-400" />;
            case 'like': return <Activity className="w-5 h-5 text-pink-400" />;
            case 'follow': return <Users className="w-5 h-5 text-amber-400" />;
            default: return <Wifi className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
                    <p className="text-gray-500 mt-1 font-medium italic">Empowering your automation journey.</p>
                </div>
                <div className="flex items-center space-x-2 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-2xl text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>Live Updates</span>
                </div>
            </div>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Health Score"
                    value={stats ? `${stats.accounts.uptime_pct}%` : '...'}
                    icon={ShieldCheck}
                    color="bg-emerald-500"
                    subtitle="Reliability"
                    loading={loading}
                />
                <StatCard
                    title="Total Accounts"
                    value={stats?.accounts?.total ?? '0'}
                    icon={Users}
                    color="bg-indigo-500"
                    subtitle="Managed"
                    loading={loading}
                />
                <StatCard
                    title="Actions (24h)"
                    value={stats?.tasks?.total_today ?? '0'}
                    icon={Activity}
                    color="bg-blue-500"
                    subtitle="Throughput"
                    loading={loading}
                />
                <StatCard
                    title="Action Success"
                    value={stats ? `${stats.tasks.success_rate}%` : '...'}
                    icon={TrendingUp}
                    color="bg-amber-500"
                    subtitle="Efficacy"
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Trend Chart */}
                <div className="lg:col-span-2 bg-gray-900/40 border border-gray-800 rounded-[2rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-white">Activity Overview</h2>
                            <p className="text-sm text-gray-500">
                                {timePeriod === 'today' && 'Tasks performed today'}
                                {timePeriod === 'yesterday' && 'Tasks performed yesterday'}
                                {timePeriod === '7days' && 'Tasks performed in the last 7 days'}
                            </p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {/* Time Period Filter Buttons */}
                            <div className="flex space-x-1 bg-gray-900/70 border border-gray-800 rounded-xl p-1">
                                <button
                                    onClick={() => setTimePeriod('today')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${timePeriod === 'today'
                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                        }`}
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => setTimePeriod('yesterday')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${timePeriod === 'yesterday'
                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                        }`}
                                >
                                    Yesterday
                                </button>
                                <button
                                    onClick={() => setTimePeriod('7days')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${timePeriod === '7days'
                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                                        }`}
                                >
                                    7 Days
                                </button>
                            </div>

                            {/* Legend */}
                            <div className="flex space-x-4">
                                <div className="flex items-center space-x-2">
                                    <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                                    <span className="text-xs text-gray-400 font-medium">Completed</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                    <span className="text-xs text-gray-400 font-medium">Failed</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.tasks?.trends || []}>
                                <defs>
                                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorFail" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#4b5563', fontSize: 10 }}
                                    interval={2}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#4b5563', fontSize: 10 }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="completed" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorComp)" />
                                <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFail)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Account Distribution (Pie) */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-[2rem] p-8 flex flex-col items-center">
                    <div className="w-full text-left mb-6">
                        <h2 className="text-xl font-bold text-white">Accounts</h2>
                        <p className="text-sm text-gray-500">Status distribution</p>
                    </div>

                    <div className="h-[250px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={85}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                    <Label
                                        value={`${stats?.accounts?.total || 0}`}
                                        position="center"
                                        fill="#fff"
                                        style={{ fontSize: '24px', fontWeight: 'bold' }}
                                    />
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="w-full space-y-3 mt-4">
                        {pieData.map((item: any) => (
                            <div key={item.name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-2 text-gray-400">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                                    <span>{item.name}</span>
                                </div>
                                <span className="text-white font-bold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Performance & Upcoming */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Task Performance Stats */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-[2rem] p-8 flex flex-col h-[500px]">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-white">
                            {timePeriod === 'today' && "Today's Performance"}
                            {timePeriod === 'yesterday' && "Yesterday's Performance"}
                            {timePeriod === '7days' && "Performance (Last 7 Days)"}
                        </h2>
                        <p className="text-sm text-gray-500">Successful actions by type</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl flex items-center justify-between hover:border-gray-700 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-pink-500/10 rounded-xl">
                                    <Activity className="w-6 h-6 text-pink-500" />
                                </div>
                                <span className="text-gray-400 font-medium">Likes</span>
                            </div>
                            <span className="text-2xl font-bold text-white">{stats?.activity_stats?.like || 0}</span>
                        </div>

                        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl flex items-center justify-between hover:border-gray-700 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-indigo-500/10 rounded-xl">
                                    <Users className="w-6 h-6 text-indigo-500" />
                                </div>
                                <span className="text-gray-400 font-medium">Follows</span>
                            </div>
                            <span className="text-2xl font-bold text-white">{stats?.activity_stats?.follow || 0}</span>
                        </div>

                        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl flex items-center justify-between hover:border-gray-700 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl">
                                    <TrendingUp className="w-6 h-6 text-blue-500" />
                                </div>
                                <span className="text-gray-400 font-medium">Posts</span>
                            </div>
                            <span className="text-2xl font-bold text-white">{stats?.activity_stats?.post || 0}</span>
                        </div>

                        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl flex items-center justify-between hover:border-gray-700 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-amber-500/10 rounded-xl">
                                    <Play className="w-6 h-6 text-amber-500" />
                                </div>
                                <span className="text-gray-400 font-medium">Stories</span>
                            </div>
                            <span className="text-2xl font-bold text-white">{stats?.activity_stats?.story || 0}</span>
                        </div>

                        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl flex items-center justify-between hover:border-gray-700 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-indigo-900/20 rounded-xl">
                                    <Video className="w-6 h-6 text-indigo-400" />
                                </div>
                                <span className="text-gray-400 font-medium">Reels</span>
                            </div>
                            <span className="text-2xl font-bold text-white">{stats?.activity_stats?.reels || 0}</span>
                        </div>

                        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl flex items-center justify-between hover:border-gray-700 transition-colors">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl">
                                    <Eye className="w-6 h-6 text-purple-500" />
                                </div>
                                <span className="text-gray-400 font-medium">Views</span>
                            </div>
                            <span className="text-2xl font-bold text-white">{stats?.activity_stats?.view || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Upcoming Schedules */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-[2rem] p-8 flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Upcoming Schedules</h2>
                            <p className="text-sm text-gray-500">Tasks waiting to be executed</p>
                        </div>
                        <button
                            onClick={fetchStats}
                            className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-400"
                        >
                            <Clock className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                        {stats?.schedules?.length > 0 ? (
                            stats.schedules.map((task: any) => (
                                <div key={task.id} className="flex items-center p-3 bg-gray-900/50 border border-gray-800 rounded-2xl hover:bg-gray-800/50 transition-all group">
                                    <div className="w-10 h-10 bg-gray-800/50 rounded-xl flex items-center justify-center mr-4 group-hover:scale-105 transition-transform flex-shrink-0">
                                        {getActivityIcon(task.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-white font-bold text-sm tracking-wide capitalize truncate">@{task.username}</p>
                                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest ${task.status === 'running' ? 'bg-blue-500/10 text-blue-500 animate-pulse' :
                                                'bg-amber-500/10 text-amber-500'
                                                }`}>
                                                {task.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center mt-0.5 text-[11px] text-gray-500 font-medium">
                                            <Clock className="w-3 h-3 mr-1 opacity-50" />
                                            <span>Starts {formatTime(task.scheduled_at)}</span>
                                            <span className="mx-2 opacity-20">|</span>
                                            <span className="uppercase text-[9px] opacity-70">{task.type.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                                <Clock className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                                <p className="text-gray-600 font-bold uppercase tracking-widest text-[10px]">No upcoming schedules</p>
                                <p className="text-gray-800 text-[10px] mt-1 italic">Schedule some tasks in the Scheduler page</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
