import React, { useState, useEffect } from 'react';
import { LifeBuoy, Plus, MessageSquare, Clock, CheckCircle2, Send, ArrowLeft, Loader2, User, Search, Filter } from 'lucide-react';
import api from '../api/client';
import { formatDistanceToNow } from 'date-fns';

type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high';

interface TicketMessage {
    id: number;
    message: string;
    user_id: number;
    created_at: string;
}

interface Ticket {
    id: number;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    created_at: string;
    updated_at: string;
    messages: TicketMessage[];
}

interface TicketList {
    id: number;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    created_at: string;
    updated_at: string;
}

const SupportTickets = () => {
    const [tickets, setTickets] = useState<TicketList[]>([]);
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', message: '', priority: 'medium' as TicketPriority });
    const [replyMessage, setReplyMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const response = await api.get('/tickets');
            setTickets(response.data);
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketDetails = async (id: number) => {
        setLoading(true);
        try {
            const response = await api.get(`/tickets/${id}`);
            setActiveTicket(response.data);
        } catch (error) {
            console.error('Failed to fetch ticket details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/tickets', newTicket);
            setShowCreateModal(false);
            setNewTicket({ subject: '', message: '', priority: 'medium' });
            fetchTickets();
        } catch (error) {
            console.error('Failed to create ticket:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !activeTicket) return;
        setSubmitting(true);
        try {
            await api.post(`/tickets/${activeTicket.id}/messages`, { message: replyMessage });
            setReplyMessage('');
            fetchTicketDetails(activeTicket.id);
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: TicketStatus) => {
        switch (status) {
            case 'open': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'resolved': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'closed': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const getPriorityColor = (priority: TicketPriority) => {
        switch (priority) {
            case 'high': return 'text-rose-400';
            case 'medium': return 'text-amber-400';
            case 'low': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    const filteredTickets = tickets.filter(t => {
        const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = statusFilter === 'all' || t.status === statusFilter;
        return matchesSearch && matchesFilter;
    });

    if (activeTicket) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <button
                    onClick={() => setActiveTicket(null)}
                    className="flex items-center text-gray-400 hover:text-white transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Tickets
                </button>

                <div className="bg-gray-950/50 border border-gray-800 rounded-[2rem] overflow-hidden flex flex-col h-[calc(100vh-16rem)]">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center space-x-3 mb-1">
                                <h2 className="text-xl font-bold text-white tracking-tight">{activeTicket.subject}</h2>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(activeTicket.status)}`}>
                                    {activeTicket.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500">
                                Ticket #{activeTicket.id} • Created {formatDistanceToNow(new Date(activeTicket.created_at))} ago
                            </p>
                        </div>
                        <div className="px-4 py-2 bg-gray-800/50 rounded-2xl border border-gray-700">
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-0.5">Priority</span>
                            <span className={`text-sm font-bold capitalize ${getPriorityColor(activeTicket.priority)}`}>{activeTicket.priority}</span>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.02),transparent)]">
                        {activeTicket.messages.map((msg) => {
                            const isMe = msg.user_id !== 1; // Simplification: admin is usually user_id 1 in this context setup or check role
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] space-y-2`}>
                                        <div className={`p-4 rounded-3xl text-sm ${isMe
                                            ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-50 shadow-[0_0_20px_rgba(99,102,241,0.1)] rounded-tr-none'
                                            : 'bg-gray-800/50 border border-gray-700 text-gray-200 rounded-tl-none'
                                            }`}>
                                            {msg.message}
                                        </div>
                                        <p className={`text-[10px] text-gray-500 font-medium px-2 ${isMe ? 'text-right' : 'text-left'}`}>
                                            {isMe ? 'You' : 'Admin'} • {formatDistanceToNow(new Date(msg.created_at))} ago
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Input Area */}
                    {activeTicket.status !== 'closed' && (
                        <div className="p-6 border-t border-gray-800 bg-gray-900/30">
                            <form onSubmit={handleSendReply} className="relative">
                                <textarea
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                    className="w-full bg-gray-950/50 border border-gray-800 text-white text-sm rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block p-4 pr-16 transition-all duration-200 outline-none resize-none min-h-[100px]"
                                />
                                <button
                                    type="submit"
                                    disabled={submitting || !replyMessage.trim()}
                                    className="absolute bottom-4 right-4 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 group"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        <LifeBuoy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Customer Support</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Tiket Pengaduan</h1>
                    <p className="text-gray-500 text-sm max-w-lg">Sampaikan keluhan atau pertanyaan Anda. Tim kami akan segera membantu menyelesaikan masalah Anda.</p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all flex items-center group active:scale-95"
                >
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                    Buat Tiket Baru
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Tiket', value: tickets.length, icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                    { label: 'Tiket Aktif', value: tickets.filter(t => t.status === 'open' || t.status === 'pending').length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Terselesaikan', value: tickets.filter(t => t.status === 'resolved').length, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
                ].map((stat, i) => (
                    <div key={i} className="bg-gray-950/40 border border-gray-800/60 p-5 rounded-3xl flex items-center space-x-4">
                        <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-white">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap items-center gap-4 bg-gray-900/30 p-4 rounded-3xl border border-gray-800/40">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Cari tiket..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-950/50 border border-gray-800 text-white text-sm rounded-2xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-gray-950/50 border border-gray-800 text-white text-sm rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    >
                        <option value="all">Semua Status</option>
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
            </div>

            {/* Ticket List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-950/20 border border-gray-800 rounded-[2.5rem]">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Memuat data tiket...</p>
                    </div>
                ) : filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            onClick={() => fetchTicketDetails(ticket.id)}
                            className="group relative bg-gray-950/50 border border-gray-800 hover:border-indigo-500/50 hover:bg-gray-900/40 p-6 rounded-[2rem] transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                                <MessageSquare className="w-24 h-24" />
                            </div>

                            <div className="relative flex flex-wrap items-center justify-between gap-6">
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center space-x-3">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${getPriorityColor(ticket.priority)}`}>
                                            {ticket.priority} Priority
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{ticket.subject}</h3>
                                    <div className="flex items-center space-x-4 text-xs text-gray-500 font-medium">
                                        <span className="flex items-center">
                                            <Clock className="w-3.5 h-3.5 mr-1.5" />
                                            Update {formatDistanceToNow(new Date(ticket.updated_at))} ago
                                        </span>
                                        <span className="flex items-center">
                                            <User className="w-3.5 h-3.5 mr-1.5" />
                                            Ticket #{ticket.id}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                                    <div className="px-5 py-2.5 bg-gray-900 rounded-xl border border-gray-800/50 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all font-bold text-sm">
                                        Lihat Detail
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 bg-gray-950/20 border-2 border-dashed border-gray-800 rounded-[2.5rem]">
                        <div className="w-20 h-20 bg-gray-900 rounded-[2rem] flex items-center justify-center mb-6 border border-gray-800">
                            <LifeBuoy className="w-10 h-10 text-gray-700" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Belum Ada Tiket</h3>
                        <p className="text-gray-500 text-sm max-w-sm text-center px-6">Anda belum memiliki tiket pengaduan. Jika Anda mengalami kesulitan, silakan buat tiket baru.</p>
                    </div>
                )}
            </div>

            {/* Create Ticket Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                    <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black text-white tracking-tight">Buat Tiket Baru</h2>
                                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-800 rounded-xl transition-colors">
                                    <Plus className="w-6 h-6 text-gray-500 rotate-45" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTicket} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Subject / Masalah</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Contoh: Gagal login akun Instagram"
                                        value={newTicket.subject}
                                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                        className="w-full bg-gray-950/50 border border-gray-800 text-white text-sm rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Prioritas</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['low', 'medium', 'high'] as TicketPriority[]).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setNewTicket({ ...newTicket, priority: p })}
                                                className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${newTicket.priority === p
                                                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                                                    : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Deskripsi Detail</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Jelaskan masalah Anda secara detail..."
                                        value={newTicket.message}
                                        onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                                        className="w-full bg-gray-950/50 border border-gray-800 text-white text-sm rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kirim Pengaduan'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportTickets;
