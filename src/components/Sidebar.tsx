import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  HelpCircle,
  MessageSquare,
  PlusCircle,
  FolderKanban,
  X,
  ExternalLink,
  ShieldCheck,
  User
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUserLogin?: () => void;
  onOpenAdminLogin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { activeView, setActiveView, isAdmin, userRole } = useApp();

  const handleNav = (view: string) => {
    setActiveView(view);
    onClose();
  };

  const navItemClass = (viewName: string) => {
    const isActive = activeView === viewName;
    return `w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-red-600 text-white shadow-md shadow-red-900/30'
        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
    }`;
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header Close */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 lg:hidden">
          <div className="flex items-center space-x-2.5">
            <img src="/app-logo.png" alt="iREPRO" className="w-7 h-7 object-contain rounded-lg shrink-0" />
            <span className="font-bold text-sm text-white">iREPRO POLYCC</span>
          </div>
          <button
            id="btn-close-sidebar"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {isAdmin ? (
            /* ADMIN MENU: strictly as requested */
            <div className="space-y-1.5">
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>PENTADBIR (KUPIK)</span>
              </div>
              
              <button
                id="sidebar-link-admin-dash"
                onClick={() => handleNav('admin_dashboard')}
                className={navItemClass('admin_dashboard')}
              >
                <LayoutDashboard className="w-4 h-4 text-red-400" />
                <span>Dashboard Admin</span>
              </button>
            </div>
          ) : (
            /* USER / PEMOHON MENU */
            <div className="space-y-1.5">
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                MENU UTAMA
              </div>

              <button
                id="sidebar-link-user-dash"
                onClick={() => handleNav(userRole ? 'user_dashboard' : 'landing')}
                className={navItemClass(userRole ? 'user_dashboard' : 'landing')}
              >
                <LayoutDashboard className="w-4 h-4 text-red-400" />
                <span>{userRole ? 'Dashboard Pemohon' : 'Laman Utama'}</span>
              </button>

              <button
                id="sidebar-link-new-app"
                onClick={() => handleNav('new_application')}
                className={navItemClass('new_application')}
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Permohonan Baharu</span>
              </button>
            </div>
          )}

          {/* SECTION: BANTUAN */}
          <div className="pt-4 border-t border-slate-800 space-y-1.5">
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              BANTUAN
            </div>
            
            <button
              id="sidebar-link-panduan"
              onClick={() => handleNav('panduan')}
              className={navItemClass('panduan')}
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Panduan Sistem</span>
            </button>

            <button
              id="sidebar-link-hubungi"
              onClick={() => handleNav('hubungi')}
              className={navItemClass('hubungi')}
            >
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span>Hubungi Kami</span>
            </button>
          </div>
        </div>

        {/* Footer: Repositori POLYCC & Google Drive */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="font-semibold text-slate-300 mb-1 flex items-center justify-between">
            <span>Storan Berpusat POLYCC</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Google Integration Ready" />
          </div>
          <div className="space-y-1">
            <a
              href="https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-slate-400 hover:text-red-400 transition-colors text-[10px]"
            >
              <span>Google Drive Folder</span>
              <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};
