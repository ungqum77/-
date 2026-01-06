import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, Settings, FileText, Home } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? "text-primary bg-primary-light font-semibold" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100";
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg text-white">
              <Package size={20} strokeWidth={3} />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">InvoiceConverter</span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/" className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${isActive('/')}`}>
              <Home size={18} /> 홈
            </Link>
            <Link to="/products" className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${isActive('/products')}`}>
              <Settings size={18} /> 제품 관리
            </Link>
            <Link to="/convert" className={`px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${isActive('/convert')}`}>
              <FileText size={18} /> 송장 변환
            </Link>
          </div>

          <div className="flex items-center gap-4">
             <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
               JS
             </div>
          </div>
        </div>
      </div>
    </nav>
  );
};