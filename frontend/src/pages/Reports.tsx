import { useEffect, useState } from 'react';
import { BarChart3, Clock, CheckCircle2, Search, RefreshCw, ShieldCheck, ChevronRight, FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';

const Reports = () => {
    const [batches, setBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifyingId, setVerifyingId] = useState<number | null>(null);
    const [selectedBatch, setSelectedBatch] = useState<any | null>(null);

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reporting/batches');
            setBatches(res.data);
        } catch (err) {
            console.error("Failed to fetch batches", err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (batchId: number) => {
        setVerifyingId(batchId);
        try {
            await api.post(`/reporting/batches/${batchId}/verify`);
            alert("Verification completed! Checker account has cross-referenced the results on Instagram.");
            // Refresh batch data
            const batchRes = await api.get(`/reporting/batches/${batchId}`);
            setBatches(prev => prev.map(b => b.id === batchId ? batchRes.data : b));
        } catch (err: any) {
            console.error("Verification failed", err);
            alert(`Verification failed: ${err.response?.data?.detail || err.message}`);
        } finally {
            setVerifyingId(null);
        }
    };

    const handleDelete = async (batchId: number) => {
        if (!window.confirm("Are you sure you want to delete this report? The execution history will remain in monitoring but will be removed from reports.")) {
            return;
        }

        try {
            await api.delete(`/reporting/batches/${batchId}`);
            setBatches(prev => prev.filter(b => b.id !== batchId));
            if (selectedBatch?.id === batchId) {
                setSelectedBatch(null);
            }
        } catch (err: any) {
            console.error("Failed to delete report", err);
            alert(`Failed to delete report: ${err.response?.data?.detail || err.message}`);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Execution Reports</h1>
                <p className="text-gray-400 mt-1">Detailed breakdown of bulk actions and Instagram verification results.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Reports List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
                            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                            <p className="text-gray-500">Loading reports...</p>
                        </div>
                    ) : batches.length === 0 ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
                            <FileText className="w-8 h-8 text-gray-700" />
                            <p className="text-gray-500">No reports generated yet. Run some automation to see results.</p>
                        </div>
                    ) : batches.map((batch) => (
                        <motion.div
                            key={batch.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => setSelectedBatch(batch)}
                            className={`p-5 rounded-2xl border transition-all cursor-pointer group ${selectedBatch?.id === batch.id
                                ? 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-600/5'
                                : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className={`p-3 rounded-xl ${batch.task_type === 'follow' ? 'bg-blue-500/10 text-blue-400' :
                                        batch.task_type === 'like' ? 'bg-red-500/10 text-red-400' :
                                            'bg-purple-500/10 text-purple-400'
                                        }`}>
                                        <BarChart3 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold flex items-center gap-2 capitalize">
                                            Bulk {batch.task_type} Action
                                            {batch.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                                        </h3>
                                        <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(batch.created_at).toLocaleString()}</span>
                                            <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400">ID: #{batch.id}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(batch.id); }}
                                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                        title="Delete Report"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronRight className={`w-5 h-5 transition-transform ${selectedBatch?.id === batch.id ? 'text-indigo-500 rotate-90' : 'text-gray-600 group-hover:text-gray-400'}`} />
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between">
                                <div className="flex items-center space-x-6">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total</span>
                                        <span className="text-lg font-bold text-white">{batch.total_count}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider text-green-500/70">Success</span>
                                        <span className="text-lg font-bold text-green-400">{batch.success_count}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider text-red-500/70">Failed</span>
                                        <span className="text-lg font-bold text-red-400">{batch.failed_count}</span>
                                    </div>
                                </div>

                                {batch.status === 'completed' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleVerify(batch.id); }}
                                        disabled={verifyingId === batch.id}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 disabled:opacity-50"
                                    >
                                        {verifyingId === batch.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                        <span>{verifyingId === batch.id ? 'Verifying...' : 'Verify on IG'}</span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Right Panel: Selected Report Details */}
                <div className="space-y-6">
                    <AnimatePresence mode="wait">
                        {selectedBatch ? (
                            <motion.div
                                key={selectedBatch.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sticky top-6"
                            >
                                <h2 className="text-xl font-bold text-white mb-6">Report Summary</h2>

                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-800/30 rounded-2xl border border-gray-800 flex justify-between">
                                        <span className="text-gray-400 text-sm">Execution Duration</span>
                                        <span className="text-white text-sm font-medium">
                                            {selectedBatch.started_at && selectedBatch.completed_at
                                                ? `${Math.round((new Date(selectedBatch.completed_at).getTime() - new Date(selectedBatch.started_at).getTime()) / 60000)} minutes`
                                                : 'N/A'}
                                        </span>
                                    </div>

                                    <div className="p-4 bg-gray-800/30 rounded-2xl border border-gray-800">
                                        <span className="text-gray-400 text-xs block mb-3 uppercase font-bold tracking-widest">Performance</span>
                                        <div className="flex items-center space-x-2 h-3 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 transition-all duration-1000"
                                                style={{ width: `${(selectedBatch.success_count / selectedBatch.total_count) * 100}%` }}
                                            />
                                            <div
                                                className="h-full bg-red-500 transition-all duration-1000"
                                                style={{ width: `${(selectedBatch.failed_count / selectedBatch.total_count) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-wider">
                                            <span className="text-green-400">{Math.round((selectedBatch.success_count / selectedBatch.total_count) * 100) || 0}% Success</span>
                                            <span className="text-red-400">{Math.round((selectedBatch.failed_count / selectedBatch.total_count) * 100) || 0}% Failed</span>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                            <ShieldCheck className="w-4 h-4" />
                                            <span className="text-sm font-bold">IG Verification Record</span>
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            Data comparison against actual Instagram profiles via Checker Account.
                                            Ensures the database status matches the real world.
                                        </p>
                                    </div>
                                </div>

                                <button className="w-full mt-8 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 rounded-2xl transition-all border border-gray-700">
                                    Export PDF Report
                                </button>
                            </motion.div>
                        ) : (
                            <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-3xl p-12 text-center">
                                <Search className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-600 text-sm italic">Select a report from the list to view detailed analytical data and performance metrics.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Reports;
