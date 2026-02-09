import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Rocket, CheckCircle2, X } from 'lucide-react';

interface RestrictionModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature: string;
}

const RestrictionModal: React.FC<RestrictionModalProps> = ({ isOpen, onClose, feature }) => {
    const featureLabels: Record<string, string> = {
        'post': 'Posting Image',
        'reels': 'Reels Automation',
        'story': 'Story Tools',
        'like': 'Auto Like',
        'follow': 'Growth Follow',
        'view': 'Story Viewer',
        'cross_posting': 'Cross Posting',
        'cross_threads': 'Threads Sync'
    };

    const label = featureLabels[feature] || feature;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-gray-900 border border-indigo-500/30 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/10"
                    >
                        {/* Header Gradient */}
                        <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center relative">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
                                <ShieldAlert size={40} className="text-white" />
                            </div>
                        </div>

                        <div className="p-8 text-center">
                            <h3 className="text-2xl font-bold text-white mb-2">Feature Restricted</h3>
                            <p className="text-gray-400 mb-6">
                                Fitur <span className="text-indigo-400 font-semibold">{label}</span> tidak tersedia di paket Anda saat ini.
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3 text-left p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                    <Rocket className="text-indigo-400 shrink-0" size={20} />
                                    <div>
                                        <p className="text-sm font-semibold text-white">Upgrade to Pro</p>
                                        <p className="text-xs text-gray-400">Dapatkan akses penuh ke semua fitur premium.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 rounded-2xl border border-gray-800 text-gray-400 font-semibold hover:bg-gray-800 transition-colors"
                                >
                                    Nanti Saja
                                </button>
                                <a
                                    href="http://instatools.web.id/billing"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
                                >
                                    Upgrade <Rocket size={18} />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default RestrictionModal;
