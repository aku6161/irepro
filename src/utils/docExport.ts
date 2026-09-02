import { GeneratedDocument, ApplicationRecord } from '../types';
import { generateDocumentHtml, getDocumentTemplatesForApplication } from './documentTemplates';

export function getEnsuredDocumentContent(doc: GeneratedDocument, app?: ApplicationRecord): string {
  return doc.contentHtml || '<p>Dokumen tidak mengandungi data.</p>';
}


/**
 * Export document content as a standardized Microsoft Word (.doc) file
 * Compatible with Microsoft Word, LibreOffice, WPS Office, and Google Docs
 */
export async function downloadAsWordDoc(doc: GeneratedDocument, app?: ApplicationRecord) {
  if (!doc.applicationId) {
    alert("Error: Tiada applicationId untuk menjana dokumen.");
    return;
  }

  try {
    const res = await fetch('/api/documents/generate-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateKey: doc.templateKey,
        applicationId: doc.applicationId
      })
    });

    const contentType = res.headers.get('content-type') || '';
    
    if (res.ok) {
      if (contentType.includes('application/json')) {
        const data = await res.json();
        throw new Error(data.error || "Ralat semasa menjana dokumen di server.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      
      const baseFileName = (doc.fileName || `${doc.applicationId}_${doc.documentType}`)
        .replace(/\.pdf$/i, '')
        .replace(/\.html$/i, '')
        .replace(/\.docx$/i, '')
        .replace(/\.doc$/i, '');
      
      link.download = `${baseFileName}.docx`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      let errMsg = "Ralat semasa menjana dokumen di server.";
      try {
        const data = await res.json();
        errMsg = data.error || errMsg;
      } catch (e) {
        errMsg = `Server error HTTP ${res.status}`;
      }
      throw new Error(errMsg);
    }
  } catch (err: any) {
    console.error('[Doc Export] Document generation failed:', err);
    alert(`Gagal Menjana Dokumen:\n\n${err.message}`);
  }
}

export async function downloadAsPdf(doc: GeneratedDocument, app?: ApplicationRecord) {
  if (!doc.applicationId) {
    alert("Error: Tiada applicationId untuk menjana dokumen.");
    return;
  }

  try {
    const res = await fetch('/api/documents/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateKey: doc.templateKey,
        applicationId: doc.applicationId
      })
    });

    const contentType = res.headers.get('content-type') || '';
    
    if (res.ok) {
      if (contentType.includes('application/json')) {
        const data = await res.json();
        throw new Error(data.error || "Ralat semasa menjana PDF di server.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      
      const baseFileName = (doc.fileName || `${doc.applicationId}_${doc.documentType}`)
        .replace(/\.pdf$/i, '')
        .replace(/\.pptx$/i, '')
        .replace(/\.html$/i, '')
        .replace(/\.docx$/i, '')
        .replace(/\.doc$/i, '');
      
      const ext = contentType.includes('presentation') || contentType.includes('pptx') ? '.pptx' : '.pdf';
      link.download = `${baseFileName}${ext}`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      let errMsg = "Ralat semasa menjana PDF di server.";
      try {
        const data = await res.json();
        errMsg = data.error || errMsg;
      } catch (e) {
        errMsg = `Server error HTTP ${res.status}`;
      }
      throw new Error(errMsg);
    }
  } catch (err: any) {
    console.error('[Doc Export] PDF generation failed:', err);
    alert(`Gagal Menjana PDF:\n\n${err.message}`);
  }
}

/**
 * Directly download a specific document type for an application as a .doc or .pdf file without opening any preview
 */
export function downloadDocumentByKeyword(app: ApplicationRecord, docTypeKeyword: string): { docType: string; fileName: string } {
  // Check if doc already exists in app.generatedDocuments with valid content
  const existingDoc = app.generatedDocuments?.find((d) =>
    d.documentType.toLowerCase().includes(docTypeKeyword.toLowerCase()) ||
    d.templateKey.toLowerCase().includes(docTypeKeyword.toLowerCase())
  );

  // Get matching template config from registered official templates
  const allTemplates = getDocumentTemplatesForApplication(app);
  const matchedTemplate = allTemplates.find((t) =>
    t.docType.toLowerCase().includes(docTypeKeyword.toLowerCase()) ||
    t.key.toLowerCase().includes(docTypeKeyword.toLowerCase())
  ) || allTemplates[0];

  const targetTemplateKey = matchedTemplate 
    ? matchedTemplate.key 
    : (existingDoc?.templateKey || (app.applicationType === 'INOVASI' ? 'innovation_ms_proposal' : 'research_cat1_ms_proposal'));
    
  const targetDocType = matchedTemplate 
    ? matchedTemplate.docType 
    : (existingDoc?.documentType || (app.applicationType === 'INOVASI' ? 'Kertas Cadangan Inovasi' : 'Kertas Cadangan Penyelidikan'));
    
  const isPdf = matchedTemplate?.fileName.endsWith('.pdf') || targetTemplateKey === 'innovation_certificate';

  const targetFileName = matchedTemplate 
    ? matchedTemplate.fileName 
    : `${app.applicationId}_${targetDocType.replace(/\s+/g, '_')}.${isPdf ? 'pdf' : 'doc'}`;

  // Always generate fresh, accurate document HTML using application record
  const generatedHtml = generateDocumentHtml(targetTemplateKey, app);

  const docToDownload: GeneratedDocument = {
    id: existingDoc?.id || `doc-${app.id}-${targetTemplateKey}`,
    applicationId: app.applicationId,
    documentType: targetDocType,
    templateKey: targetTemplateKey,
    language: app.language || 'MS',
    fileName: targetFileName,
    driveUrl: app.driveUrl,
    contentHtml: generatedHtml,
    generatedAt: app.createdAt || new Date().toISOString(),
  };

  if (isPdf) {
    downloadAsPdf(docToDownload, app);
  } else {
    downloadAsWordDoc(docToDownload, app);
  }

  return {
    docType: targetDocType,
    fileName: targetFileName,
  };
}

/**
 * Directly download a specific template key for an application as a .doc or .pdf file
 */
export function downloadDocumentByTemplateKey(app: ApplicationRecord, templateKey: string): { docType: string; fileName: string } {
  const allTemplates = getDocumentTemplatesForApplication(app);
  const matchedTemplate = allTemplates.find((t) => t.key === templateKey);

  const targetDocType = matchedTemplate ? matchedTemplate.docType : 'Dokumen';
  const isPdf = matchedTemplate?.fileName.endsWith('.pdf') || templateKey === 'innovation_certificate';

  const targetFileName = matchedTemplate 
    ? matchedTemplate.fileName 
    : `${app.applicationId}_${templateKey}.${isPdf ? 'pdf' : 'doc'}`;

  const generatedHtml = generateDocumentHtml(templateKey, app);

  const docToDownload: GeneratedDocument = {
    id: `doc-${app.id}-${templateKey}`,
    applicationId: app.applicationId,
    documentType: targetDocType,
    templateKey: templateKey,
    language: app.language || 'MS',
    fileName: targetFileName,
    driveUrl: app.driveUrl,
    contentHtml: generatedHtml,
    generatedAt: app.createdAt || new Date().toISOString(),
  };

  if (isPdf) {
    downloadAsPdf(docToDownload, app);
  } else {
    downloadAsWordDoc(docToDownload, app);
  }

  return {
    docType: targetDocType,
    fileName: targetFileName,
  };
}

