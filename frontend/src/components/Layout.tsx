import React from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden font-sans antialiased text-sm">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-grid-pattern relative">
                <div className="absolute inset-0 bg-gray-950/90 z-0"></div>
                <div className="relative z-10 p-8 w-full mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
        ss

    );
};

export default Layout;
