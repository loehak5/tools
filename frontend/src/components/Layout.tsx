import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import RestrictionModal from './common/RestrictionModal';

const Layout = () => {
    const [restriction, setRestriction] = useState<{ isOpen: boolean; feature: string }>({
        isOpen: false,
        feature: ''
    });

    useEffect(() => {
        const handleRestriction = (e: any) => {
            setRestriction({
                isOpen: true,
                feature: e.detail?.feature || 'unknown'
            });
        };

        window.addEventListener('ig:restriction', handleRestriction);
        return () => window.removeEventListener('ig:restriction', handleRestriction);
    }, []);

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden font-sans antialiased text-sm">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-grid-pattern relative">
                <div className="absolute inset-0 bg-gray-950/90 z-0"></div>
                <div className="relative z-10 p-8 w-full mx-auto min-h-full flex flex-col">
                    <div className="flex-grow">
                        <Outlet />
                    </div>
                    <footer className="mt-12 pt-8 border-t border-white/5 text-center text-gray-500 text-xs font-medium">
                        &copy; 2026 PT APPNESIA DIGITAL LABS. All rights reserved.
                    </footer>
                </div>
            </main>

            <RestrictionModal
                isOpen={restriction.isOpen}
                onClose={() => setRestriction({ ...restriction, isOpen: false })}
                feature={restriction.feature}
            />
        </div>

    );
};

export default Layout;
