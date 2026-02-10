import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [centralUser, setCentralUser] = useState<string | null>(null);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Determine Central Server URL
    const CENTRAL_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8001'
        : 'https://instatools.web.id';

    const from = (location.state as any)?.from?.pathname || '/';

    const checkSubscriptionAndNavigate = async (user: any) => {
        try {
            const statsRes = await api.get('/dashboard/stats');
            const subStatus = statsRes.data?.subscription?.status;

            if (subStatus !== 'active' && user?.role !== 'admin') {
                console.log('⚠️ No active subscription found. Redirecting to Central Server...');
                window.location.href = 'https://instatools.web.id';
                return;
            }

            if (user?.role === 'admin') {
                navigate('/admin', { replace: true });
            } else {
                navigate(from, { replace: true });
            }
        } catch (err) {
            console.error('Error checking subscription during login:', err);
            // Default to normal navigation if check fails to avoid blocking the user
            if (user?.role === 'admin') {
                navigate('/admin', { replace: true });
            } else {
                navigate(from, { replace: true });
            }
        }
    };

    const handleGoogleLogin = async (response: any) => {
        try {
            console.log("Google Login Response:", response);
            setLoading(true);
            const res = await api.post('/accounts/auth/google', {
                token: response.credential
            });
            const token = res.data.access_token;
            const userData = await login(token);
            await checkSubscriptionAndNavigate(userData);
        } catch (err: any) {
            console.error("Google Login Error:", err);
            setError(err.response?.data?.detail || 'Google Login failed.');
            setLoading(false);
        }
    };

    useEffect(() => {
        const checkCentralSession = async () => {
            try {
                // Check if user is logged in at the Central Server
                const res = await fetch(`${CENTRAL_URL}/api/auth.php?action=check`, {
                    credentials: 'include'
                });
                const data = await res.json();
                if (data.status === 'success' && data.logged_in) {
                    console.log('🔗 Found active Central Server session for:', data.username);
                    setCentralUser(data.username);
                }
            } catch (e) {
                // Silent fail if Central not reachable
                console.log('ℹ️ Central Server session check skipped.');
            }
        };
        checkCentralSession();

        // Load Google Script
        const script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = () => {
            (window as any).google?.accounts.id.initialize({
                client_id: "826952988399-b1tqd1vc3v7miel3sjqmojmgsbetc17a.apps.googleusercontent.com",
                callback: handleGoogleLogin
            });
            (window as any).google?.accounts.id.renderButton(
                document.getElementById("google-btn"),
                { theme: "filled_blue", size: "large", width: "100%", text: "signin_with" }
            );
        };
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        }
    }, []);

    const handleSync = async () => {
        setError('');
        setLoading(true);
        try {
            console.log('🔄 Syncing session with Central Server...');
            // 1. Get temporary sync token from Central
            const resSync = await fetch(`${CENTRAL_URL}/api/auth.php?action=sync`, {
                credentials: 'include'
            });
            const dataSync = await resSync.json();

            if (dataSync.status === 'success') {
                // 2. Exchange Central token for Local JWT
                const resLocal = await api.post('/accounts/auth/sync', { token: dataSync.token });
                const token = resLocal.data.access_token;
                const userData = await login(token);
                console.log('✅ Sync successful! Logging in...');

                await checkSubscriptionAndNavigate(userData);
            } else {
                throw new Error(dataSync.message || 'Sync failed');
            }
        } catch (err: any) {
            console.error('❌ Sync failed:', err);
            setError('Could not sync with Central Server. Please login manually.');
            setCentralUser(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCentralRedirect = () => {
        window.location.href = `${CENTRAL_URL}/api/auth.php?action=redirect_sso`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await api.post('/accounts/auth/login', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            const token = response.data.access_token;
            const userData = await login(token);

            await checkSubscriptionAndNavigate(userData);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] font-['Inter',_sans-serif] px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                        IG Tools
                    </h1>
                    <p className="text-slate-400 text-lg">Automation & Management Console</p>
                </div>

                <div className="bg-[#1e293b]/50 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl shadow-indigo-500/10">
                    {centralUser ? (
                        <div className="mb-8 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-center">
                            <p className="text-slate-300 text-sm mb-3">
                                Welcome back! We found your session as <span className="text-indigo-400 font-bold">@{centralUser}</span>
                            </p>
                            <button
                                onClick={handleSync}
                                disabled={loading}
                                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center text-sm"
                            >
                                {loading ? 'Syncing...' : 'Sync & Login Automatically'}
                            </button>
                            <div className="mt-3">
                                <button
                                    onClick={() => setCentralUser(null)}
                                    className="text-xs text-slate-500 hover:text-slate-400 underline"
                                >
                                    Or login with another account
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <button
                                onClick={handleCentralRedirect}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 rounded-2xl border border-slate-700 transition-all flex items-center justify-center space-x-3 mb-2"
                            >
                                <div className="w-6 h-6 bg-indigo-500 rounded-lg flex items-center justify-center text-[10px] font-bold">IT</div>
                                <span>Login via Central Server</span>
                            </button>

                            <div className="relative flex items-center justify-center my-6">
                                <div className="border-t border-slate-800 w-full"></div>
                                <span className="bg-[#1e293b] px-3 text-slate-500 text-xs">OR MANUAL LOGIN</span>
                                <div className="border-t border-slate-800 w-full"></div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/50 text-red-100 p-4 rounded-xl text-sm animate-shake text-center">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-[#0f172a]/50 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
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
                                        className="w-full bg-[#0f172a]/50 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center text-lg"
                                >
                                    {loading ? 'Processing...' : 'Sign In'}
                                </button>

                                <div className="relative flex items-center justify-center my-4">
                                    <div className="border-t border-slate-700 w-full"></div>
                                    <span className="bg-[#0f172a] px-3 text-slate-500 text-sm">OR</span>
                                    <div className="border-t border-slate-700 w-full"></div>
                                </div>

                                <div id="google-btn" className="w-full flex justify-center"></div>
                            </form>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex items-center justify-center space-x-4">
                    <div className="h-[1px] bg-slate-800 flex-grow"></div>
                    <span className="text-slate-600 text-xs uppercase tracking-widest font-bold">Secure Access</span>
                    <div className="h-[1px] bg-slate-800 flex-grow"></div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.2s linear infinite; animation-iteration-count: 2; }
            `}} />
        </div>
    );
};

export default Login;
