import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, X, ArrowRight, AlertCircle, UserPlus, Building2, Phone, Mail, CheckCircle2 } from 'lucide-react';

interface UserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserLoginModal: React.FC<UserLoginModalProps> = ({ isOpen, onClose }) => {
  const { loginUser, setActiveView, showToast } = useApp();
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // New User Registration states
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regIc, setRegIc] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regInstitution, setRegInstitution] = useState('KOLEJ KOMUNITI BEAUFORT');

  // Overwrite confirmation modal state
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  if (!isOpen) return null;

  // Auto-format IC input to 000000-00-0000
  const handleRegIcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 12); // strip non-digits, max 12

    let formatted = rawVal;
    if (rawVal.length > 6 && rawVal.length <= 8) {
      formatted = `${rawVal.slice(0, 6)}-${rawVal.slice(6)}`;
    } else if (rawVal.length > 8) {
      formatted = `${rawVal.slice(0, 6)}-${rawVal.slice(6, 8)}-${rawVal.slice(8, 12)}`;
    }

    setRegIc(formatted);
  };

  // Auto-format phone input to 000-00000000 (e.g. 012-3456789 or 011-12345678)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 11); // max 11 digits

    let formatted = rawVal;
    if (rawVal.length > 3) {
      formatted = `${rawVal.slice(0, 3)}-${rawVal.slice(3)}`;
    }

    setRegPhone(formatted);
  };

  const handleLookupOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Sila masukkan alamat emel yang sah (contoh: pengguna@test.com).');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const res = await fetch('/api/auth/user-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Gagal log masuk');
      }

      if (data.exists && data.user) {
        // Existing user found -> directly show user dashboard
        loginUser(data.user);
        setActiveView('user_dashboard');
        handleClose();
      } else {
        // Email not found -> prompt user registration
        setRegEmail(cleanEmail);
        setIsRegistering(true);
        setError('');
      }
    } catch (err: any) {
      setError(err.message || 'Ralat semasa memproses log masuk');
    } finally {
      setIsLoading(false);
    }
  };

  const performRegister = async (overwrite: boolean = false) => {
    const digits = regIc.replace(/\D/g, '');
    const cleanIc = digits.length === 12 
      ? `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`
      : regIc.trim();
    const cleanName = regName.trim().toUpperCase();
    const phoneDigits = regPhone.replace(/\D/g, '');

    if (digits.length !== 12) {
      setError('Sila masukkan 12 digit No. Kad Pengenalan yang sah.');
      return;
    }
    if (!cleanName) {
      setError('Sila masukkan Nama Penuh anda.');
      return;
    }
    if (!regPhone.trim() || phoneDigits.length < 9 || phoneDigits.length > 11) {
      setError('Sila masukkan No. Telefon yang sah mengikut format 000-00000000 (contoh: 012-3456789 atau 011-12345678).');
      return;
    }
    if (!regEmail.trim()) {
      setError('Sila masukkan Emel Rasmi anda.');
      return;
    }
    if (!regInstitution.trim()) {
      setError('Sila masukkan Institusi / Kolej Komuniti / Politeknik anda.');
      return;
    }

    const cleanPhone = phoneDigits.length > 3 ? `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3)}` : regPhone.trim();

    try {
      setIsLoading(true);
      setError('');

      const res = await fetch('/api/auth/register-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icNumber: cleanIc,
          name: cleanName,
          phone: cleanPhone,
          email: regEmail.trim(),
          institution: regInstitution.trim() || 'Kolej Komuniti Beaufort',
          department: '',
          overwrite,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.error === 'DUPLICATE_IC') {
          setShowOverwriteConfirm(true);
          return;
        }
        throw new Error(data.error || 'Gagal mendaftar pengguna');
      }

      loginUser(data.user);
      setActiveView('user_dashboard');
      showToast(`Pendaftaran berjaya! Selamat datang, ${data.user.name}.`, 'success');
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Ralat semasa pendaftaran pengguna');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performRegister(false);
  };

  const handleConfirmOverwrite = async () => {
    setShowOverwriteConfirm(false);
    await performRegister(true);
  };

  const handleClose = () => {
    setIsRegistering(false);
    setEmailInput('');
    setRegIc('');
    setRegName('');
    setRegPhone('');
    setRegEmail('');
    setRegInstitution('KOLEJ KOMUNITI BEAUFORT');
    setError('');
    setShowOverwriteConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400">
              {isRegistering ? <UserPlus className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {isRegistering ? 'Pendaftaran Pengguna Baharu' : 'Log Masuk Pemohon'}
              </h3>
              <p className="text-xs text-slate-400">
                {isRegistering ? 'Lengkapkan profil pemohon untuk pendaftaran' : 'Portal Pegawai, Pensyarah & Penyelidik'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {!isRegistering ? (
          /* Step 1: Check Email */
          <form onSubmit={handleLookupOrLogin} noValidate className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Emel <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-login-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => { setError(''); setEmailInput(e.target.value); }}
                  placeholder="Contoh: nama@test.com"
                  autoFocus
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-all text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Masukkan alamat emel anda untuk menyemak rekod atau mendaftar akaun pemohon baharu.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end">
              <button
                id="btn-submit-user-login"
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
              >
                <span>{isLoading ? 'Menyemak Rekod...' : 'Semak & Log Masuk'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: User Registration Form */
          <form onSubmit={handleRegisterSubmit} noValidate className="p-6 space-y-3.5">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>
                Emel <strong>{emailInput}</strong> belum wujud dalam sistem. Sila lengkapkan maklumat pendaftaran pengguna baharu di bawah.
              </span>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Penuh &amp; Gelaran <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-reg-name"
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value.toUpperCase())}
                placeholder="CONTOH: DR. AHMAD FAUZI BIN ISMAIL"
                required
                autoFocus
                className="w-full text-xs uppercase px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Nama akan disimpan secara automatik dalam huruf besar.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                No. Kad Pengenalan (MyKad) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-reg-ic"
                  type="text"
                  value={regIc}
                  onChange={handleRegIcChange}
                  placeholder="Contoh: 880512-10-5431"
                  maxLength={14}
                  className="w-full text-xs font-mono tracking-wider px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900"
                />
                <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-mono">
                  {regIc.replace(/\D/g, '').length}/12
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  No. Telefon <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={handlePhoneChange}
                  placeholder="012-3456789"
                  maxLength={12}
                  className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Format: 000-00000000</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emel Rasmi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="nama@politeknik.edu.my"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institusi / Kolej Komuniti / Politeknik <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={regInstitution}
                onChange={(e) => setRegInstitution(e.target.value.toUpperCase())}
                placeholder="CONTOH: KOLEJ KOMUNITI BEAUFORT"
                className="w-full text-xs uppercase px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900"
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
              >
                « Kembali
              </button>

              <button
                id="btn-submit-register-user"
                type="submit"
                disabled={isLoading}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
              >
                <span>{isLoading ? 'Mendaftar...' : 'Daftar Pengguna & Masuk'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Overwrite Confirmation Dialog */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-base">Sahkan Kemaskini Emel</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              No Kad Pengenalan anda telah wujud, adakah anda pasti untuk mengemaskini emel baharu anda?
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOverwriteConfirm(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmOverwrite}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 transition-all"
              >
                YA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
