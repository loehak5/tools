import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';

const SSORedirect = () => {
    const [searchParams] = useSearchParams();
    const returnTo = searchParams.get('return_to');
    const tokenFromUrl = searchParams.get('token');

    useEffect(() => {
        const performHandshake = async () => {
            try {
                let ssoToken = tokenFromUrl;

                if (!ssoToken) {
                    console.log('🔄 SSO: Attempting to fetch token from Central Server...');
                    // 1. Fetch short-lived SSO token from backend (silent handshake)
                    const res = await api.get('accounts/auth/sso-token');
                    ssoToken = res.data.sso_token;

                    if (returnTo && ssoToken) {
                        console.log('✅ SSO: Token received, redirecting back to Central Server...');
                        const separator = returnTo.includes('?') ? '&' : '?';
                        window.location.href = `${returnTo}${separator}token=${encodeURIComponent(ssoToken)}`;
                        return;
                    }
                }

                if (ssoToken) {
                    console.log('🔄 SSO: Syncing session with Local Backend...');
                    // 3. Exchange SSO Token for Local JWT
                    const resLocal = await api.post('/accounts/auth/sync', { token: ssoToken });
                    const accessToken = resLocal.data.access_token;

                    // Save token and reload
                    localStorage.setItem('token', accessToken);
                    console.log('✅ SSO: Sync successful! Redirecting to Dashboard...');
                    window.location.href = '/';
                } else {
                    console.warn('⚠️ SSO: No token or return_to param found.');
                    window.location.href = '/login';
                }
            } catch (err: any) {
                console.error('❌ SSO Handshake failed', err);
                const errorMessage = err.response?.data?.detail || err.message || 'Unknown error';

                // If handshake fails, return user back to the Central Server login page 
                if (returnTo) {
                    try {
                        const url = new URL(returnTo);
                        const centralOrigin = url.origin;

                        // If it's a standard auth failure, keep it clean
                        if (errorMessage.includes('authenticated') || errorMessage.includes('401')) {
                            window.location.href = centralOrigin;
                        } else {
                            window.location.href = `${centralOrigin}/?error=sso_failed&msg=${encodeURIComponent(errorMessage)}`;
                        }
                    } catch (e) {
                        window.location.href = '/login';
                    }
                } else {
                    window.location.href = '/login';
                }
            }
        };

        performHandshake();
    }, [returnTo, tokenFromUrl]);

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
            <div className="text-center p-8 bg-slate-800/50 rounded-3xl border border-slate-700 backdrop-blur-xl max-w-sm w-full">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <h2 className="text-xl font-semibold text-white mb-2">SSO Handshake</h2>
                <p className="text-slate-400">Authenticating with Central Server...</p>
                <div className="mt-8 text-xs text-slate-500 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                    {returnTo}
                </div>
            </div>
        </div>
    );
};

export default SSORedirect;
