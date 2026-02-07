import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, User, Activity, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import api from '../api/client';

interface UserData {
    id: number;
    username: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
}

const AdminPanel: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // New User Form State
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newFullName, setNewFullName] = useState('');
    const [newRole, setNewRole] = useState('operator');
    const [createLoading, setCreateLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/accounts/users');
            setUsers(response.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

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
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create user');
        } finally {
            setCreateLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Admin Console</h1>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Control center for users and system permissions</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-600/20"
                >
                    <UserPlus className="w-5 h-5" />
                    <span>Invite New User</span>
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Users', value: users.length, icon: User, color: 'text-blue-400' },
                    { label: 'Active Operators', value: users.filter(u => u.role === 'operator').length, icon: Activity, color: 'text-green-400' },
                    { label: 'System Admins', value: users.filter(u => u.role === 'admin').length, icon: Shield, color: 'text-purple-400' },
                ].map((stat, i) => (
                    <div key={i} className="bg-[#1e293b]/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                            </div>
                            <div className={`${stat.color} bg-white/5 p-3 rounded-2xl`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Users Table */}
            <div className="bg-[#1e293b]/40 backdrop-blur-md border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
                <div className="px-8 py-6 border-b border-slate-700/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Access Management</h2>
                    <div className="text-xs font-mono text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                        TRUSTED_NODES: {users.length}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-800/30 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                <th className="px-8 py-4">Identity</th>
                                <th className="px-8 py-4">Clearance Level</th>
                                <th className="px-8 py-4">Status</th>
                                <th className="px-8 py-4 text-right">Protocol</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-8 py-6">
                                            <div className="h-10 bg-slate-700/50 rounded-xl w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-indigo-500/5 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-slate-600">
                                                    <span className="text-white font-bold">{user.username.charAt(0).toUpperCase()}</span>
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-base">{user.full_name || 'Generic ID'}</p>
                                                    <p className="text-slate-500 text-xs font-mono tracking-tighter">@{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.role === 'admin'
                                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center space-x-2">
                                                {user.is_active ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                )}
                                                <span className={`text-xs font-bold ${user.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                                    {user.is_active ? 'ENABLED' : 'DISABLED'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="text-slate-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-slate-950/40 animate-in fade-in zoom-in duration-300">
                    <div className="bg-[#1e293b] border border-slate-700/50 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-6">
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2">New Identity Protocol</h3>
                        <p className="text-slate-400 text-sm mb-8">Generate unique credentials for system operators</p>

                        <form onSubmit={handleCreateUser} className="space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-2xl text-xs font-bold">
                                    AUTH_ERROR: {error}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest translate-x-1">Username</label>
                                <input
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="Enter unique ID..."
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest translate-x-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest translate-x-1">Full Name</label>
                                <input
                                    className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                                    placeholder="Legal Identification..."
                                    value={newFullName}
                                    onChange={e => setNewFullName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1 pt-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest translate-x-1">Clearance Level</label>
                                <div className="flex gap-3">
                                    {['operator', 'admin'].map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setNewRole(role)}
                                            className={`flex-1 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${newRole === role
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-600'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                disabled={createLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-600/20 mt-4 disabled:opacity-50"
                            >
                                {createLoading ? 'INITIALIZING...' : 'EXECUTE CREATION'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
