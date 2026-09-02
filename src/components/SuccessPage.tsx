import React from 'react';
import { useApp } from '../context/AppContext';
import { ApplicationRecord, GeneratedDocument } from '../types';
import { 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  Download, 
  ArrowRight, 
  Building2, 
  Calendar,
  Layers
} from 'lucide-react';
import { getDocumentTemplatesForApplication, generateDocumentHtml } from '../utils/documentTemplates';
import { downloadAsWordDoc, downloadAsPdf } from '../utils/docExport';

interface SuccessPageProps {
  application: ApplicationRecord | null;
  onViewDashboard: () => void;
  onNewApplication: () => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({
  application,
  onViewDashboard,
  onNewApplication,
}) => {
  const { showToast } = useApp();

  if (!application) return null;

  // Retrieve or compute all generated documents for this application
  const docTemplates = getDocumentTemplatesForApplication(application);
  const docsList: GeneratedDocument[] = docTemplates.map((tpl) => {
    const existing = application.generatedDocuments?.find((d) => d.templateKey === tpl.key || d.documentType === tpl.docType);
    const html = (existing?.contentHtml && existing.contentHtml.length > 50 && !existing.contentHtml.includes('Memuatkan'))
      ? existing.contentHtml
      : generateDocumentHtml(tpl.key, application);
    
    return {
      id: existing?.id || `doc-${application.id}-${tpl.key}`,
      applicationId: application.applicationId,
      documentType: tpl.docType,
      templateKey: tpl.key,
      language: application.language || 'MS',
      fileName: tpl.fileName,
      driveUrl: application.driveUrl,
      contentHtml: html,
      generatedAt: application.createdAt || new Date().toISOString(),
    };
  });

  const handleDirectDownload = (doc: GeneratedDocument) => {
    try {
      if (doc.fileName.endsWith('.pdf') || doc.templateKey === 'innovation_certificate') {
        downloadAsPdf(doc, application);
        showToast(`Dokumen ${doc.documentType} berjaya dimuat turun (.pdf)!`, 'success');
      } else {
        downloadAsWordDoc(doc, application);
        showToast(`Dokumen ${doc.documentType} berjaya dimuat turun (.doc)!`, 'success');
      }
    } catch (err) {
      showToast('Gagal memuat turun dokumen.', 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in zoom-in duration-200">
      {/* Top Banner */}
      <div className="bg-emerald-950 text-emerald-50 rounded-2xl p-8 text-center border border-emerald-800 shadow-xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
          Penjanaan Berjaya &amp; Direkodkan
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 mb-2">
          Permohonan Berjaya Disimpan!
        </h1>
        <p className="text-xs sm:text-sm text-emerald-200 max-w-md mx-auto">
          Data telah diselaraskan ke pangkalan data berpusat dan fail dokumen rasmi sedia untuk dimuat turun secara automatik.
        </p>

        {/* Application ID Card */}
        <div className="mt-6 inline-flex items-center space-x-3 bg-slate-900/90 border border-emerald-600/40 rounded-xl px-5 py-2.5">
          <span className="text-xs text-slate-400 font-medium">Application ID:</span>
          <span className="text-base sm:text-lg font-mono font-extrabold text-rose-400 tracking-wider">
            {application.applicationId}
          </span>
        </div>
      </div>

      {/* Generated Documents List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Dokumen Rasmi Yang Dijana</h2>
            <p className="text-xs text-slate-500">
              Format piawai JPPKK ({application.language === 'MS' ? 'Bahasa Melayu' : 'English'}) • Format Microsoft Word (.doc) &amp; PDF (.pdf)
            </p>
          </div>
          <span className="text-xs font-semibold bg-red-50 text-red-700 px-2.5 py-1 rounded-lg border border-red-200">
            {docsList.length} Fail Sedia Dimuat Turun
          </span>
        </div>

        <div className="space-y-2.5">
          {docsList.map((doc, idx) => {
            const isPdf = doc.fileName.endsWith('.pdf') || doc.templateKey === 'innovation_certificate';
            return (
              <div
                key={doc.id || idx}
                onClick={() => handleDirectDownload(doc)}
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-red-50/50 border border-slate-200 rounded-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h3 className="font-bold text-xs text-slate-900 truncate">
                      {doc.documentType}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      {doc.fileName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDirectDownload(doc);
                    }}
                    className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-xs transition-all"
                    title={`Muat Turun ${isPdf ? 'PDF (.pdf)' : 'Microsoft Word (.doc)'}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Muat Turun ({isPdf ? '.pdf' : '.doc'})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          onClick={onNewApplication}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
        >
          + Cipta Permohonan Lain
        </button>

        <button
          onClick={onViewDashboard}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
        >
          <span>Kembali ke Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
