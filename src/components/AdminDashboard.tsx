import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApplicationRecord } from '../types';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  Trash2, 
  Edit3, 
  Layers, 
  Sparkles, 
  BookOpen, 
  RefreshCw,
  CheckCircle2,
  FileText,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { downloadDocumentByTemplateKey } from '../utils/docExport';
import { getDocumentTemplatesForApplication } from '../utils/documentTemplates';

export const AdminDashboard: React.FC = () => {
  const { 
    applications, 
    stats, 
    deleteApplication, 
    setEditingApplication, 
    setActiveView, 
    showToast,
    refreshData,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate dynamic YoY statistics (3 years comparison)
  const yearsToCompare = (() => {
    const yearsSet = new Set(applications.map(app => app.createdAt ? new Date(app.createdAt).getFullYear() : Number(app.year)));
    const sorted = Array.from(yearsSet).sort((a, b) => b - a).filter(y => !isNaN(y) && y > 0);
    if (sorted.length >= 3) {
      return sorted.slice(0, 3);
    }
    const current = new Date().getFullYear();
    const fallback = [current, current - 1, current - 2];
    const merged = Array.from(new Set([...sorted, ...fallback])).sort((a, b) => b - a);
    return merged.slice(0, 3);
  })();

  const statsByYear = yearsToCompare.map(yr => {
    const inovasiCount = applications.filter(app => {
      const appYear = app.createdAt ? new Date(app.createdAt).getFullYear() : Number(app.year);
      return appYear === yr && app.applicationType === 'INOVASI';
    }).length;

    const penyelidikanCount = applications.filter(app => {
      const appYear = app.createdAt ? new Date(app.createdAt).getFullYear() : Number(app.year);
      return appYear === yr && app.applicationType === 'PENYELIDIKAN';
    }).length;

    return {
      year: yr,
      inovasi: inovasiCount,
      penyelidikan: penyelidikanCount,
      total: inovasiCount + penyelidikanCount
    };
  });

  const handleDownloadDoc = (app: ApplicationRecord, templateKey: string) => {
    try {
      const result = downloadDocumentByTemplateKey(app, templateKey);
      showToast(`Dokumen ${result.docType} berjaya dimuat turun (.doc)!`, 'success');
    } catch (err) {
      showToast('Gagal memuat turun dokumen.', 'error');
    }
  };

  // Filtered applications (Sorted by Application ID)
  const filteredApps = applications
    .filter((app) => {
      if (filterType !== 'ALL' && app.applicationType !== filterType) return false;
      const appYear = app.createdAt ? new Date(app.createdAt).getFullYear() : Number(app.year);
      if (filterYear !== 'ALL' && appYear !== Number(filterYear)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchApplicantName = app.applicantName?.toLowerCase().includes(q);
        const matchApplicantIc = app.icNumber?.toLowerCase().includes(q);
        
        const groupMembers = app.members || app.innovationData?.members || app.researchData?.members || [];
        const matchMember = groupMembers.some((m: any) => {
          if (!m) return false;
          const matchMemName = m.name?.toLowerCase().includes(q);
          const matchMemIc = m.icNumber?.toLowerCase().includes(q);
          return matchMemName || matchMemIc;
        });

        return matchApplicantName || matchApplicantIc || matchMember;
      }
      return true;
    })
    .sort((a, b) => {
      const idA = a.applicationId || '';
      const idB = b.applicationId || '';
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });

  const handleDelete = async (app: ApplicationRecord) => {
    if (window.confirm(`Adakah anda pasti ingin memadamkan permohonan ${app.title}?`)) {
      try {
        await deleteApplication(app.id);
      } catch (e: any) {
        showToast(e.message || 'Gagal memadam permohonan', 'error');
      }
    }
  };

  const handleExportCsv = () => {
    try {
      const headers = ['Jenis', 'Kategori', 'Tajuk', 'Tahun', 'Bahasa', 'Nama Pemohon', 'No. KP', 'Institusi', 'Tarikh Dicipta'];
      const rows = filteredApps.map((a) => [
        `"${a.applicationType}"`,
        `"${a.category || '-'}"`,
        `"${a.title.replace(/"/g, '""')}"`,
        a.year,
        a.language,
        `"${a.applicantName.replace(/"/g, '""')}"`,
        `"${a.icNumber}"`,
        `"${a.institution.replace(/"/g, '""')}"`,
        `"${new Date(a.createdAt).toISOString()}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `iREPRO_POLYCC_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Data permohonan berjaya dieksport ke CSV.', 'success');
    } catch (e) {
      showToast('Gagal mengeksport data.', 'error');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 400);
    showToast('Data berjaya diselaraskan semula.', 'info');
  };

  const totalApp = stats?.totalApplications ?? applications.length;
  const totalInv = stats?.totalInnovation ?? applications.filter((a) => a.applicationType === 'INOVASI').length;
  const totalRes = stats?.totalResearch ?? applications.filter((a) => a.applicationType === 'PENYELIDIKAN').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Admin Top Header Banner */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-red-500/20 border border-red-500/30 text-red-300 text-xs px-3 py-1 rounded-full mb-3">
            <ShieldCheck className="w-4 h-4 text-red-400" />
            <span className="font-semibold">Pentadbir (KUPIK)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Portal Pengurusan KUPIK
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl font-normal">
            Unit Penyelidikan, Inovasi &amp; Komersialan.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0 relative z-10">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all"
            title="Segar Semula Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-400' : ''}`} />
            <span>Segar Semula</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Eksport CSV</span>
          </button>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Jumlah Rekod */}
        <button
          onClick={() => {
            setFilterType('ALL');
          }}
          className={`text-left p-6 rounded-2xl border transition-all shadow-xs flex items-center justify-between ${
            filterType === 'ALL'
              ? 'bg-slate-900 text-white border-slate-800 ring-2 ring-red-500/50'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${filterType === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
              Jumlah Rekod Keseluruhan
            </div>
            <div className={`text-3xl font-extrabold mt-1 font-serif ${filterType === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              {totalApp}
            </div>
            {/* Subtext removed */}
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filterType === 'ALL' ? 'bg-slate-800 text-red-400' : 'bg-slate-100 text-slate-700'}`}>
            <Layers className="w-6 h-6" />
          </div>
        </button>

        {/* Card 2: Projek Inovasi */}
        <button
          onClick={() => {
            setFilterType('INOVASI');
          }}
          className={`text-left p-6 rounded-2xl border transition-all shadow-xs flex items-center justify-between ${
            filterType === 'INOVASI'
              ? 'bg-red-900 text-white border-red-800 ring-2 ring-red-500'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${filterType === 'INOVASI' ? 'text-red-200' : 'text-red-600'}`}>
              Projek Inovasi
            </div>
            <div className={`text-3xl font-extrabold mt-1 font-serif ${filterType === 'INOVASI' ? 'text-white' : 'text-red-700'}`}>
              {totalInv}
            </div>
            {/* Subtext removed */}
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filterType === 'INOVASI' ? 'bg-red-800 text-rose-300' : 'bg-red-50 text-red-600'}`}>
            <Sparkles className="w-6 h-6" />
          </div>
        </button>

        {/* Card 3: Kertas Penyelidikan */}
        <button
          onClick={() => {
            setFilterType('PENYELIDIKAN');
          }}
          className={`text-left p-6 rounded-2xl border transition-all shadow-xs flex items-center justify-between ${
            filterType === 'PENYELIDIKAN'
              ? 'bg-emerald-950 text-white border-emerald-800 ring-2 ring-emerald-500'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${filterType === 'PENYELIDIKAN' ? 'text-emerald-200' : 'text-emerald-600'}`}>
              Kertas Penyelidikan
            </div>
            <div className={`text-3xl font-extrabold mt-1 font-serif ${filterType === 'PENYELIDIKAN' ? 'text-white' : 'text-emerald-700'}`}>
              {totalRes}
            </div>
            {/* Subtext removed */}
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filterType === 'PENYELIDIKAN' ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
            <BookOpen className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* Perbandingan Rekod Mengikut Jenis (2 Kad Asing dengan Carta Bar Menegak) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kad 1: Inovasi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-red-600" />
                <span>Permohonan Inovasi Mengikut Tahun</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                3 tahun terkini bagi permohonan projek inovasi.
              </p>
            </div>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
              Inovasi
            </span>
          </div>

          <div className="relative pt-2">
            {/* Vertical Bar Chart Container */}
            <div className="flex items-end justify-around h-44 px-4 bg-slate-50/50 rounded-xl pb-3 border border-slate-100">
              {statsByYear.map((s) => {
                const heightPercent = s.inovasi > 0 ? Math.max(15, Math.round((s.inovasi / Math.max(...statsByYear.map(sy => sy.inovasi), 1)) * 80)) : 0;
                return (
                  <div key={s.year} className="flex flex-col items-center group w-1/4">
                    {/* Count Label */}
                    <span className="text-[11px] font-extrabold text-slate-900 mb-1.5 transition-all font-mono">
                      {s.inovasi}
                    </span>
                    {/* Vertical Bar */}
                    <div 
                      style={{ height: `${heightPercent}%` }} 
                      className={`w-12 bg-red-600 rounded-t-md transition-all duration-300 hover:bg-red-500 relative flex items-end justify-center ${s.inovasi > 0 ? 'shadow-md shadow-red-500/10' : 'opacity-20'}`}
                    >
                      <div className="absolute -top-9 scale-0 group-hover:scale-100 bg-slate-955 text-white text-[9px] px-2 py-1 rounded transition-all z-10 whitespace-nowrap font-mono shadow-md">
                        {s.inovasi} Rekod
                      </div>
                    </div>
                    {/* Year Label */}
                    <span className="text-[11px] font-bold text-slate-600 mt-2.5 font-mono">
                      {s.year}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kad 2: Penyelidikan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Permohonan Penyelidikan Mengikut Tahun</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                3 tahun terkini bagi permohonan kertas penyelidikan.
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
              Penyelidikan
            </span>
          </div>

          <div className="relative pt-2">
            {/* Vertical Bar Chart Container */}
            <div className="flex items-end justify-around h-44 px-4 bg-slate-50/50 rounded-xl pb-3 border border-slate-100">
              {statsByYear.map((s) => {
                const heightPercent = s.penyelidikan > 0 ? Math.max(15, Math.round((s.penyelidikan / Math.max(...statsByYear.map(sy => sy.penyelidikan), 1)) * 80)) : 0;
                return (
                  <div key={s.year} className="flex flex-col items-center group w-1/4">
                    {/* Count Label */}
                    <span className="text-[11px] font-extrabold text-slate-900 mb-1.5 transition-all font-mono">
                      {s.penyelidikan}
                    </span>
                    {/* Vertical Bar */}
                    <div 
                      style={{ height: `${heightPercent}%` }} 
                      className={`w-12 bg-emerald-600 rounded-t-md transition-all duration-300 hover:bg-emerald-500 relative flex items-end justify-center ${s.penyelidikan > 0 ? 'shadow-md shadow-emerald-500/10' : 'opacity-20'}`}
                    >
                      <div className="absolute -top-9 scale-0 group-hover:scale-100 bg-slate-955 text-white text-[9px] px-2 py-1 rounded transition-all z-10 whitespace-nowrap font-mono shadow-md">
                        {s.penyelidikan} Rekod
                      </div>
                    </div>
                    {/* Year Label */}
                    <span className="text-[11px] font-bold text-slate-600 mt-2.5 font-mono">
                      {s.year}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>


      {/* SEMUA PERMOHONAN TABLE (Directly embedded in Dashboard Admin) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-red-600" />
              <span>Semua Permohonan ({filteredApps.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pengurusan dan carian rekod permohonan inovasi serta penyelidikan POLYCC.
            </p>
          </div>

          {(filterType !== 'ALL' || filterYear !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setFilterType('ALL');
                setFilterYear('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-red-600 hover:text-red-800 font-semibold self-start sm:self-auto bg-red-50 px-3 py-1.5 rounded-lg border border-red-200"
            >
              Set Semula Tapisan
            </button>
          )}
        </div>

        {/* Search & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Nama Pemohon / Ahli / No. Kad Pengenalan..."
                className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <div className="sm:col-span-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl"
              >
                <option value="ALL">Semua Jenis</option>
                <option value="INOVASI">Inovasi</option>
                <option value="PENYELIDIKAN">Penyelidikan</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl"
              >
                <option value="ALL">Semua Tahun</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Jenis</th>
                <th className="px-4 py-3.5">Tajuk Permohonan</th>
                <th className="px-4 py-3.5">Pemohon</th>
                <th className="px-4 py-3.5 text-center">Tahun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                    Tiada rekod permohonan ditemui untuk kriteria carian ini.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          app.applicationType === 'INOVASI'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {app.applicationType}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-sm">
                      <div className="line-clamp-2" title={app.title}>{app.title}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">{app.applicantName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{app.icNumber}</div>
                    </td>

                    <td className="px-4 py-3.5 text-center font-semibold">
                      {app.createdAt ? new Date(app.createdAt).getFullYear() : app.year}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
