import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Settings, Activity, BarChart3, FileText, LogOut, User, Shield, LifeBuoy, CreditCard, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const Sidebar = () => {
    const { logout, user } = useAuth();
    const [isInactive, setIsInactive] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                setIsInactive(res.data.subscription.status !== 'active');
            } catch (err) {
                console.error("Failed to fetch sub status in sidebar", err);
            }
        };
        if (user) checkStatus();
    }, [user]);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Users, label: 'Accounts', path: '/accounts' },
        { icon: Calendar, label: 'Scheduler', path: '/scheduler' },
        { icon: Activity, label: 'Automation', path: '/automation' },
        { icon: BarChart3, label: 'Monitoring', path: '/monitoring' },
        { icon: FileText, label: 'Reports', path: '/reports' },
        { icon: Settings, label: 'Proxy Settings', path: '/settings' },
    ];

    if (user?.role === 'admin') {
        navItems.splice(1, 0, { icon: Shield, label: 'Admin Panel', path: '/admin' });
    } else {
        navItems.push({ icon: LifeBuoy, label: 'Tiket Pengaduan', path: '/tickets' });
    }

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
            <div className="p-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                    IG Master
                </h1>
                <p className="text-gray-500 text-xs mt-1">Enterprise Automation</p>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    // Lock everything except Dashboard and Tickets if inactive
                    const isLocked = isInactive && item.path !== '/' && item.path !== '/tickets';

                    if (isLocked) {
                        return (
                            <div key={item.path} className="flex items-center justify-between px-4 py-3 rounded-xl text-gray-600 cursor-not-allowed opacity-50">
                                <div className="flex items-center space-x-3">
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </div>
                                <Lock className="w-3 h-3" />
                            </div>
                        );
                    }

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                clsx(
                                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-indigo-600/10 text-indigo-400 font-medium"
                                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                )
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}

                {/* Always active Billing link to Central Server */}
                <a
                    href="http://instatools.web.id/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200"
                >
                    <CreditCard className="w-5 h-5" />
                    <span>Billing & Topup</span>
                </a>
            </nav>

            <div className="p-4 border-t border-gray-800 space-y-4">
                {/* User Profile Section */}
                {user && (
                    <div className="flex items-center space-x-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                            <User className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-200 truncate">{user.full_name || user.username}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{user.role}</p>
                        </div>
                    </div>
                )}

                <button
                    onClick={logout}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                </button>

                <div className="p-3 rounded-xl bg-gray-800/30 border border-gray-700/50">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">System Status</p>
                    <div className="flex items-center space-x-2">
                        <span className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", isInactive ? "bg-red-500" : "bg-green-500")}></span>
                        <span className="text-[11px] text-gray-400">{isInactive ? "Subscription Expired" : "All Systems Operational"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
