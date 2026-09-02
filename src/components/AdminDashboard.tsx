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
  TrendingUp,
  Users
} from 'lucide-react';
import { downloadDocumentByTemplateKey } from '../utils/docExport';
import { getDocumentTemplatesForApplication } from '../utils/documentTemplates';

export const AdminDashboard: React.FC = () => {
  const { 
    applications, 
    users,
    deleteUser,
    stats, 
    deleteApplication, 
    setEditingApplication, 
    activeView,
    setActiveView, 
    showToast,
    refreshData,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate dynamic YoY statistics (3 years comparison)
  const yearsToCompare = (() => {
    const yearsSet = new Set<number>(applications.map(app => (app.createdAt ? new Date(app.createdAt).getFullYear() : Number(app.year)) as number));
    const sorted = Array.from(yearsSet).sort((a, b) => b - a).filter(y => !isNaN(y) && y > 0);
    if (sorted.length >= 3) {
      return sorted.slice(0, 3);
    }
    const current = new Date().getFullYear();
    const fallback = [current, current - 1, current - 2];
    const merged = Array.from(new Set<number>([...sorted, ...fallback])).sort((a, b) => b - a);
    return merged.slice(0, 3);
  })();

  const statsByYear = yearsToCompare.map(yr => {
    const inovasiPensyarahCount = applications.filter(app => {
      const appYear = app.createdAt ? new Date(app.createdAt).getFullYear() : Number(app.year);
      return appYear === yr && app.applicationType === 'INOVASI' && app.category === 'PENSYARAH';
    }).length;

    const inovasiPelajarCount = applications.filter(app => {
      const appYear = app.createdAt ? new Date(app.createdAt).getFullYear() : Number(app.year);
      return appYear === yr && app.applicationType === 'INOVASI' && app.category === 'PELAJAR';
    }).length;

    const penyelidikanCount = applications.filter(app => {
      const appYear = app.createdAt ? new Date(app.createdAt).getFullYear() : Number(app.year);
      return appYear === yr && app.applicationType === 'PENYELIDIKAN';
    }).length;

    return {
      year: yr,
      inovasiPensyarah: inovasiPensyarahCount,
      inovasiPelajar: inovasiPelajarCount,
      penyelidikan: penyelidikanCount,
      total: inovasiPensyarahCount + inovasiPelajarCount + penyelidikanCount
    };
  });

  const handleDownloadDoc = (app: ApplicationRecord, templateKey: string) => {
    try {
      const result = downloadDocumentByTemplateKey(app, templateKey);
      const ext = result.fileName.endsWith('.pdf') ? '.pdf' : '.doc';
      showToast(`Dokumen ${result.docType} berjaya dimuat turun (${ext})!`, 'success');
    } catch (err) {
      showToast('Gagal memuat turun dokumen.', 'error');
    }
  };

  // Filtered applications (Sorted by Application ID)
  const filteredApps = applications
    .filter((app) => {
      if (filterType !== 'ALL') {
        if (filterType === 'INOVASI_PENSYARAH') {
          if (app.applicationType !== 'INOVASI' || app.category !== 'PENSYARAH') return false;
        } else if (filterType === 'INOVASI_PELAJAR') {
          if (app.applicationType !== 'INOVASI' || app.category !== 'PELAJAR') return false;
        } else {
          if (app.applicationType !== filterType) return false;
        }
      }
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
      const parseDate = (dStr: any) => {
        if (!dStr) return 0;
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) return d.getTime();
        // Fallback for DD/MM/YYYY HH:MM:SS format
        const parts = String(dStr).split(/[\/\-\s:]/);
        if (parts.length >= 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const hours = parts[3] ? parseInt(parts[3], 10) : 0;
          const minutes = parts[4] ? parseInt(parts[4], 10) : 0;
          const seconds = parts[5] ? parseInt(parts[5], 10) : 0;
          const pd = new Date(year, month, day, hours, minutes, seconds);
          if (!isNaN(pd.getTime())) return pd.getTime();
        }
        return 0;
      };

      const dateA = parseDate(a.createdAt);
      const dateB = parseDate(b.createdAt);
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      const idA = a.applicationId || '';
      const idB = b.applicationId || '';
      return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
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
  const totalInvPensyarah = applications.filter((a) => a.applicationType === 'INOVASI' && a.category === 'PENSYARAH').length;
  const totalInvPelajar = applications.filter((a) => a.applicationType === 'INOVASI' && a.category === 'PELAJAR').length;
  const totalRes = stats?.totalResearch ?? applications.filter((a) => a.applicationType === 'PENYELIDIKAN').length;

  // Calculate unique users by IC
  const uniqueUsers = new Map<string, string>(); // icNumber -> institution
  applications.forEach((app) => {
    if (app.icNumber) {
      const inst = (app.institution || '').trim().toUpperCase();
      uniqueUsers.set(app.icNumber, inst);
    }
  });

  let kkbsCount = 0;
  let luarCount = 0;
  uniqueUsers.forEach((inst) => {
    if (inst.includes('BEAUFORT') || inst === 'KKBS' || inst.includes('BEUAFORT') || inst.includes('BOFORT')) {
      kkbsCount++;
    } else {
      luarCount++;
    }
  });

  const totalUsers = kkbsCount + luarCount;
  const kkbsPercent = totalUsers > 0 ? Math.round((kkbsCount / totalUsers) * 100) : 0;
  const luarPercent = totalUsers > 0 ? 100 - kkbsPercent : 0;

  // User list computation (uses users from DB + applicants from applications with strict usr-0001, usr-0002, usr-0003 ordering)
  const userList = (() => {
    const map = new Map<string, any>();
    
    // Add users from DB
    (users || []).forEach((u) => {
      const key = (u.icNumber || u.name || u.id).toUpperCase().trim();
      if (key) map.set(key, { ...u });
    });

    // Add applicants from applications if not in DB
    applications.forEach((app) => {
      const name = (app.applicantName || '').trim().toUpperCase();
      const ic = (app.icNumber || '').trim();
      const key = ic || name;
      if (key && !map.has(key)) {
        map.set(key, {
          id: '',
          name: app.applicantName,
          icNumber: app.icNumber || '',
          email: app.email || app.innovationData?.chiefEmail || app.researchData?.chiefEmail || '-',
          institution: app.institution || 'KOLEJ KOMUNITI BEAUFORT',
          phone: app.phone || app.innovationData?.chiefPhone || app.researchData?.chiefPhone || '-',
          createdAt: app.createdAt
        });
      }
    });

    const rawList = Array.from(map.values());

    // Priority mapping helper:
    // 1 -> SHAMSUDDIN BIN AMIN (usr-0001)
    // 2 -> REZIELLA BINTI LAHAJI (usr-0002)
    // 3 -> NORFAZIRAH BINTI KUSIN (usr-0003)
    const getPriority = (name: string): number => {
      const n = (name || '').toUpperCase();
      if (n.includes('SHAMSUDDIN')) return 1;
      if (n.includes('REZIELLA')) return 2;
      if (n.includes('NORFAZIRAH')) return 3;
      return 999;
    };

    rawList.sort((a, b) => {
      const pA = getPriority(a.name);
      const pB = getPriority(b.name);
      if (pA !== pB) return pA - pB;
      return (a.name || '').localeCompare(b.name || '');
    });

    return rawList.map((u, idx) => {
      const numStr = String(idx + 1).padStart(4, '0');
      let formattedId = `usr-${numStr}`;
      const n = (u.name || '').toUpperCase();
      if (n.includes('SHAMSUDDIN')) formattedId = 'usr-0001';
      else if (n.includes('REZIELLA')) formattedId = 'usr-0002';
      else if (n.includes('NORFAZIRAH')) formattedId = 'usr-0003';

      return {
        ...u,
        id: formattedId
      };
    });
  })();

  const filteredUserList = userList.filter((u) => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.institution || '').toLowerCase().includes(q) ||
      (u.icNumber || '').includes(q) ||
      (u.id || '').toLowerCase().includes(q)
    );
  });

  const handleDeleteUserClick = async (user: any) => {
    if (window.confirm(`Adakah anda pasti untuk memadam pengguna "${user.name}"?`)) {
      await deleteUser(user.id || user.icNumber);
    }
  };

  if (activeView === 'admin_users') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Admin Top Header Banner for Pengguna Page */}
        <div className="bg-slate-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs px-3 py-1 rounded-full mb-3">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Pentadbir (KUPIK)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Senarai Pengguna iREPRO
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl font-normal">
              Pengurusan maklumat pengguna berdaftar dan senarai pemohon sistem iREPRO.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0 relative z-10">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all"
              title="Segar Semula Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Segar Semula</span>
            </button>
          </div>
        </div>

        {/* Users Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Pengguna Berdaftar ({filteredUserList.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengurusan rekod akaun dan profil pemohon iREPRO.
              </p>
            </div>

            {/* Search bar for Users */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pengguna, emel, institusi..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">ID Pengguna</th>
                  <th className="py-3.5 px-4">Nama</th>
                  <th className="py-3.5 px-4">Institusi</th>
                  <th className="py-3.5 px-4">Emel</th>
                  <th className="py-3.5 px-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUserList.length > 0 ? (
                  filteredUserList.map((u, idx) => (
                    <tr key={u.id || u.icNumber || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[11px]">
                          {u.id || `USR-${1000 + idx + 1}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        {u.icNumber && <div className="text-[10px] text-slate-400 font-mono mt-0.5">KP: {u.icNumber}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {u.institution || 'KOLEJ KOMUNITI BEAUFORT'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {u.email && u.email !== '-' ? (
                          <a href={`mailto:${u.email}`} className="text-blue-600 hover:underline">
                            {u.email}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Tiada emel</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteUserClick(u)}
                          className="inline-flex items-center space-x-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all shadow-2xs"
                          title="Padam Pengguna"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Padam</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      Tiada rekod pengguna dijumpai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Jumlah Rekod */}
        <button
          onClick={() => {
            setFilterType('ALL');
          }}
          className={`text-left p-6 rounded-2xl border transition-all shadow-xs flex items-center justify-between ${
            filterType === 'ALL'
              ? 'bg-slate-900 text-white border-slate-800 ring-2 ring-slate-500'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${filterType === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
              Jumlah Rekod
            </div>
            <div className={`text-3xl font-extrabold mt-1 font-serif ${filterType === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              {totalApp}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filterType === 'ALL' ? 'bg-slate-800 text-red-400' : 'bg-slate-100 text-slate-700'}`}>
            <Layers className="w-6 h-6" />
          </div>
        </button>

        {/* Card 2A: Permohonan Inovasi (Pensyarah) */}
        <button
          onClick={() => {
            setFilterType('INOVASI_PENSYARAH');
          }}
          className={`text-left p-6 rounded-2xl border transition-all shadow-xs flex items-center justify-between ${
            filterType === 'INOVASI_PENSYARAH'
              ? 'bg-red-900 text-white border-red-800 ring-2 ring-red-500'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${filterType === 'INOVASI_PENSYARAH' ? 'text-red-200' : 'text-red-600'}`}>
              Inovasi (Pensyarah)
            </div>
            <div className={`text-3xl font-extrabold mt-1 font-serif ${filterType === 'INOVASI_PENSYARAH' ? 'text-white' : 'text-red-700'}`}>
              {totalInvPensyarah}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filterType === 'INOVASI_PENSYARAH' ? 'bg-red-800 text-rose-300' : 'bg-red-50 text-red-600'}`}>
            <Sparkles className="w-6 h-6" />
          </div>
        </button>

        {/* Card 2B: Permohonan Inovasi (Pelajar) */}
        <button
          onClick={() => {
            setFilterType('INOVASI_PELAJAR');
          }}
          className={`text-left p-6 rounded-2xl border transition-all shadow-xs flex items-center justify-between ${
            filterType === 'INOVASI_PELAJAR'
              ? 'bg-rose-900 text-white border-rose-800 ring-2 ring-rose-500'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${filterType === 'INOVASI_PELAJAR' ? 'text-rose-200' : 'text-rose-600'}`}>
              Inovasi (Pelajar)
            </div>
            <div className={`text-3xl font-extrabold mt-1 font-serif ${filterType === 'INOVASI_PELAJAR' ? 'text-white' : 'text-rose-700'}`}>
              {totalInvPelajar}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filterType === 'INOVASI_PELAJAR' ? 'bg-rose-800 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>
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
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${filterType === 'PENYELIDIKAN' ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
            <BookOpen className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* Perbandingan Rekod Mengikut Jenis (4 Kad Asing dengan Carta Bar & Pie) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Kad 1: Inovasi Pensyarah */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-red-600" />
                <span>Permohonan Inovasi Pensyarah</span>
              </h3>
            </div>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
              Inovasi
            </span>
          </div>

          <div className="relative pt-2">
            {/* Vertical Bar Chart Container */}
            <div className="flex items-end justify-around h-44 px-4 bg-slate-50/50 rounded-xl pb-3 border border-slate-100">
              {statsByYear.map((s) => {
                const heightPercent = s.inovasiPensyarah > 0 ? Math.max(15, Math.round((s.inovasiPensyarah / Math.max(...statsByYear.map(sy => sy.inovasiPensyarah), 1)) * 80)) : 0;
                return (
                  <div key={s.year} className="h-full flex flex-col justify-end items-center group w-1/4">
                    {/* Count Label */}
                    <span className="text-[11px] font-extrabold text-slate-900 mb-1.5 transition-all font-mono font-bold">
                      {s.inovasiPensyarah}
                    </span>
                    {/* Vertical Bar */}
                    <div 
                      style={{ height: `${heightPercent}%` }} 
                      className={`w-12 bg-red-600 rounded-t-md transition-all duration-300 hover:bg-red-500 relative flex items-end justify-center ${s.inovasiPensyarah > 0 ? 'shadow-md shadow-red-500/10' : 'opacity-20'}`}
                    >
                      <div className="absolute -top-9 scale-0 group-hover:scale-100 bg-slate-950 text-white text-[9px] px-2 py-1 rounded transition-all z-10 whitespace-nowrap font-mono shadow-md">
                        {s.inovasiPensyarah} Rekod
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

        {/* Kad 2: Inovasi Pelajar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-rose-600" />
                <span>Permohonan Inovasi Pelajar</span>
              </h3>
            </div>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
              Inovasi
            </span>
          </div>

          <div className="relative pt-2">
            {/* Vertical Bar Chart Container */}
            <div className="flex items-end justify-around h-44 px-4 bg-slate-50/50 rounded-xl pb-3 border border-slate-100">
              {statsByYear.map((s) => {
                const heightPercent = s.inovasiPelajar > 0 ? Math.max(15, Math.round((s.inovasiPelajar / Math.max(...statsByYear.map(sy => sy.inovasiPelajar), 1)) * 80)) : 0;
                return (
                  <div key={s.year} className="h-full flex flex-col justify-end items-center group w-1/4">
                    {/* Count Label */}
                    <span className="text-[11px] font-extrabold text-slate-900 mb-1.5 transition-all font-mono font-bold">
                      {s.inovasiPelajar}
                    </span>
                    {/* Vertical Bar */}
                    <div 
                      style={{ height: `${heightPercent}%` }} 
                      className={`w-12 bg-rose-600 rounded-t-md transition-all duration-300 hover:bg-rose-500 relative flex items-end justify-center ${s.inovasiPelajar > 0 ? 'shadow-md shadow-rose-500/10' : 'opacity-20'}`}
                    >
                      <div className="absolute -top-9 scale-0 group-hover:scale-100 bg-slate-955 text-white text-[9px] px-2 py-1 rounded transition-all z-10 whitespace-nowrap font-mono shadow-md">
                        {s.inovasiPelajar} Rekod
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

        {/* Kad 3: Penyelidikan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Permohonan Penyelidikan</span>
              </h3>
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
                  <div key={s.year} className="h-full flex flex-col justify-end items-center group w-1/4">
                    {/* Count Label */}
                    <span className="text-[11px] font-extrabold text-slate-900 mb-1.5 transition-all font-mono font-bold">
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

        {/* Kad 4: Bilangan Pengguna (Pie Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Statistik Pengguna</span>
              </h3>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
              Pengguna
            </span>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4 py-2">
            {/* Conic-gradient Pie Chart */}
            <div className="relative">
              <div 
                className="w-28 h-28 rounded-full border border-slate-100 shadow-xs transition-transform duration-300 hover:scale-105"
                style={{
                  background: `conic-gradient(#ef4444 0% ${kkbsPercent}%, #3b82f6 ${kkbsPercent}% 100%)`
                }}
              />
              <div className="absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jumlah</span>
                <span className="text-lg font-extrabold text-slate-800 font-serif">{totalUsers}</span>
              </div>
            </div>

            {/* Legends */}
            <div className="w-full text-[11px] space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded bg-red-500 shrink-0" />
                  <span className="font-semibold text-slate-700">KKBS</span>
                </div>
                <span className="font-bold text-slate-900 font-mono">{kkbsCount} ({kkbsPercent}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500 shrink-0" />
                  <span className="font-semibold text-slate-700">Luar KKBS</span>
                </div>
                <span className="font-bold text-slate-900 font-mono">{luarCount} ({luarPercent}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Penilaian Penggunaan iREPRO (Usability Feedback) - Moved to bottom */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {(() => {
          const fbStats = stats?.feedbackStats || { total: 0, s1Avg: 0, s2Avg: 0, s3Avg: 0, s4Avg: 0, s5Avg: 0 };
          const overallAvg = fbStats.total > 0 
            ? (fbStats.s1Avg + fbStats.s2Avg + fbStats.s3Avg + fbStats.s4Avg + fbStats.s5Avg) / 5 
            : 0;

          const fbItems = [
            { 
              label: 'Antaramuka sistem iREPRO menarik, kemas dan tersusun', 
              score: fbStats.s1Avg, 
              colorClass: 'bg-rose-500 shadow-xs shadow-rose-500/10' 
            },
            { 
              label: 'Sistem iREPRO adalah mudah digunakan dan difahami', 
              score: fbStats.s2Avg, 
              colorClass: 'bg-orange-500 shadow-xs shadow-orange-500/10' 
            },
            { 
              label: 'Fungsi penjanaan dokumen berjalan dengan lancar', 
              score: fbStats.s3Avg, 
              colorClass: 'bg-amber-400 shadow-xs shadow-amber-400/10' 
            },
            { 
              label: 'Membantu menjimatkan masa pengurusan permohonan', 
              score: fbStats.s4Avg, 
              colorClass: 'bg-emerald-500 shadow-xs shadow-emerald-500/10' 
            },
            { 
              label: 'Saya berpuas hati dengan kualiti keseluruhan perkhidmatan', 
              score: fbStats.s5Avg, 
              colorClass: 'bg-blue-500 shadow-xs shadow-blue-500/10' 
            }
          ];

          return (
            <div className="space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Penilaian Penggunaan iREPRO
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Purata kriteria penilaian maklum balas ({fbStats.total} responden)
                  </p>
                </div>
                <div className="text-red-500 bg-red-50 px-3 py-1 rounded-xl border border-red-100 font-extrabold text-xs sm:text-sm font-mono whitespace-nowrap">
                  {overallAvg > 0 ? overallAvg.toFixed(2) : '0.00'} / 5.0
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {fbItems.map((item, idx) => {
                  const widthPercent = item.score > 0 ? Math.round((item.score / 5) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                        {item.label}
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${widthPercent}%` }} 
                              className={`h-full rounded-full transition-all duration-500 ${item.colorClass}`}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-extrabold text-slate-900 font-mono">
                            {item.score > 0 ? item.score.toFixed(1) : '0.0'} / 5.0
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
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
                <option value="INOVASI_PENSYARAH">Permohonan Inovasi (Pensyarah)</option>
                <option value="INOVASI_PELAJAR">Permohonan Inovasi (Pelajar)</option>
                <option value="PENYELIDIKAN">Kertas Penyelidikan</option>
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
                <th className="px-4 py-3.5 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
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

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(app)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all font-semibold text-xs border border-rose-100"
                        title="Padam Permohonan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Padam</span>
                      </button>
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
