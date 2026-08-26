import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Send, 
  CheckCircle2, 
  HelpCircle, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const ContactUs: React.FC = () => {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      showToast('Sila lengkapkan semua ruangan wajib.', 'error');
      return;
    }
    setIsSubmitted(true);
    showToast('Mesej anda telah berjaya dihantar kepada Unit Penyelidikan & Inovasi.', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="inline-flex items-center space-x-2 bg-red-900/60 border border-red-700/60 text-red-300 text-xs px-3 py-1 rounded-full mb-3">
          <Mail className="w-4 h-4" />
          <span>Bantuan &amp; Maklum Balas</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Hubungi Kami
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-normal leading-relaxed">
          Sebarang pertanyaan berkaitan permohonan inovasi, penyelidikan, atau bantuan teknikal sistem iREPRO, sila hubungi pihak pengurusan kami.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs text-slate-700">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-red-600" />
              <span>Unit Penyelidikan, Inovasi &amp; Komersialan</span>
            </h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              Kolej Komuniti Beaufort,<br />
              Jalan Melalugus,<br />
              89807 Beaufort, Sabah.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-start space-x-2.5">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-slate-800">Telefon Meja Bantuan:</span>
                <span className="text-slate-600 font-mono">089-212529/530</span>
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-slate-800">Hubungi Kami:</span>
                <a 
                  href="https://wa.me/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center space-x-1 text-emerald-600 hover:text-emerald-500 font-bold"
                >
                  <span>Hubungi via WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <span className="font-bold block text-slate-950">Nama Pembangun:</span>
            <ul className="space-y-1.5 text-slate-600 leading-normal font-medium pl-1">
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                <span>Shamsuddin bin Amin</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                <span>Norfazirah binti Kusin</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                <span>Reziella binti Lahaji</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Feedback Form */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Borang Pertanyaan / Maklum Balas
          </h2>

          {isSubmitted ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3 text-emerald-900">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold">Mesej Anda Berjaya Dihantar!</h4>
              <p className="text-xs text-emerald-700 max-w-sm mx-auto">
                Terima kasih atas maklum balas anda. Pihak pentadbir KUPIK / PPI akan menghubungi anda dalam tempoh 1-3 hari bekerja.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setName('');
                  setEmail('');
                  setMessage('');
                }}
                className="mt-2 text-xs bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg"
              >
                Hantar Mesej Lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Penuh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama anda"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Emel Rasmi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@politeknik.edu.my"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subjek Pertanyaan
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Contoh: Pertanyaan penjanaan dokumen Kategori IV"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mesej / Butiran Pertanyaan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tuliskan soalan atau isu teknikal anda di sini..."
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Hantar Mesej</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
