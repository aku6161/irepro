import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, 
  FileText, 
  User, 
  ShieldCheck, 
  LogOut, 
  PlusCircle, 
  Menu, 
  X,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  onOpenUserLogin: () => void;
  onOpenAdminLogin: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUserLogin,
  onOpenAdminLogin,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const {
    currentUser,
    userRole,
    isAdmin,
    logout,
    setActiveView,
    activeView,
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Branding & Logo */}
          <div className="flex items-center space-x-3">
            {userRole && (
              <button
                id="btn-toggle-sidebar"
                onClick={onToggleSidebar}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-none"
                aria-label="Toggle Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <button
              id="btn-nav-home"
              onClick={() => setActiveView(userRole ? (isAdmin ? 'admin_dashboard' : 'user_dashboard') : 'landing')}
              className="flex items-center space-x-3 text-left group focus:outline-none"
            >
              {/* Logo Emblem */}
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-red-950/40 flex items-center justify-center shrink-0">
                <img
                  src="/app-logo.png"
                  alt="iREPRO POLYCC"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg tracking-tight text-white group-hover:text-red-400 transition-colors">
                    iREPRO
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-red-950/80 text-red-300 px-2 py-0.5 rounded border border-red-800/60 font-mono">
                    POLYCC
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-xs md:max-w-md font-normal">
                  Innovation &amp; Research Proposal
                </p>
              </div>
            </button>
          </div>

          {/* Right Action: Auth / User Session */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {userRole && (
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Active Role Pill */}
                <div className="hidden sm:flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs">
                  {isAdmin ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-red-400" />
                      <div>
                        <span className="font-semibold text-red-300">Pentadbir (KUPIK)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 text-red-400" />
                      <div className="max-w-[150px] lg:max-w-[200px] truncate text-left">
                        <span className="font-semibold text-slate-200 truncate block">
                          {currentUser?.name || currentUser?.icNumber}
                        </span>
                        <p className="text-[10px] text-slate-400 truncate">
                          {currentUser?.institution || 'Pemohon'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  id="btn-logout"
                  onClick={logout}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/50 border border-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-all"
                  title="Log Keluar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Keluar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
