import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { User, Mail, Shield, Save, Key, Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

const ProfileSettings = () => {
    const { user, fetchUser } = useAuth();
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        avatar: user?.avatar || '',
        password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        if (formData.password && formData.password !== formData.confirm_password) {
            setStatus({ type: 'error', message: 'Passwords do not match' });
            setLoading(false);
            return;
        }

        try {
            await api.put('/accounts/auth/me', {
                full_name: formData.full_name,
                avatar: formData.avatar,
                ...(formData.password ? { password: formData.password } : {})
            });

            await fetchUser(); // Refresh local user data
            setStatus({ type: 'success', message: 'Profile updated successfully!' });
            setFormData(prev => ({ ...prev, password: '', confirm_password: '' })); // Clear passwords
        } catch (error: any) {
            console.error('Update failed:', error);
            setStatus({ type: 'error', message: error.response?.data?.detail || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Profile Settings</h1>
                <p className="text-gray-500 mt-1 font-medium italic">Manage your account information and security preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Overview Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-[2rem] p-8 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative z-10">
                            <div className="relative inline-block mb-6">
                                <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-1 shadow-2xl shadow-indigo-500/20 mx-auto">
                                    <div className="w-full h-full rounded-3xl bg-gray-950 flex items-center justify-center overflow-hidden">
                                        {formData.avatar ? (
                                            <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                            <User className="w-16 h-16 text-indigo-400" />
                                        )}
                                    </div>
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-gray-950 rounded-full shadow-lg"></div>
                            </div>

                            <h2 className="text-xl font-bold text-white mb-1">{formData.full_name || user?.username}</h2>
                            <p className="text-sm text-gray-500 uppercase tracking-widest font-black text-[10px] mb-4">@{user?.username}</p>

                            <div className="inline-flex items-center px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                {user?.role || 'Operator'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-900/30 border border-gray-800/50 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center space-x-3 text-gray-400">
                            <Mail className="w-4 h-4" />
                            <span className="text-xs font-medium">{user?.username}@instatools.io</span>
                        </div>
                        <div className="flex items-center space-x-3 text-gray-400">
                            <Shield className="w-4 h-4" />
                            <span className="text-xs font-medium">Account ID: #{user?.id}</span>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-[2.5rem] p-8 md:p-10 space-y-8">
                        {status && (
                            <div className={clsx(
                                "flex items-center space-x-3 p-4 rounded-2xl border animate-in zoom-in duration-300",
                                status.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                            )}>
                                {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                                <p className="text-sm font-medium">{status.message}</p>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User className="w-4 h-4 text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            className="w-full bg-gray-950/50 border border-gray-800 text-white text-sm rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block p-4 pl-12 transition-all duration-200 outline-none"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Avatar URL</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Camera className="w-4 h-4 text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            name="avatar"
                                            value={formData.avatar}
                                            onChange={handleChange}
                                            className="w-full bg-gray-950/50 border border-gray-800 text-white text-sm rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block p-4 pl-12 transition-all duration-200 outline-none"
                                            placeholder="https://images.unsplash.com/..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-800/50">
                                <div className="flex items-center space-x-2 mb-6">
                                    <Key className="w-4 h-4 text-indigo-400" />
                                    <h3 className="text-white font-bold">Change Password</h3>
                                    <span className="text-[10px] text-gray-500 font-medium">(Leave blank to keep current)</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">New Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full bg-gray-950/50 border border-gray-800 text-white text-sm rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block p-4 transition-all duration-200 outline-none"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            name="confirm_password"
                                            value={formData.confirm_password}
                                            onChange={handleChange}
                                            className="w-full bg-gray-950/50 border border-gray-800 text-white text-sm rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block p-4 transition-all duration-200 outline-none"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-indigo-500/20 active:scale-95"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
