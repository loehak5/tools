import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as any)?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        console.log('🔐 Login attempt started...', { username });

        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            console.log('📤 Sending login request...');
            const response = await api.post('/accounts/auth/login', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            console.log('✅ Login response received:', response.data);

            const token = response.data.access_token;
            console.log('🎫 Token received:', token?.substring(0, 20) + '...');

            console.log('👤 Calling login function...');
            await login(token);

            console.log('✅ Login successful! Navigating to:', from);
            navigate(from, { replace: true });
        } catch (err: any) {
            console.error('❌ Login error:', err);
            console.error('Error response:', err.response);
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            console.log('🏁 Login attempt finished');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] font-['Inter',_sans-serif] px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-10 animate-fade-in-down">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                        IG Tools
                    </h1>
                    <p className="text-slate-400 text-lg">Automation & Management Console</p>
                </div>

                <div className="bg-[#1e293b]/50 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl shadow-indigo-500/10 animate-fade-in-up">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-100 p-4 rounded-xl text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#0f172a]/50 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all placeholder:text-slate-600"
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#0f172a]/50 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all placeholder:text-slate-600"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
                        >
                            {loading ? (
                                <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-slate-500 text-sm italic">
                    Secure Access Gateway v1.0
                </p>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-fade-in-down { animation: fade-in-down 0.8s ease-out; }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out; }
                .animate-shake { animation: shake 0.2s linear infinite; animation-iteration-count: 2; }
            `}} />
        </div>
    );
};

export default Login;
