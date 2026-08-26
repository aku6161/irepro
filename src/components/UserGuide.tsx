import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  BookOpen, 
  CheckCircle2, 
  HelpCircle, 
  ShieldCheck, 
  FileText, 
  FolderPlus, 
  Sparkles, 
  GraduationCap, 
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

export const UserGuide: React.FC = () => {
  const { setActiveView } = useApp();

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="inline-flex items-center space-x-2 bg-red-900/60 border border-red-700/60 text-red-300 text-xs px-3 py-1 rounded-full mb-3">
          <BookOpen className="w-4 h-4" />
          <span>Panduan Pengguna Rasmi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Panduan &amp; Manual Operasi iREPRO
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-normal leading-relaxed">
          Ketahui aliran kerja permohonan inovasi dan penyelidikan, kategori kertas cadangan, dan cara menjana serta menyimpan dokumen rasmi.
        </p>
      </div>

      {/* Scope Disclaimer Box (Page 1 & 25) */}
      <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-xs text-rose-900">
        <ShieldCheck className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-sm text-rose-950 block">
            Prinsip Skop &amp; Fungsi Platform iREPRO
          </span>
          <p className="leading-relaxed">
            iREPRO adalah sistem <strong>penyediaan dokumen, pengisian data satu kali (One Time Data Entry), penyimpanan berpusat dan paparan statistik</strong>. iREPRO bukan sistem kelulusan (approval workflow). Kelulusan fizikal/rasmi ditandatangani oleh Pengarah Institusi atau Pengarah Pusat Penyelidikan &amp; Inovasi (PPI) pada dokumen yang dijana.
          </p>
        </div>
      </div>

      {/* Section 1: 7-Step Workflow */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-red-600" />
          <span>Aliran 7 Langkah Pengisian Permohonan</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            { step: '1', title: 'Jenis & Bahasa', desc: 'Pilih Inovasi / Penyelidikan (Kategori I-V) dan bahasa (Bahasa Melayu / English).' },
            { step: '2', title: 'Maklumat Pemohon', desc: 'Isi maklumat ketua pemohon, No. KP (diauto-format), telefon, email dan institusi.' },
            { step: '3', title: 'Maklumat Ahli & Pentadbiran', desc: 'Tambah ahli projek dinamik dan pegawai pengesah (KUPIK, TP, Pengarah).' },
            { step: '4', title: 'Maklumat Cadangan', desc: 'Isi tajuk, pengenalan latar belakang, objektif dan metodologi kajian.' },
            { step: '5', title: 'Maklumat Impak', desc: 'Nyatakan sumbangan impak kepada kumpulan sasaran, institusi dan jabatan.' },
            { step: '6', title: 'Semakan (Review)', desc: 'Semak kesemua maklumat sebelum pengesahan penjanaan dokumen.' },
            { step: '7', title: 'Jana Dokumen Rasmi', desc: 'Sistem menjana Surat Lantikan, Kertas Cadangan & Lampiran/PPP serta menyimpan ke Drive.' },
          ].map((item) => (
            <div key={item.step} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                {item.step}
              </div>
              <div>
                <span className="font-bold text-slate-900 block">{item.title}</span>
                <span className="text-slate-600 text-[11px] leading-relaxed">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Research Categories Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          <span>Matriks Kategori Penyelidikan (Kategori I hingga V)</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Kategori</th>
                <th className="p-3">Penyelidik</th>
                <th className="p-3">Responden</th>
                <th className="p-3">Kelulusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-red-900">Kategori I</td>
                <td className="p-3">POLYCC A</td>
                <td className="p-3">POLYCC A</td>
                <td className="p-3 font-semibold">Pengarah Institusi</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-red-900">Kategori II</td>
                <td className="p-3">POLYCC</td>
                <td className="p-3">Agensi Luar</td>
                <td className="p-3 font-semibold">Pengarah Institusi</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-red-900">Kategori III</td>
                <td className="p-3">POLYCC A</td>
                <td className="p-3">POLYCC B</td>
                <td className="p-3 font-semibold text-emerald-700">Pengarah PPI</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-red-900">Kategori IV</td>
                <td className="p-3">Agensi Luar</td>
                <td className="p-3">POLYCC</td>
                <td className="p-3 font-semibold text-emerald-700">Pengarah PPI</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-red-900">Kategori V</td>
                <td className="p-3">Pensyarah Sambung Belajar / Pelajar IPT</td>
                <td className="p-3">Agensi Luar</td>
                <td className="p-3 font-semibold text-emerald-700">Pengarah PPI</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Button */}
      <div className="text-center pt-2">
        <button
          onClick={() => setActiveView('new_application')}
          className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md transition-all"
        >
          <span>Mula Isi Permohonan Sekarang</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
