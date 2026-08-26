import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Phone, 
  Building2, 
  CheckCircle2, 
  Send,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

export const ContactUs: React.FC = () => {
  const { showToast } = useApp();
  
  // Demographics
  const [jantina, setJantina] = useState('Lelaki');
  const [umur, setUmur] = useState('21-30 tahun');
  const [bangsa, setBangsa] = useState('Bumiputera Sabah/Sarawak');
  
  // Likert scale 1-5 ratings
  const [s1, setS1] = useState('5');
  const [s2, setS2] = useState('5');
  const [s3, setS3] = useState('5');
  const [s4, setS4] = useState('5');
  const [s5, setS5] = useState('5');
  
  const [comments, setComments] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jantina,
          umur,
          bangsa,
          s1,
          s2,
          s3,
          s4,
          s5,
          comments
        })
      });
      if (res.ok) {
        setIsSubmitted(true);
        showToast('Maklum balas anda berjaya dihantar ke database Google Sheets!', 'success');
      } else {
        showToast('Gagal menghantar maklum balas ke server.', 'error');
      }
    } catch (err) {
      showToast('Ralat sambungan untuk hantar maklum balas.', 'error');
    }
  };

  const ratingOptions = [
    { label: 'Sangat Tidak Setuju (1)', value: '1' },
    { label: 'Tidak Setuju (2)', value: '2' },
    { label: 'Kurang Setuju (3)', value: '3' },
    { label: 'Setuju (4)', value: '4' },
    { label: 'Sangat Setuju (5)', value: '5' }
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="inline-flex items-center space-x-2 bg-red-900/60 border border-red-700/60 text-red-300 text-xs px-3 py-1 rounded-full mb-3">
          <MessageSquare className="w-4 h-4 text-red-400" />
          <span>Bantuan &amp; Penilaian Usability</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-serif">
          Hubungi Kami &amp; Maklum Balas
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl font-normal leading-relaxed">
          Sebarang pertanyaan berkaitan permohonan inovasi, penyelidikan, atau bantuan teknikal sistem iREPRO, sila hubungi pihak pengurusan kami. Anda juga dialu-alukan menilai kualiti penggunaan sistem iREPRO.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 text-xs text-slate-700 h-fit">
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
              <Phone className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
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
                  href="https://wa.me/shamsuddin_amin" 
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
            <span className="font-bold block text-slate-955">Nama Pembangun:</span>
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

        {/* Feedback Form (MyPRO Usability Style) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Penilaian &amp; Maklum Balas Penggunaan iREPRO
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Sila berikan maklum balas ke atas kualiti pengoperasian sistem iREPRO bagi membantu kami meningkatkan kualiti servis.
          </p>

          {isSubmitted ? (
            <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-4 text-emerald-900">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-lg font-bold">Maklum Balas Berjaya Dihantar!</h4>
              <p className="text-xs text-emerald-700 max-w-md mx-auto leading-relaxed">
                Terima kasih atas masa anda. Maklum balas anda telah direkodkan terus ke Google Sheets database untuk analisis pihak pengurusan.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setComments('');
                  setS1('5');
                  setS2('5');
                  setS3('5');
                  setS4('5');
                  setS5('5');
                }}
                className="mt-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all"
              >
                Hantar Maklum Balas Baru
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {/* Demographic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Jantina <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={jantina}
                    onChange={(e) => setJantina(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-xs"
                  >
                    <option value="Lelaki">Lelaki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Umur <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={umur}
                    onChange={(e) => setUmur(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-xs"
                  >
                    <option value="20 tahun ke bawah">20 tahun ke bawah</option>
                    <option value="21-30 tahun">21-30 tahun</option>
                    <option value="31-40 tahun">31-40 tahun</option>
                    <option value="41 tahun ke atas">41 tahun ke atas</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Bangsa <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bangsa}
                    onChange={(e) => setBangsa(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-xs"
                  >
                    <option value="Bumiputera Sabah/Sarawak">Bumiputera Sabah/Sarawak</option>
                    <option value="Melayu">Melayu</option>
                    <option value="Cina">Cina</option>
                    <option value="India">India</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
              </div>

              {/* Usability Questions (Likert-Scale) */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Penilaian Kriteria Penggunaan Sistem
                </h3>

                {/* S1 */}
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <span className="font-semibold text-slate-800 md:max-w-md">
                    1. Antaramuka (design) sistem iREPRO menarik, kemas dan tersusun.
                  </span>
                  <select
                    value={s1}
                    onChange={(e) => setS1(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    {ratingOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>

                {/* S2 */}
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <span className="font-semibold text-slate-800 md:max-w-md">
                    2. Sistem iREPRO adalah mudah digunakan dan senang difahami.
                  </span>
                  <select
                    value={s2}
                    onChange={(e) => setS2(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    {ratingOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>

                {/* S3 */}
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <span className="font-semibold text-slate-800 md:max-w-md">
                    3. Fungsi penjanaan dokumen (Surat, Proposal, Borang) berjalan lancar.
                  </span>
                  <select
                    value={s3}
                    onChange={(e) => setS3(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    {ratingOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>

                {/* S4 */}
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <span className="font-semibold text-slate-800 md:max-w-md">
                    4. Sistem ini sangat membantu menjimatkan masa pengurusan permohonan.
                  </span>
                  <select
                    value={s4}
                    onChange={(e) => setS4(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    {ratingOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>

                {/* S5 */}
                <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <span className="font-semibold text-slate-800 md:max-w-md">
                    5. Saya berpuas hati dengan kualiti keseluruhan perkhidmatan iREPRO.
                  </span>
                  <select
                    value={s5}
                    onChange={(e) => setS5(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    {ratingOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Suggestions */}
              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-1.5">
                  Ulasan &amp; Cadangan Penambahbaikan
                </label>
                <textarea
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Tuliskan ulasan atau cadangan anda di sini..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-xs"
                />
              </div>

              <button
                type="submit"
                className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all text-xs"
              >
                <Send className="w-4 h-4" />
                <span>Hantar Maklum Balas Penggunaan</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
