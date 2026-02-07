import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';

interface User {
    id: number;
    username: string;
    full_name: string | null;
    role: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        console.log('👤 Fetching user info...');
        try {
            const response = await api.get('/accounts/auth/me');
            console.log('✅ User info received:', response.data);
            setUser(response.data);
        } catch (error) {
            console.error('❌ Failed to fetch user:', error);
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        console.log('🔍 Checking for existing token:', token ? 'Found' : 'Not found');
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (token: string) => {
        console.log('💾 Saving token to localStorage...');
        localStorage.setItem('token', token);
        console.log('📞 Fetching user info after login...');
        await fetchUser();
        console.log('✅ Login completed in AuthContext');
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
