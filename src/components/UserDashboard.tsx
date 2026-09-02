import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApplicationRecord } from '../types';
import { 
  FolderPlus, 
  Search, 
  Edit3, 
  FileCheck, 
  Sparkles, 
  Building2, 
  Layers,
  Download,
  FileText,
  Eye,
  X
} from 'lucide-react';
import { downloadDocumentByTemplateKey } from '../utils/docExport';
import { getDocumentTemplatesForApplication } from '../utils/documentTemplates';

export const UserDashboard: React.FC = () => {
  const { 
    currentUser, 
    applications, 
    setActiveView, 
    setEditingApplication,
    showToast
  } = useApp();

  const [selectedAppForView, setSelectedAppForView] = useState<ApplicationRecord | null>(null);
  const [filterType, setFilterType] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');

  const userApps = applications.filter((app) => {
    if (!currentUser?.icNumber) return true;
    const cleanUserIc = currentUser.icNumber.trim();
    const userDigits = cleanUserIc.replace(/\D/g, '');
    const appIc = app.icNumber?.trim() || '';
    const appDigits = appIc.replace(/\D/g, '');
    const chiefInvIc = app.innovationData?.chiefIc?.trim() || '';
    const chiefInvDigits = chiefInvIc.replace(/\D/g, '');
    const chiefResIc = app.researchData?.chiefIc?.trim() || '';
    const chiefResDigits = chiefResIc.replace(/\D/g, '');

    const isChief = (
      appIc === cleanUserIc ||
      (userDigits.length >= 6 && appDigits === userDigits) ||
      chiefInvIc === cleanUserIc ||
      (userDigits.length >= 6 && chiefInvDigits === userDigits) ||
      chiefResIc === cleanUserIc ||
      (userDigits.length >= 6 && chiefResDigits === userDigits)
    );

    const isMember = (
      app.innovationData?.members?.some((m: any) => {
        const mIc = m.icNumber?.trim() || '';
        const mDigits = mIc.replace(/\D/g, '');
        const mName = m.name?.trim().toUpperCase() || '';
        const curName = currentUser.name?.trim().toUpperCase() || '';
        return (
          (mIc && mIc === cleanUserIc) ||
          (userDigits.length >= 6 && mDigits && mDigits === userDigits) ||
          (curName && mName && mName === curName)
        );
      }) ||
      app.researchData?.members?.some((m: any) => {
        const mIc = m.icNumber?.trim() || '';
        const mDigits = mIc.replace(/\D/g, '');
        const mName = m.name?.trim().toUpperCase() || '';
        const curName = currentUser.name?.trim().toUpperCase() || '';
        return (
          (mIc && mIc === cleanUserIc) ||
          (userDigits.length >= 6 && mDigits && mDigits === userDigits) ||
          (curName && mName && mName === curName)
        );
      })
    );

    const isNameMatch = (
      currentUser.name &&
      app.applicantName &&
      app.applicantName.trim().toUpperCase() === currentUser.name.trim().toUpperCase()
    );

    return isChief || isMember || isNameMatch;
  });

  const totalUserApps = userApps.length;
  const userInvCount = userApps.filter((a) => a.applicationType === 'INOVASI').length;
  const userResCount = userApps.filter((a) => a.applicationType === 'PENYELIDIKAN').length;

  // Filtered applications
  const filteredApps = userApps.filter((app) => {
    if (filterType !== 'ALL' && app.applicationType !== filterType) return false;
    const appYear = app.createdAt ? new Date(app.createdAt).getFullYear() : Number(app.year);
    if (filterYear !== 'ALL' && appYear !== Number(filterYear)) return false;
    return true;
  });

  const availableYears: number[] = (Array.from(new Set(userApps.map((a) => a.createdAt ? new Date(a.createdAt).getFullYear() : Number(a.year)))) as number[]).sort((a, b) => b - a);

  const handleEdit = (app: ApplicationRecord) => {
    setEditingApplication(app);
    setActiveView('edit_application');
  };

  const handleDownloadDoc = (app: ApplicationRecord, templateKey: string) => {
    try {
      const result = downloadDocumentByTemplateKey(app, templateKey);
      const ext = result.fileName.endsWith('.pdf') ? '.pdf' : '.doc';
      showToast(`Dokumen ${result.docType} berjaya dimuat turun (${ext})!`, 'success');
    } catch (err) {
      showToast('Gagal memuat turun dokumen.', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 bg-red-900/60 border border-red-700/60 text-red-300 text-xs px-3 py-1 rounded-full mb-3">
            <Building2 className="w-3.5 h-3.5" />
            <span>{currentUser?.institution || 'Kolej Komuniti Beaufort (POLYCC)'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Selamat Datang, {currentUser?.name || 'Penyelidik'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-normal">
            Urus dan pantau rekod permohonan inovasi dan kertas cadangan penyelidikan anda.
          </p>
        </div>
      </div>

      {/* User Quick Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Jumlah Permohonan
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-serif">
              {totalUserApps}
            </div>
            <span className="text-[11px] text-slate-400">Semua rekod tersimpan</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block">
              Permohonan Inovasi
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-700 mt-1 font-serif">
              {userInvCount}
            </div>
            <span className="text-[11px] text-slate-400">Surat &amp; Kertas Cadangan</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Permohonan Penyelidikan
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1 font-serif">
              {userResCount}
            </div>
            <span className="text-[11px] text-slate-400">Lampiran A / Borang PPP</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Section: Permohonan Saya */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header & Search/Filter Controls */}
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Permohonan Saya</h2>
              <p className="text-xs text-slate-500">
                Senarai dokumen inovasi dan penyelidikan yang telah dijana dan direkodkan.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">
                Memaparkan {filteredApps.length} daripada {totalUserApps} rekod
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            {/* Filter Jenis */}
            <div className="sm:col-span-6">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-700"
              >
                <option value="ALL">Semua Jenis</option>
                <option value="INOVASI">Inovasi</option>
                <option value="PENYELIDIKAN">Penyelidikan</option>
              </select>
            </div>

            {/* Filter Tahun */}
            <div className="sm:col-span-6">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-700"
              >
                <option value="ALL">Semua Tahun</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                {availableYears.map((yr) => (
                  !['2026', '2025', '2024'].includes(String(yr)) ? (
                    <option key={yr} value={yr}>{yr}</option>
                  ) : null
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content Table / Empty State */}
        {filteredApps.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <FolderPlus className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Belum ada permohonan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Anda belum mempunyai sebarang rekod permohonan inovasi atau penyelidikan.
              </p>
            </div>
            <button
              id="btn-empty-new-app"
              onClick={() => setActiveView('new_application')}
              className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ Buat Permohonan Baharu</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Jenis</th>
                  <th className="px-4 py-3.5">Tajuk Permohonan</th>
                  <th className="px-4 py-3.5 text-center">Tahun</th>
                  <th className="px-4 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApps.map((app) => {
                  const isInovasi = app.applicationType === 'INOVASI';
                  
                  const cleanUserIc = currentUser?.icNumber?.trim() || '';
                  const userDigits = cleanUserIc.replace(/\D/g, '');
                  const appIc = app.icNumber?.trim() || '';
                  const appDigits = appIc.replace(/\D/g, '');
                  const chiefInvIc = app.innovationData?.chiefIc?.trim() || '';
                  const chiefInvDigits = chiefInvIc.replace(/\D/g, '');
                  const chiefResIc = app.researchData?.chiefIc?.trim() || '';
                  const chiefResDigits = chiefResIc.replace(/\D/g, '');

                  const isChief = (
                    appIc === cleanUserIc ||
                    (userDigits.length >= 6 && appDigits === userDigits) ||
                    (chiefInvIc && chiefInvIc === cleanUserIc) ||
                    (userDigits.length >= 6 && chiefInvDigits && chiefInvDigits === userDigits) ||
                    (chiefResIc && chiefResIc === cleanUserIc) ||
                    (userDigits.length >= 6 && chiefResDigits && chiefResDigits === userDigits)
                  );

                  return (
                    <tr key={app.id} className="hover:bg-red-50/40 transition-colors">
                      {/* Jenis */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                            isInovasi
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {app.applicationType}
                        </span>
                      </td>

                      {/* Tajuk Permohonan sahaja */}
                      <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-sm">
                        <div className="line-clamp-2" title={app.title}>
                          {app.title}
                        </div>
                      </td>

                      {/* Tahun */}
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-800">
                       {app.createdAt ? new Date(app.createdAt).getFullYear() : app.year}
                      </td>

                      {/* Tindakan */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {isChief ? (
                            <button
                              id={`btn-view-${app.id}`}
                              onClick={() => setSelectedAppForView(app)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100 hover:border-red-200 inline-flex items-center space-x-1 shadow-2xs hover:scale-105"
                              title="Papar Tindakan Dokumen"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="text-[10px] font-bold px-0.5">Papar</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic font-medium px-2">Ahli Kumpulan</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal View Tindakan Dokumen */}
      {selectedAppForView && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                  {selectedAppForView.applicationId || 'Sesi Aktif'}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1" title={selectedAppForView.title}>
                  {selectedAppForView.title}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedAppForView(null)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Card 1: Kemaskini */}
              <div 
                onClick={() => {
                  handleEdit(selectedAppForView);
                  setSelectedAppForView(null);
                }}
                className="flex items-start space-x-4 p-4 rounded-xl border border-red-100 bg-red-50/30 hover:bg-red-50/60 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs group"
              >
                <div className="p-3 bg-red-500 text-white rounded-xl group-hover:scale-110 transition-transform">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                    Kemaskini Maklumat Permohonan
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ubah suai butiran ahli, tajuk rintisan, objektif, atau impak permohonan.
                  </p>
                </div>
              </div>

              {/* Card 2: Dokumen Berkaitan */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Dokumen Berkaitan (Boleh Dimuat Turun)
                </h4>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {getDocumentTemplatesForApplication(selectedAppForView).map((tmpl) => (
                    <button
                      key={tmpl.key}
                      onClick={() => handleDownloadDoc(selectedAppForView, tmpl.key)}
                      className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 cursor-pointer transition-all flex items-center justify-between hover:scale-[1.01] hover:border-slate-300 group"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                          {tmpl.docType}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-red-600">
                        <Download className="w-3.5 h-3.5" />
                        <span>Muat Turun</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedAppForView(null)}
                className="text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all shadow-2xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
