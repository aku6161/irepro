import React, { useState, useEffect } from 'react';
import { useApp, formatUserProfileId } from '../context/AppContext';
import { User, IdCard, Phone, Building2, Save, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { supabaseClient } from '../utils/supabaseClient';

export const UserProfileView: React.FC = () => {
  const { currentUser, updateCurrentUserProfile, showToast } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [institution, setInstitution] = useState(currentUser?.institution || '');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Clear any residual error when component mounts or error matches legacy string
    if (error.includes('Pengguna tidak ditemui')) {
      setError('');
    }
  }, [error]);

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-[400px]">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>Sila log masuk terlebih dahulu untuk mengakses halaman profil.</span>
        </div>
      </div>
    );
  }

  // Auto-format phone input to 000-00000000
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccess('');
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 11); // max 11 digits

    let formatted = rawVal;
    if (rawVal.length > 3) {
      formatted = `${rawVal.slice(0, 3)}-${rawVal.slice(3)}`;
    }

    setPhone(formatted);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanName = name.trim().toUpperCase();
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanInstitution = institution.trim().toUpperCase();

    // Validation
    if (!cleanName) {
      setError('Sila masukkan Nama Penuh anda.');
      return;
    }
    if (!phone.trim() || cleanPhone.length < 9 || cleanPhone.length > 11) {
      setError('Sila masukkan No. Telefon yang sah mengikut format 000-00000000 (contoh: 012-3456789).');
      return;
    }
    if (!cleanInstitution) {
      setError('Sila masukkan nama Institusi.');
      return;
    }

    const formattedPhone = cleanPhone.length > 3 ? `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3)}` : phone.trim();

    try {
      setIsSaving(true);
      
      const rawIc = String(currentUser.icNumber || currentUser.id || '').trim();
      const digits = rawIc.replace(/\D/g, '');
      const cleanIc = digits.length === 12
        ? `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`
        : rawIc;

      const updatedUserPayload = {
        id: currentUser.id,
        icNumber: cleanIc,
        name: cleanName,
        phone: formattedPhone,
        institution: cleanInstitution,
        email: currentUser.email || '',
        department: currentUser.department || '',
      };

      // 1. Direct update to Supabase database from client SDK
      try {
        await supabaseClient
          .from('users')
          .upsert(updatedUserPayload, { onConflict: 'icNumber' });
      } catch (supaErr) {
        console.warn('[Supabase Client Sync Warning]:', supaErr);
      }

      // 2. Sync to API backend endpoint
      try {
        await fetch('/api/auth/update-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUserPayload),
        });
      } catch (apiErr) {
        console.warn('[API Endpoint Sync Warning]:', apiErr);
      }

      // 3. Update React active user state context
      updateCurrentUserProfile({
        ...currentUser,
        name: cleanName,
        phone: formattedPhone,
        institution: cleanInstitution,
      });

      setError('');
      setSuccess('Profil pengguna berjaya dikemaskini!');
      showToast('Profil pengguna berjaya dikemaskini!', 'success');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError('Gagal mengemaskini profil. Sila cuba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Page Title Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <User className="w-4 h-4" />
          </div>
          <span>Profil Saya</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Kemaskini profil dan maklumat institusi anda bagi tujuan permohonan inovasi &amp; penyelidikan.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Decorative banner header */}
        <div className="h-2.5 bg-gradient-to-r from-red-600 to-rose-500" />
        
        <form onSubmit={handleUpdateProfile} noValidate className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2.5 text-emerald-700 text-xs font-semibold">
              <span className="shrink-0">✓</span>
              <span>{success}</span>
            </div>
          )}

          {/* Section: Read-only Identity Fields */}
          <div className="bg-slate-50 rounded-xl p-4.5 border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                ID Pengguna (Sistem)
              </label>
              <div className="flex items-center space-x-2 text-slate-700 font-mono text-xs select-all bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-inner">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{formatUserProfileId(currentUser).id}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                No. Kad Pengenalan (MyKad)
              </label>
              <div className="flex items-center space-x-2 text-slate-700 font-mono text-xs select-all bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-inner">
                <IdCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{currentUser.icNumber}</span>
              </div>
            </div>
          </div>

          {/* Section: Editable Info Fields */}
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Penuh &amp; Gelaran <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setError(''); setSuccess(''); setName(e.target.value.toUpperCase()); }}
                  placeholder="CONTOH: TS. DR. AHMAD BIN FAUZI"
                  className="w-full text-xs uppercase px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white text-slate-900 transition-all font-semibold"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Nama akan dipaparkan pada sijil dan surat rasmi.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  No. Telefon <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="012-3456789"
                    maxLength={12}
                    className="w-full text-xs font-mono pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white text-slate-900 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alamat Emel <span className="text-slate-400 text-[10px]">(Guna log masuk)</span>
                </label>
                <div className="relative">
                  <div className="w-full text-xs px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-500 select-all cursor-not-allowed">
                    {currentUser.email || '-'}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Institusi / Kolej Komuniti / Politeknik <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                  <Building2 className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => { setError(''); setSuccess(''); setInstitution(e.target.value.toUpperCase()); }}
                  placeholder="CONTOH: KOLEJ KOMUNITI BEAUFORT"
                  className="w-full text-xs uppercase pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white text-slate-900 transition-all font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              id="btn-update-profile"
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-md shadow-red-600/20 transition-all disabled:opacity-50 select-none cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Kemaskini Profil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
