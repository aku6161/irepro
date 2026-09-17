import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, X, ArrowRight, Lock, AlertCircle, KeyRound } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const { loginAdmin } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Sila masukkan kata laluan pentadbir.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        if (!res.ok) {
          throw new Error(text || `Ralat pelayan (${res.status}). Sila cuba sebentar lagi.`);
        }
      }

      if (!res.ok) {
        throw new Error(data.error || `Kata laluan tidak sah (${res.status})`);
      }

      loginAdmin();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Kata laluan pentadbir salah.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Log Masuk Pentadbir (KUPIK)</h3>
              <p className="text-xs text-red-400/80">Portal Pengurusan KUPIK</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleAdminLogin} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kata Laluan Pentadbir <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="input-admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata laluan pentadbir"
                required
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-all text-slate-900 pr-10"
              />
              <div className="absolute right-3.5 top-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Akses ini khusus untuk Ketua Unit Penyelidikan, Inovasi &amp; Komersialan (KUPIK).
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Batal
            </button>
            <button
              id="btn-submit-admin-login"
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-red-400 border border-red-500/30 text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Mengesahkan...' : 'Masuk Admin'}</span>
              <ArrowRight className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
