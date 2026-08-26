import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GeneratedDocument } from '../types';
import { X, Download, FileText, CheckCircle2, Shield } from 'lucide-react';
import { downloadAsWordDoc, getEnsuredDocumentContent } from '../utils/docExport';

interface DocumentViewerModalProps {
  document: GeneratedDocument | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ document, onClose }) => {
  const { showToast, applications } = useApp();
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!document) return null;

  // Retrieve matching application to guarantee full document content
  const matchedApp = applications.find(
    (a) => a.applicationId === document.applicationId || a.id === document.applicationId
  );

  const displayHtml = getEnsuredDocumentContent(document, matchedApp);

  const handleDownloadDoc = () => {
    try {
      downloadAsWordDoc(document, matchedApp);
      showToast(`Dokumen berjaya dimuat turun dalam format Microsoft Word (.doc)`, 'success');
    } catch (err) {
      showToast('Gagal memuat turun dokumen.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in duration-150">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-8 h-8 rounded-lg bg-red-600/30 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-sm text-white truncate">
                {document.documentType} ({document.language === 'MS' ? 'Bahasa Melayu' : 'English'})
              </h3>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Ref: {document.applicationId}
              </p>
            </div>
          </div>

          {/* Action Buttons: Keep ONLY download button and close */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              id="btn-doc-download-word"
              onClick={handleDownloadDoc}
              className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition-all"
              title="Muat Turun Dokumen (.doc)"
            >
              <Download className="w-4 h-4" />
              <span>Muat Turun (.doc)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Document Paper Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70">
          <div
            ref={printAreaRef}
            className="print-area max-w-3xl mx-auto bg-white p-8 sm:p-12 shadow-md border border-slate-200 rounded-xl text-slate-900 min-h-[650px]"
          >
            <div
              className="prose prose-sm max-w-none text-slate-800"
              dangerouslySetInnerHTML={{ __html: displayHtml }}
            />

            {/* Official Digital Signature & Verification Footer */}
            <div className="mt-12 pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-500 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-3.5 h-3.5 text-red-600" />
                <span>Dokumen rasmi dijana secara automatik oleh <strong>Sistem iREPRO POLYCC</strong>.</span>
              </div>
              <div className="font-mono">
                Tarikh: {new Date(document.generatedAt || Date.now()).toLocaleString('ms-MY')}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0 no-print">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Format Microsoft Word (.doc) rasmi JPPKK &amp; Kolej Komuniti Beaufort.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
