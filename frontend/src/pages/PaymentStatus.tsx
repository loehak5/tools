import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const PaymentStatus: React.FC<{ type: 'success' | 'failed' }> = ({ type }) => {
    const navigate = useNavigate();

    useEffect(() => {
        if (type === 'success') {
            const timer = setTimeout(() => {
                navigate('/', { replace: true });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [type, navigate]);

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-white font-inter">
            <div className="max-w-md w-full bg-[#1e293b]/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl">
                {type === 'success' ? (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-emerald-500/20 rounded-full animate-pulse">
                                <CheckCircle className="w-16 h-16 text-emerald-500" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold mb-4 font-outfit">Pembayaran Berhasil!</h1>
                        <p className="text-slate-400 mb-8">
                            Paket langganan Anda telah diaktifkan secara otomatis. Anda akan dialihkan ke dashboard dalam beberapa detik.
                        </p>
                        <button
                            onClick={() => navigate('/', { replace: true })}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 py-4 rounded-xl font-bold hover:scale-[1.02] transition-all"
                        >
                            Menuju Dashboard <ArrowRight className="w-5 h-5" />
                        </button>
                    </>
                ) : (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-rose-500/20 rounded-full">
                                <XCircle className="w-16 h-16 text-rose-500" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold mb-4 font-outfit">Pembayaran Gagal</h1>
                        <p className="text-slate-400 mb-8">
                            Terjadi kendala saat memproses pembayaran Anda. Silakan coba lagi atau hubungi bantuan.
                        </p>
                        <button
                            onClick={() => window.location.href = 'https://instatools.web.id'}
                            className="w-full bg-slate-700 py-4 rounded-xl font-bold hover:bg-slate-600 transition-all mb-4"
                        >
                            Coba Lagi
                        </button>
                        <button
                            onClick={() => navigate('/', { replace: true })}
                            className="w-full text-slate-400 hover:text-white transition-all text-sm"
                        >
                            Kembali ke Halaman Login
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentStatus;
