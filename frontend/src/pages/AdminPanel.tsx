import React, { useState, useEffect } from 'react';
import {
    UserPlus, Shield, User, Activity, MoreVertical, CheckCircle, XCircle,
    Users, Instagram, DollarSign, LifeBuoy, MessageSquare, Clock, CheckCircle2,
    Search, Filter, Send, Loader2, ArrowLeft, Ban, Unlock, Package, Upload, Eye, X
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface UserData {
    id: number;
    username: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
    avatar?: string | null;
}

interface AdminStats {
    total_operators: number;
    total_sys_ig: number;
    monthly_revenue: number;
}

interface TicketMessage {
    id: number;
    user_id: number;
    message: string;
    created_at: string;
}

interface Ticket {
    id: number;
    user_id: number;
    subject: string;
    priority: string;
    status: string;
    created_at: string;
    updated_at: string;
    messages: TicketMessage[];
}

const AdminPanel: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tickets' | 'proxy-orders'>('overview');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Ticket Detail View
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    // New User Form State
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newFullName, setNewFullName] = useState('');
    const [newRole, setNewRole] = useState('operator');
    const [createLoading, setCreateLoading] = useState(false);
    const [error, setError] = useState('');

    // Proxy Orders State
    const [proxyOrders, setProxyOrders] = useState<any[]>([]);
    const [proxyFilter, setProxyFilter] = useState<'all' | 'pending' | 'fulfilled'>('all');
    const [proxySearchQuery, setProxySearchQuery] = useState('');
    const [showAssignProxyModal, setShowAssignProxyModal] = useState(false);
    const [showViewProxyModal, setShowViewProxyModal] = useState(false);
    const [activeProxyOrder, setActiveProxyOrder] = useState<any>(null);
    const [proxyInputs, setProxyInputs] = useState<any[]>([]);
    const [csvText, setCsvText] = useState('');
    const [proxySubmitting, setProxySubmitting] = useState(false);
    const [viewProxyAssignments, setViewProxyAssignments] = useState<any[]>([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, usersRes, ticketsRes] = await Promise.all([
                api.get('/dashboard/stats'),
                api.get('/accounts/users'),
                api.get('/tickets')
            ]);
            setStats(statsRes.data.admin_stats);
            setUsers(usersRes.data);
            setTickets(ticketsRes.data);
        } catch (err) {
            console.error('Failed to fetch admin data', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProxyOrders = async () => {
        try {
            const res = await api.get(`/admin/proxy-orders?status=${proxyFilter}`);
            setProxyOrders(res.data);
        } catch (err) {
            console.error('Failed to fetch proxy orders', err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Polling for Ticket List and Stats (every 15 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    // Polling for Active Ticket Detail (every 5 seconds)
    useEffect(() => {
        if (!activeTicket) return;

        const interval = setInterval(() => {
            // Only poll if not currently sending a reply
            if (!sendingReply) {
                api.get(`/tickets/${activeTicket.id}`)
                    .then(res => {
                        // Only update if messages length or status changed
                        if (res.data.messages.length !== activeTicket.messages.length || res.data.status !== activeTicket.status) {
                            setActiveTicket(res.data);
                        }
                    })
                    .catch(e => console.error("Admin polling error", e));
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [activeTicket, sendingReply]);

    useEffect(() => {
        if (activeTab === 'proxy-orders') {
            fetchProxyOrders();
        }
    }, [activeTab, proxyFilter]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setCreateLoading(true);
        try {
            await api.post('/accounts/users', {
                username: newUsername,
                password: newPassword,
                full_name: newFullName,
                role: newRole,
                is_active: true
            });
            setShowCreateModal(false);
            setNewUsername('');
            setNewPassword('');
            setNewFullName('');
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create user');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleToggleUserStatus = async (userId: number) => {
        try {
            await api.patch(`/accounts/users/${userId}/status`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Gagal mengubah status user');
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTicket || !replyMessage.trim()) return;
        setSendingReply(true);
        try {
            const res = await api.post(`/tickets/${activeTicket.id}/messages`, {
                message: replyMessage
            });
            // Append message locally and update status
            setActiveTicket({
                ...activeTicket,
                messages: [...activeTicket.messages, res.data],
                status: 'answered'
            });
            setReplyMessage('');
            fetchData(); // Refresh list
        } catch (err) {
            console.error('Failed to send reply', err);
        } finally {
            setSendingReply(false);
        }
    };

    const fetchTicketDetails = async (id: number) => {
        console.log('Admin fetching details for ticket:', id);
        try {
            const res = await api.get(`/tickets/${id}`);
            if (!res.data) throw new Error('Data null');
            setActiveTicket(res.data);
        } catch (err: any) {
            console.error('Failed to fetch ticket details', err);
            alert('Admin Error: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleUpdateTicket = async (ticketId: number, status: string) => {
        try {
            await api.patch(`/tickets/${ticketId}`, { status });
            if (activeTicket?.id === ticketId) {
                await fetchTicketDetails(ticketId);
            }
            fetchData();
        } catch (err) {
            console.error('Failed to update ticket', err);
        }
    };

    // Proxy Orders Handlers
    const filteredProxyOrders = proxyOrders.filter(order =>
        order.username.toLowerCase().includes(proxySearchQuery.toLowerCase()) ||
        order.email.toLowerCase().includes(proxySearchQuery.toLowerCase())
    );

    const openAssignProxyModal = (order: any) => {
        setActiveProxyOrder(order);
        const inputs = Array(order.quantity).fill(null).map(() => ({
            ip: '', port: 80, username: '', password: ''
        }));
        setProxyInputs(inputs);
        setCsvText('');
        setShowAssignProxyModal(true);
    };

    const handleProxyInputChange = (index: number, field: string, value: any) => {
        const updated = [...proxyInputs];
        updated[index] = { ...updated[index], [field]: value };
        setProxyInputs(updated);
    };

    const importProxyFromCSV = () => {
        const lines = csvText.trim().split('\n');
        lines.forEach((line, index) => {
            if (index >= proxyInputs.length) return;
            const parts = line.trim().split(':');
            if (parts.length >= 1) {
                handleProxyInputChange(index, 'ip', parts[0] || '');
                handleProxyInputChange(index, 'port', parseInt(parts[1]) || 80);
                handleProxyInputChange(index, 'username', parts[2] || '');
                handleProxyInputChange(index, 'password', parts[3] || '');
            }
        });
        setCsvText('');
    };

    const handleSubmitProxies = async () => {
        if (!activeProxyOrder) return;
        const hasEmpty = proxyInputs.some(p => !p.ip.trim());
        if (hasEmpty) {
            alert('All IP addresses are required!');
            return;
        }
        try {
            setProxySubmitting(true);
            const proxies = proxyInputs.map(p => ({
                ip: p.ip.trim(),
                port: p.port,
                username: p.username.trim() || null,
                password: p.password.trim() || null
            }));
            await api.post(`/admin/proxy-orders/${activeProxyOrder.id}/assign`, { proxies });
            alert('Proxies assigned successfully!');
            setShowAssignProxyModal(false);
            fetchProxyOrders();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to assign proxies');
        } finally {
            setProxySubmitting(false);
        }
    };

    const viewAssignedProxies = async (order: any) => {
        try {
            const res = await api.get(`/admin/proxy-orders/${order.id}/assignments`);
            setViewProxyAssignments(res.data);
            setActiveProxyOrder(order);
            setShowViewProxyModal(true);
        } catch (err) {
            console.error('Failed to fetch assignments', err);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const colors: any = {
            'open': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'answered': 'bg-green-500/10 text-green-400 border-green-500/20',
            'customer-reply': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            'closed': 'bg-slate-500/10 text-slate-400 border-slate-500/20'
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[status.toLowerCase()] || colors.closed}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Admin Console</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Control center for system management & monitoring</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-[#1e293b]/60 backdrop-blur-md p-1 rounded-2xl border border-slate-700/50">
                        {[
                            { id: 'overview', label: 'Overview', icon: Activity },
                            { id: 'users', label: 'Users', icon: Users },
                            { id: 'tickets', label: 'Tickets', icon: LifeBuoy },
                            { id: 'proxy-orders', label: 'Proxy Orders', icon: Package },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as any);
                                    setActiveTicket(null);
                                }}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                    {activeTab === 'users' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white px-5 py-2.5 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-600/20"
                        >
                            <UserPlus className="w-5 h-5" />
                            <span className="hidden sm:inline">Invite User</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Overview Section */}
            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* Admin Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                label: 'Total Operators',
                                value: stats?.total_operators || 0,
                                icon: Users,
                                gradient: 'from-blue-500 to-indigo-500',
                                desc: 'Active system users'
                            },
                            {
                                label: 'Instagram Total',
                                value: stats?.total_sys_ig || 0,
                                icon: Instagram,
                                gradient: 'from-purple-500 to-pink-500',
                                desc: 'Accounts across all users'
                            },
                            {
                                label: 'Monthly Revenue',
                                value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats?.monthly_revenue || 0),
                                icon: DollarSign,
                                gradient: 'from-emerald-500 to-teal-500',
                                desc: 'Projected monthly billing'
                            },
                        ].map((stat, i) => (
                            <div key={i} className="group relative overflow-hidden bg-[#1e293b]/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-[2rem] hover:border-slate-600/50 transition-all">
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-[0.03] blur-2xl group-hover:opacity-[0.07] transition-opacity`}></div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                                        <p className="text-3xl font-bold text-white mt-2 font-mono tracking-tight">{stat.value}</p>
                                        <p className="text-slate-400 text-[10px] mt-2 font-medium bg-slate-800/50 w-fit px-2 py-0.5 rounded-full">{stat.desc}</p>
                                    </div>
                                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg shadow-indigo-500/10`}>
                                        <stat.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Summary Lists or Charts could go here */}
                        <div className="bg-[#1e293b]/40 border border-slate-700/50 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <Shield className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">System Security Active</h3>
                                <p className="text-slate-400 text-sm max-w-xs mt-2">All nodes are operational. No security breaches detected in the last 24 hours.</p>
                            </div>
                        </div>

                        <div className="bg-[#1e293b]/40 border border-slate-700/50 rounded-[2.5rem] p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-white">Pending Support</h3>
                                <LifeBuoy className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="space-y-4">
                                {tickets.filter(t => t.status === 'open' || t.status === 'customer-reply').slice(0, 3).map(ticket => (
                                    <div key={ticket.id} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                            <p className="text-sm font-medium text-slate-200 truncate max-w-[150px]">{ticket.subject}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setActiveTab('tickets');
                                                fetchTicketDetails(ticket.id);
                                            }}
                                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase"
                                        >
                                            View
                                        </button>
                                    </div>
                                ))}
                                {tickets.filter(t => t.status === 'open').length === 0 && (
                                    <p className="text-slate-500 text-center text-sm py-4 italic">No pending urgent tickets</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* User Access Section */}
            {activeTab === 'users' && (
                <div className="bg-[#1e293b]/40 backdrop-blur-md border border-slate-700/50 rounded-[2.5rem] overflow-hidden shadow-xl">
                    <div className="px-8 py-6 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-xl font-bold text-white">User Matrix</h2>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="Search identity..."
                                />
                            </div>
                            <button className="p-2 bg-slate-800 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors">
                                <Filter className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-800/30 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                    <th className="px-8 py-5">Identity Protocol</th>
                                    <th className="px-8 py-5">Clearance</th>
                                    <th className="px-8 py-5">Node Status</th>
                                    <th className="px-8 py-5 text-right">Action Protocol</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {loading ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={4} className="px-8 py-6">
                                                <div className="h-10 bg-slate-700/30 rounded-xl w-full"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id} className="hover:bg-indigo-500/5 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center space-x-4">
                                                    <div className="relative">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110 duration-300 ${user.is_active ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-red-500/10 border-red-500/20'
                                                            }`}>
                                                            {user.avatar ? (
                                                                <img src={user.avatar} className="w-full h-full rounded-2xl object-cover" alt="" />
                                                            ) : (
                                                                <span className="text-white font-black text-lg">{user.username.charAt(0).toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        {user.is_active && (
                                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#1e293b] rounded-full"></div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-base group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{user.full_name || 'Generic Identification'}</p>
                                                        <p className="text-slate-500 text-[10px] font-black tracking-widest mt-1">ID_{user.username.toUpperCase()}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${user.role === 'admin'
                                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_15px_-5px_rgba(168,85,247,0.4)]'
                                                    : 'bg-indigo-500/5 text-indigo-400/70 border-indigo-500/20'
                                                    }`}>
                                                    <Shield className="w-3 h-3 mr-1.5" />
                                                    {user.role}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`p-1.5 rounded-lg border ${user.is_active ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
                                                        }`}>
                                                        {user.is_active ? (
                                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 text-red-500" />
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] font-black tracking-widest ${user.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                                        {user.is_active ? 'ENFORCE_ACTIVE' : 'LOCKED_BY_ADMIN'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => handleToggleUserStatus(user.id)}
                                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${user.is_active
                                                                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 text-white'
                                                                : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500 text-white'
                                                                }`}
                                                        >
                                                            {user.is_active ? <Ban className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                                            {user.is_active ? 'Ban Account' : 'Unban'}
                                                        </button>
                                                    )}
                                                    <button className="p-2 bg-slate-800/50 rounded-xl border border-slate-700 text-slate-500 hover:text-white transition-colors">
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tickets Support Section */}
            {activeTab === 'tickets' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
                    {/* Ticket List Panel */}
                    <div className={`lg:col-span-5 bg-[#1e293b]/40 backdrop-blur-md border border-slate-700/50 rounded-[2.5rem] flex flex-col overflow-hidden ${activeTicket ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="p-8 border-b border-slate-700/50">
                            <h2 className="text-xl font-bold text-white mb-4">Support Hub</h2>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    placeholder="Search tickets..."
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {tickets.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50 shadow-inner">
                                        <LifeBuoy className="w-8 h-8 text-slate-600" />
                                    </div>
                                    <p className="text-slate-400 font-medium">No records matching query</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-700/30">
                                    {tickets.map(ticket => (
                                        <button
                                            key={ticket.id}
                                            onClick={() => fetchTicketDetails(ticket.id)}
                                            className={`w-full p-6 text-left transition-all hover:bg-slate-800/30 group relative ${activeTicket?.id === ticket.id ? 'bg-indigo-600/10 border-l-4 border-l-indigo-500' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-white font-bold truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight pr-4">{ticket.subject}</p>
                                                <StatusBadge status={ticket.status} />
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    <span>UID_{ticket.user_id || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatDistanceToNow(new Date(ticket.updated_at))} ago</span>
                                                </div>
                                            </div>
                                            <p className="mt-3 text-slate-400 text-xs line-clamp-1 opacity-70">
                                                {ticket.messages && ticket.messages.length > 0
                                                    ? ticket.messages[ticket.messages.length - 1]?.message
                                                    : 'No messages yet'}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Panel */}
                    <div className={`lg:col-span-7 bg-[#1e293b]/40 backdrop-blur-md border border-slate-700/50 rounded-[2.5rem] flex flex-col overflow-hidden relative ${!activeTicket ? 'hidden lg:flex' : 'flex'}`}>
                        {activeTicket ? (
                            <>
                                <div className="p-6 border-b border-slate-700/50 flex items-center justify-between bg-white/[0.02]">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setActiveTicket(null)} className="lg:hidden p-2 text-slate-400 hover:text-white">
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <div>
                                            <h3 className="text-lg font-bold text-white uppercase tracking-tight">{activeTicket.subject}</h3>
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${activeTicket.priority === 'urgent' ? 'bg-red-500' : 'bg-indigo-400'}`}></div>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{activeTicket.priority}</span>
                                                </div>
                                                <span className="text-slate-700">|</span>
                                                <StatusBadge status={activeTicket.status} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleUpdateTicket(activeTicket.id, 'resolved')}
                                            disabled={activeTicket.status === 'closed'}
                                            className="p-2.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Mark Resolved"
                                        >
                                            <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleUpdateTicket(activeTicket.id, 'closed')}
                                            disabled={activeTicket.status === 'closed'}
                                            className="p-2.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Close Ticket"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.03),transparent)]">
                                    {activeTicket.messages.map((msg, i) => {
                                        const isMe = user && msg.user_id === user.id;
                                        return (
                                            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                                                    <div className={`px-5 py-3 rounded-[1.5rem] shadow-sm relative group ${isMe
                                                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                                                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-none'
                                                        }`}>
                                                        <p className="text-sm leading-relaxed">{msg.message}</p>
                                                        <div className={`absolute -bottom-5 ${isMe ? 'right-1' : 'left-1'} text-[8px] font-black text-slate-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="p-6 bg-slate-800/30 border-t border-slate-700/50">
                                    {activeTicket.status === 'closed' ? (
                                        <div className="flex items-center justify-center p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-slate-500 font-bold text-[10px] uppercase tracking-widest text-center italic">
                                            <Clock className="w-4 h-4 mr-2" />
                                            Tiket ini sudah ditutup. Anda tidak dapat mengirim pesan lagi.
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSendReply} className="flex gap-3">
                                            <input
                                                value={replyMessage}
                                                onChange={(e) => setReplyMessage(e.target.value)}
                                                placeholder="Transmit message to user..."
                                                className="flex-1 bg-slate-900/60 border border-slate-700 text-white rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            />
                                            <button
                                                disabled={sendingReply || !replyMessage.trim()}
                                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/20"
                                            >
                                                {sendingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                                <div className="w-24 h-24 bg-gradient-to-br from-slate-700 to-slate-800 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-600/30 shadow-2xl">
                                    <MessageSquare className="w-10 h-10 text-slate-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Communication Terminal</h3>
                                <p className="text-slate-400 text-sm max-w-[240px]">Select an active transmission on the left to review intelligence or send instructions.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Proxy Orders Section */}
            {activeTab === 'proxy-orders' && (
                <div className="space-y-8">
                    {/* Filters & Search */}
                    <div className="bg-[#1e293b]/40 backdrop-blur-md border border-slate-700/50 rounded-[2rem] p-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="flex gap-2">
                                {['all', 'pending', 'fulfilled'].map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => setProxyFilter(filter as any)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${proxyFilter === filter
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
                                            }`}
                                    >
                                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    value={proxySearchQuery}
                                    onChange={(e) => setProxySearchQuery(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="Search by username or email..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Orders Table */}
                    <div className="bg-[#1e293b]/40 backdrop-blur-md border border-slate-700/50 rounded-[2.5rem] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-800/30 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                        <th className="px-8 py-5">ID</th>
                                        <th className="px-8 py-5">User</th>
                                        <th className="px-8 py-5">Type</th>
                                        <th className="px-8 py-5">Quantity</th>
                                        <th className="px-8 py-5">Price</th>
                                        <th className="px-8 py-5">Purchase Date</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5">Progress</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/30">
                                    {loading ? (
                                        [1, 2, 3].map(i => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={9} className="px-8 py-6">
                                                    <div className="h-10 bg-slate-700/30 rounded-xl w-full"></div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : filteredProxyOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-8 py-12 text-center text-slate-500">
                                                No orders found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProxyOrders.map(order => (
                                            <tr key={order.id} className="hover:bg-indigo-500/5 transition-colors">
                                                <td className="px-8 py-5">
                                                    <span className="text-white font-mono font-bold">#{order.id}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div>
                                                        <p className="text-white font-bold">{order.username}</p>
                                                        <p className="text-slate-500 text-xs">{order.email}</p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-slate-300 capitalize">{order.sub_type || 'N/A'}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-white font-bold">{order.quantity}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-white font-mono text-sm">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(order.price_paid)}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-slate-400 text-sm">
                                                        {new Date(order.start_date).toLocaleDateString('id-ID')}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${order.fulfilled_at
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        }`}>
                                                        {order.fulfilled_at ? 'Fulfilled' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-slate-300 font-mono text-sm">
                                                        {order.assigned_count} / {order.quantity}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    {order.fulfilled_at ? (
                                                        <button
                                                            onClick={() => viewAssignedProxies(order)}
                                                            className="flex items-center gap-2 ml-auto px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase hover:bg-slate-700 transition-all"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            View Proxies
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => openAssignProxyModal(order)}
                                                            className="flex items-center gap-2 ml-auto px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                                                        >
                                                            <Package className="w-4 h-4" />
                                                            Assign Proxies
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Proxies Modal */}
            {showAssignProxyModal && activeProxyOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/60 animate-in fade-in zoom-in duration-300">
                    <div className="bg-[#1e293b] border border-slate-700/50 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-8 border-b border-slate-700/50 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-white">Assign Proxies</h3>
                                <p className="text-slate-400 text-sm mt-2">
                                    User: <span className="font-bold text-white">{activeProxyOrder.username}</span> |
                                    Type: <span className="font-bold text-white capitalize">{activeProxyOrder.sub_type}</span> |
                                    Quantity: <span className="font-bold text-white">{activeProxyOrder.quantity} proxies</span>
                                </p>
                            </div>
                            <button onClick={() => setShowAssignProxyModal(false)} className="text-slate-500 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 bg-blue-500/5 border-b border-slate-700/50">
                            <h4 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                Quick Import from CSV
                            </h4>
                            <p className="text-xs text-slate-500 mb-3">
                                Format: <code className="bg-slate-800 px-2 py-1 rounded">ip:port:username:password</code> (one per line)
                            </p>
                            <textarea
                                value={csvText}
                                onChange={(e) => setCsvText(e.target.value)}
                                rows={4}
                                className="w-full bg-slate-900/60 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                                placeholder="192.168.1.1:8080:user1:pass1&#10;192.168.1.2:8080:user2:pass2"
                            />
                            <button onClick={importProxyFromCSV} className="mt-3 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all">
                                Import CSV
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                            <h4 className="text-sm font-bold text-white mb-4">Proxy IP Assignments</h4>
                            {proxyInputs.map((proxy, index) => (
                                <div key={index} className="grid grid-cols-4 gap-3 p-4 bg-slate-800/30 rounded-xl">
                                    <input
                                        type="text"
                                        value={proxy.ip}
                                        onChange={(e) => handleProxyInputChange(index, 'ip', e.target.value)}
                                        placeholder={`IP Address ${index + 1}`}
                                        className="bg-slate-900/60 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                    <input
                                        type="number"
                                        value={proxy.port}
                                        onChange={(e) => handleProxyInputChange(index, 'port', parseInt(e.target.value) || 80)}
                                        placeholder="Port"
                                        className="bg-slate-900/60 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                    <input
                                        type="text"
                                        value={proxy.username}
                                        onChange={(e) => handleProxyInputChange(index, 'username', e.target.value)}
                                        placeholder="Username (optional)"
                                        className="bg-slate-900/60 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                    <input
                                        type="text"
                                        value={proxy.password}
                                        onChange={(e) => handleProxyInputChange(index, 'password', e.target.value)}
                                        placeholder="Password (optional)"
                                        className="bg-slate-900/60 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="p-8 border-t border-slate-700/50 flex justify-end gap-4">
                            <button
                                onClick={() => setShowAssignProxyModal(false)}
                                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitProxies}
                                disabled={proxySubmitting}
                                className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                {proxySubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                Submit Proxies
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Assignments Modal */}
            {showViewProxyModal && activeProxyOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/60 animate-in fade-in zoom-in duration-300">
                    <div className="bg-[#1e293b] border border-slate-700/50 w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-8 border-b border-slate-700/50 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-white">Assigned Proxies</h3>
                                <p className="text-slate-400 text-sm mt-2">
                                    User: <span className="font-bold text-white">{activeProxyOrder.username}</span> |
                                    {viewProxyAssignments.length} proxies
                                </p>
                            </div>
                            <button onClick={() => setShowViewProxyModal(false)} className="text-slate-500 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar">
                            {viewProxyAssignments.map((assignment) => (
                                <div key={assignment.id} className="grid grid-cols-4 gap-3 p-4 bg-slate-800/30 rounded-xl">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">IP Address</p>
                                        <p className="text-white font-mono text-sm">{assignment.proxy_ip}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Port</p>
                                        <p className="text-white font-mono text-sm">{assignment.proxy_port}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Username</p>
                                        <p className="text-white font-mono text-sm">{assignment.proxy_username || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Password</p>
                                        <p className="text-white font-mono text-sm">{assignment.proxy_password || '-'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 border-t border-slate-700/50 flex justify-end">
                            <button
                                onClick={() => setShowViewProxyModal(false)}
                                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/40 animate-in fade-in zoom-in duration-300">
                    <div className="bg-[#1e293b] border border-slate-700/50 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-6">
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">Access Protocol</h3>
                        <p className="text-slate-400 text-xs mb-8 font-black uppercase tracking-[0.2em] opacity-60">Provision New Identity</p>

                        <form onSubmit={handleCreateUser} className="space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
                                    Auth_Protocol_Error: {error}
                                </div>
                            )}

                            {[
                                { label: 'Username', type: 'text', value: newUsername, set: setNewUsername, ph: 'ID_IDENTIFIER...' },
                                { label: 'Password', type: 'password', value: newPassword, set: setNewPassword, ph: '••••••••' },
                                { label: 'Legal Name', type: 'text', value: newFullName, set: setNewFullName, ph: 'Full Identity Name...' },
                            ].map((field, i) => (
                                <div key={i} className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{field.label}</label>
                                    <input
                                        type={field.type}
                                        className="w-full bg-slate-900/60 border border-slate-700 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all outline-none text-sm"
                                        placeholder={field.ph}
                                        value={field.value}
                                        onChange={e => field.set(e.target.value)}
                                        required={field.label !== 'Legal Name'}
                                    />
                                </div>
                            ))}

                            <div className="space-y-1 pt-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Clearance Tier</label>
                                <div className="flex gap-3">
                                    {['operator', 'admin'].map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setNewRole(role)}
                                            className={`flex-1 py-3.5 rounded-2xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all ${newRole === role
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                                                : 'bg-slate-900/40 border-slate-700 text-slate-500 hover:border-slate-600'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                disabled={createLoading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-600/20 mt-4 disabled:opacity-50 text-[10px] uppercase tracking-[0.3em]"
                            >
                                {createLoading ? 'Provisioning...' : 'Execute Creation'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
