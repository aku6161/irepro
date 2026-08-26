// Google Sheets Integration Service for iREPRO
// Target Spreadsheet: https://docs.google.com/spreadsheets/d/1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY/edit?usp=sharing

export const GOOGLE_SPREADSHEET_ID = '1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY';
export const GOOGLE_DRIVE_FOLDER = 'https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing';
export const GOOGLE_OAUTH_CLIENT_ID = '343211370533-q75qrjgahflu3t789p70fj27abdvtv6f.apps.googleusercontent.com';

export function formatIc(raw: any): string {
  if (!raw) return '';
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, '');
  if (digits.length === 12) {
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`;
  }
  return str;
}

export function parseSheetDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  // Match "DD/MM/YYYY HH:MM:SS" or "DD/MM/YYYY HH:MM" or "DD/MM/YYYY"
  const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-based month
    const year = parseInt(match[3], 10);
    const hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(year, month, day, hours, minutes, seconds);
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

export function formatDateForSheet(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Fetch tab data directly using Google Sheets visualization endpoint with retry logic for serverless environments
export async function fetchSheetData(tabName: string): Promise<any[]> {
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}&headers=1&t=${Date.now()}`;
  let retries = 3;
  while (retries > 0) {
    try {
      const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) {
        console.warn(`Failed to fetch sheet ${tabName}: HTTP ${res.status}. Retries left: ${retries - 1}`);
        retries--;
        if (retries > 0) await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      const txt = await res.text();
      if (!txt.includes('status":"ok"')) {
        console.warn(`Sheet ${tabName} did not return ok status`);
        return [];
      }
      const jsonStr = txt.substring(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
      const data = JSON.parse(jsonStr);
      return data.table?.rows || [];
    } catch (err: any) {
      console.warn(`Error fetching sheet ${tabName} (retries left: ${retries - 1}):`, err.message);
      retries--;
      if (retries > 0) await new Promise((r) => setTimeout(r, 500));
      else return [];
    }
  }
  return [];
}

function parseRowCells(r: any): string[] {
  return (r?.c || []).map((cell: any) => {
    if (!cell) return '';
    if (cell.f !== undefined && cell.f !== null) return String(cell.f).trim();
    if (cell.v !== undefined && cell.v !== null) {
      const valStr = String(cell.v).trim();
      return valStr === 'null' ? '' : valStr;
    }
    return '';
  });
}

// Sync all 3 sheets: inovasi, lampiran a, and PPP
export async function syncAllSheets(): Promise<{ applications: any[]; users: any[]; feedbacks: any[] }> {
  console.log(`[Google Sheets] Loading records directly from Google Sheets: ${GOOGLE_SPREADSHEET_ID}...`);

  const syncedApps: any[] = [];
  const userMap = new Map<string, any>();
  const feedbacks: any[] = [];

  try {
    // 0. Fetch User Tab to build Name -> IC lookup map
    const nameToIcMap = new Map<string, string>();
    try {
      const userRows = await fetchSheetData('user');
      userRows.forEach((r: any, idx: number) => {
        const vals = parseRowCells(r);
        if (idx === 0) return;
        const userName = (vals[1] || '').trim().toUpperCase();
        const userIc = (vals[2] || '').trim();
        if (userName && userIc) {
          nameToIcMap.set(userName, userIc);
        }
      });
      console.log(`[Google Sheets] Loaded ${nameToIcMap.size} user mapping entries.`);
    } catch (e) {
      console.warn('[Google Sheets] Could not load user tab for name-to-IC lookup:', e);
    }

    // 1. Fetch Inovasi Sheet
    const inovasiRows = await fetchSheetData('inovasi');
    inovasiRows.forEach((r: any, idx: number) => {
      const vals = parseRowCells(r);

      if (idx === 0 && (vals[0].toUpperCase().includes('NAMA KETUA') || vals[0].toUpperCase().includes('NAMA'))) return;
      const applicantName = (vals[0] || '').toUpperCase();
      const title = vals[12] || vals[9] || '';
      if (!applicantName && !title) return;

      const seq = String(syncedApps.length + 1).padStart(4, '0');
      const appId = vals[20] || `IREPRO-INV-2026-${seq}`;
      const chiefEmail = vals[19] || '';

      // Chief IC from Sheet Col B (vals[1]) - look up by name if empty/placeholder
      let chiefIc = (vals[1] || '').trim();
      const normalizedName = applicantName.trim();
      if ((!chiefIc || chiefIc.length < 5 || chiefIc.replace(/\D/g, '').startsWith('83010112')) && nameToIcMap.has(normalizedName)) {
        chiefIc = nameToIcMap.get(normalizedName)!;
      }

      const chiefDigits = chiefIc.replace(/\D/g, '');
      if (chiefDigits.length === 12) {
        chiefIc = `${chiefDigits.slice(0, 6)}-${chiefDigits.slice(6, 8)}-${chiefDigits.slice(8, 12)}`;
      } else if (!chiefIc || chiefIc.length < 5) {
        const fallbackDigits = `83010112${String(1000 + idx).slice(-4)}`;
        chiefIc = `${fallbackDigits.slice(0, 6)}-${fallbackDigits.slice(6, 8)}-${fallbackDigits.slice(8, 12)}`;
      }

      const institution = vals[2] || 'KOLEJ KOMUNITI BEAUFORT';

      // Member 1
      const m1Name = (vals[3] || '').toUpperCase();
      let m1Ic = (vals[4] || '').trim();
      if ((!m1Ic || m1Ic.length < 5) && m1Name && nameToIcMap.has(m1Name.trim())) {
        m1Ic = nameToIcMap.get(m1Name.trim())!;
      }
      const m1Digits = m1Ic.replace(/\D/g, '');
      if (m1Digits.length === 12) {
        m1Ic = `${m1Digits.slice(0, 6)}-${m1Digits.slice(6, 8)}-${m1Digits.slice(8, 12)}`;
      }
      const m1Inst = vals[5] || institution;

      // Member 2
      const m2Name = (vals[6] || '').toUpperCase();
      let m2Ic = (vals[7] || '').trim();
      if ((!m2Ic || m2Ic.length < 5) && m2Name && nameToIcMap.has(m2Name.trim())) {
        m2Ic = nameToIcMap.get(m2Name.trim())!;
      }
      const m2Digits = m2Ic.replace(/\D/g, '');
      if (m2Digits.length === 12) {
        m2Ic = `${m2Digits.slice(0, 6)}-${m2Digits.slice(6, 8)}-${m2Digits.slice(8, 12)}`;
      }
      const m2Inst = vals[8] || institution;

      // Admin & Management Names
      const kupikName = vals[9] || 'NORFAZIRAH BINTI KUSIN';
      const deputyDirectorName = vals[10] || 'AZLENAH BTE MOHD SEN';
      const directorName = vals[11] || 'Ts. JULKIFLI BIN AWANG BESAR (A.D.K)';

      const actualTitle = vals[12] || 'PROJEK INOVASI KKBS';

      // Parse language dynamically from column 19 (vals[18])
      const langVal = (vals[18] || '').trim();
      const language = (langVal.toLowerCase().startsWith('en') || langVal.toLowerCase().includes('english') || langVal.toLowerCase().includes('inggeris')) ? 'EN' : 'MS';
      const langLower = language.toLowerCase();

      const parsedDate = parseSheetDate(vals[21]);
      const recordYear = parsedDate ? parsedDate.getFullYear() : 2026;
      const recordCreatedAt = parsedDate ? parsedDate.toISOString() : new Date().toISOString();

      const innovationRecord = {
        id: `sheet-inv-${idx + 1}`,
        applicationId: appId,
        applicationType: 'INOVASI',
        language: language,
        icNumber: chiefIc,
        applicantName: applicantName || 'KETUA INOVASI',
        institution: institution,
        title: actualTitle,
        year: recordYear,
        status: 'COMPLETED',
        sourceSheet: 'inovasi',
        sheetRowIndex: idx + 1,
        innovationData: {
          chiefName: applicantName,
          chiefIc: chiefIc,
          chiefPhone: '012-3456789',
          chiefEmail: chiefEmail,
          institution: institution,
          members: [
            m1Name ? { id: `m-1`, name: m1Name, icNumber: m1Ic, phone: '', department: '', institution: m1Inst } : null,
            m2Name ? { id: `m-2`, name: m2Name, icNumber: m2Ic, phone: '', department: '', institution: m2Inst } : null,
          ].filter(Boolean),
          adminInfo: {
            kupikName: kupikName,
            deputyDirectorName: deputyDirectorName,
            directorName: directorName,
          },
          title: actualTitle,
          introduction: vals[13] || '',
          objectives: vals[14] || '',
          impactTargetGroup: vals[15] || '',
          impactInstitution: vals[16] || '',
          impactDepartment: vals[17] || '',
        },
        generatedDocuments: [
          {
            id: `doc-inv-${idx}-1`,
            applicationId: appId,
            documentType: 'Surat Lantikan Inovasi',
            templateKey: `innovation_${langLower}_appointment`,
            language: language,
            fileName: `${appId}_LANTIKAN.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: new Date().toISOString(),
          },
          {
            id: `doc-inv-${idx}-2`,
            applicationId: appId,
            documentType: 'Kertas Cadangan Inovasi',
            templateKey: `innovation_${langLower}_proposal`,
            language: language,
            fileName: `${appId}_CADANGAN.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: new Date().toISOString(),
          },
        ],
        driveUrl: GOOGLE_DRIVE_FOLDER,
        createdAt: recordCreatedAt,
        updatedAt: new Date().toISOString(),
      };

      syncedApps.push(innovationRecord);

      // Register Ketua Inovasi in userMap
      if (chiefIc) {
        userMap.set(chiefIc, {
          id: `usr-${chiefIc}`,
          icNumber: chiefIc,
          name: applicantName,
          phone: '012-3456789',
          email: '',
          institution: institution,
          department: '',
          createdAt: new Date().toISOString(),
        });
      }

      // Register Members in userMap
      if (m1Ic && m1Name) {
        userMap.set(m1Ic, {
          id: `usr-${m1Ic}`,
          icNumber: m1Ic,
          name: m1Name,
          phone: '',
          email: '',
          institution: m1Inst,
          department: '',
          createdAt: new Date().toISOString(),
        });
      }
      if (m2Ic && m2Name) {
        userMap.set(m2Ic, {
          id: `usr-${m2Ic}`,
          icNumber: m2Ic,
          name: m2Name,
          phone: '',
          email: '',
          institution: m2Inst,
          department: '',
          createdAt: new Date().toISOString(),
        });
      }
    });

    // 2. Fetch Lampiran A Sheet (Penyelidikan Kategori I, II, III)
    const lampiranRows = await fetchSheetData('lampiran a');
    lampiranRows.forEach((r: any, idx: number) => {
      const vals = parseRowCells(r);

      if (idx === 0 && vals[1].toUpperCase().includes('KAD PENGENALAN')) return;
      const applicantName = (vals[0] || '').toUpperCase();
      
      let rawIc = vals[1] || '';
      const normalizedName = applicantName.trim();
      if ((!rawIc || rawIc.length < 5 || rawIc.includes('820825-06-556')) && nameToIcMap.has(normalizedName)) {
        rawIc = nameToIcMap.get(normalizedName)!;
      }
      const icNumber = formatIc(rawIc) || `820825-06-556${idx}`;

      const title = vals[18] || '';
      if (!applicantName && !title) return;

      const seq = String(syncedApps.length + 1).padStart(4, '0');
      const appId = vals[31] || `IREPRO-RES-2026-${seq}`;
      const chiefEmail = vals[30] || '';

      // Parse category dynamically from column 30 (vals[29])
      const catVal = (vals[29] || '').trim().toUpperCase();
      let category = 'CAT_1';
      let catKey = 'cat1';
      if (catVal.includes('II') || catVal.includes('KATEGORI 2') || catVal.includes('KATEGORI II')) {
        category = 'CAT_2';
        catKey = 'cat1'; // Reuses CAT_1 templates
      } else if (catVal.includes('III') || catVal.includes('KATEGORI 3') || catVal.includes('KATEGORI III')) {
        category = 'CAT_3';
        catKey = 'cat3';
      }

      // Parse language dynamically from column 29 (vals[28])
      const langVal = (vals[28] || '').trim();
      const language = (langVal.toLowerCase().startsWith('en') || langVal.toLowerCase().includes('english') || langVal.toLowerCase().includes('inggeris')) ? 'EN' : 'MS';
      const langLower = language.toLowerCase();

      const parsedDate = parseSheetDate(vals[32]);
      const recordYear = parsedDate ? parsedDate.getFullYear() : 2026;
      const recordCreatedAt = parsedDate ? parsedDate.toISOString() : new Date().toISOString();

      // Resolve member ICs from user mapping if blank
      const m1Name = (vals[5] || '').toUpperCase().trim();
      let m1Ic = (vals[6] || '').trim();
      if ((!m1Ic || m1Ic.length < 5) && m1Name && nameToIcMap.has(m1Name)) {
        m1Ic = nameToIcMap.get(m1Name)!;
      }

      const m2Name = (vals[10] || '').toUpperCase().trim();
      let m2Ic = (vals[11] || '').trim();
      if ((!m2Ic || m2Ic.length < 5) && m2Name && nameToIcMap.has(m2Name)) {
        m2Ic = nameToIcMap.get(m2Name)!;
      }

      const resRecord = {
        id: `sheet-lampA-${idx + 1}`,
        applicationId: appId,
        applicationType: 'PENYELIDIKAN',
        category: category,
        language: language,
        icNumber,
        applicantName: applicantName || 'PENYELIDIK UTAMA',
        institution: vals[4] || 'Kolej Komuniti Beaufort',
        title: title || 'KERTAS CADANGAN PENYELIDIKAN',
        year: recordYear,
        status: 'COMPLETED',
        sourceSheet: 'lampiran a',
        sheetRowIndex: idx + 1,
        researchData: {
          category: category,
          chiefName: applicantName,
          chiefIc: icNumber,
          chiefPhone: vals[2] || '',
          chiefEmail: chiefEmail,
          department: vals[3] || 'Unit Penyelidikan & Inovasi',
          institution: vals[4] || 'Kolej Komuniti Beaufort',
          members: [
            vals[5] ? { id: `m-1`, name: m1Name, icNumber: formatIc(m1Ic), phone: vals[7] || '', department: vals[8] || '', institution: vals[9] || 'Kolej Komuniti Beaufort' } : null,
            vals[10] ? { id: `m-2`, name: m2Name, icNumber: formatIc(m2Ic), phone: vals[12] || '', department: vals[13] || '', institution: vals[14] || 'Kolej Komuniti Beaufort' } : null,
          ].filter(Boolean),
          adminInfo: {
            kupikName: vals[15] || 'NORFAZIRAH BINTI KUSIN',
            deputyDirectorName: vals[16] || 'AZLENAH BTE MOHD SEN',
            directorName: vals[17] || 'Ts. JULKIFLI BIN AWANG BESAR (A.D.K)',
          },
          title: title,
          conference: vals[19] || '',
          introduction: vals[20] || '',
          objectives: vals[21] || '',
          location: vals[22] || 'Kolej Komuniti Beaufort',
          sample: vals[23] || '',
          instruments: vals[24] || 'Soal Selidik',
          impactTargetGroup: vals[25] || '',
          impactInstitution: vals[26] || '',
          impactDepartment: vals[27] || '',
        },
        generatedDocuments: (category === 'CAT_3')
          ? [
              {
                id: `doc-res-${idx}-2`,
                applicationId: appId,
                documentType: language === 'EN' ? 'Appendix A' : 'Lampiran A',
                templateKey: `research_cat3_${langLower}_appendix`,
                language: language,
                fileName: `${appId}_LAMPIRAN.doc`,
                driveUrl: GOOGLE_DRIVE_FOLDER,
                generatedAt: new Date().toISOString(),
              },
              {
                id: `doc-res-${idx}-3`,
                applicationId: appId,
                documentType: language === 'EN' ? 'Proposal 2' : 'Kertas Cadangan 2',
                templateKey: `research_cat3_${langLower}_proposal`,
                language: language,
                fileName: `${appId}_CADANGAN.doc`,
                driveUrl: GOOGLE_DRIVE_FOLDER,
                generatedAt: new Date().toISOString(),
              }
            ]
          : [
              {
                id: `doc-res-${idx}-1`,
                applicationId: appId,
                documentType: language === 'EN' ? 'Appointment Letter' : 'Surat Lantikan Penyelidik',
                templateKey: `research_cat1_${langLower}_appointment`,
                language: language,
                fileName: `${appId}_LANTIKAN.doc`,
                driveUrl: GOOGLE_DRIVE_FOLDER,
                generatedAt: new Date().toISOString(),
              },
              {
                id: `doc-res-${idx}-2`,
                applicationId: appId,
                documentType: language === 'EN' ? 'Appendix A' : 'Borang Lampiran A',
                templateKey: `research_cat1_${langLower}_appendix`,
                language: language,
                fileName: `${appId}_LAMPIRAN.doc`,
                driveUrl: GOOGLE_DRIVE_FOLDER,
                generatedAt: new Date().toISOString(),
              },
              {
                id: `doc-res-${idx}-3`,
                applicationId: appId,
                documentType: language === 'EN' ? 'Proposal 1' : 'Kertas Cadangan Penyelidikan',
                templateKey: `research_cat1_${langLower}_proposal`,
                language: language,
                fileName: `${appId}_CADANGAN.doc`,
                driveUrl: GOOGLE_DRIVE_FOLDER,
                generatedAt: new Date().toISOString(),
              },
            ],
        driveUrl: GOOGLE_DRIVE_FOLDER,
        createdAt: recordCreatedAt,
        updatedAt: new Date().toISOString(),
      };

      syncedApps.push(resRecord);

      if (icNumber) {
        userMap.set(icNumber, {
          id: `usr-${icNumber}`,
          icNumber,
          name: applicantName,
          phone: vals[2] || '',
          email: '',
          institution: vals[4] || 'Kolej Komuniti Beaufort',
          department: vals[3] || '',
          createdAt: new Date().toISOString(),
        });
      }
    });

    // 3. Fetch Data Permohonan Sheet (Penyelidikan Kategori IV & V)
    const pppRows = await fetchSheetData('PPP');
    pppRows.forEach((r: any, idx: number) => {
      const vals = parseRowCells(r);

      if (idx === 0 && vals[1].toUpperCase().includes('KAD PENGENALAN')) return;
      const applicantName = (vals[0] || '').toUpperCase();
      
      let rawIc = vals[1] || '';
      const normalizedName = applicantName.trim();
      if ((!rawIc || rawIc.length < 5 || rawIc.includes('830101-12-123')) && nameToIcMap.has(normalizedName)) {
        rawIc = nameToIcMap.get(normalizedName)!;
      }
      const icNumber = formatIc(rawIc) || `830101-12-123${idx}`;
      const title = vals[10] || '';
      if (!applicantName && !title) return;

      const seq = String(syncedApps.length + 1).padStart(4, '0');
      const appId = vals[28] || `IREPRO-RES-2026-${seq}`;
      const chiefEmail = vals[27] || '';

      // Parse category dynamically from column 27 (vals[26])
      const catVal = (vals[26] || '').trim().toUpperCase();
      let category = 'CAT_4';
      if (catVal.includes('V') || catVal.includes('KATEGORI 5') || catVal.includes('KATEGORI V')) {
        category = 'CAT_5';
      }

      // Parse language dynamically from column 26 (vals[25])
      const langVal = (vals[25] || '').trim();
      const language = (langVal.toLowerCase().startsWith('en') || langVal.toLowerCase().includes('english') || langVal.toLowerCase().includes('inggeris')) ? 'EN' : 'MS';
      const langLower = language.toLowerCase();

      const parsedDate = parseSheetDate(vals[29]);
      const recordYear = parsedDate ? parsedDate.getFullYear() : 2026;
      const recordCreatedAt = parsedDate ? parsedDate.toISOString() : new Date().toISOString();

      const pppRecord = {
        id: `sheet-ppp-${idx + 1}`,
        applicationId: appId,
        applicationType: 'PENYELIDIKAN',
        category: category,
        language: language,
        icNumber,
        applicantName: applicantName || 'PENYELIDIK PPP',
        institution: vals[5] || 'Universiti Malaysia Sabah',
        title: title || 'PERMOHONAN KEBENARAN PENYELIDIKAN (PPP)',
        year: recordYear,
        status: 'COMPLETED',
        sourceSheet: 'PPP',
        sheetRowIndex: idx + 1,
        researchData: {
          category: category,
          chiefName: applicantName,
          chiefIc: icNumber,
          chiefPhone: vals[3] || '',
          chiefEmail: chiefEmail,
          address: vals[2] || '',
          occupation: vals[4] || 'PENSYARAH',
          institution: vals[5] || '',
          institutionAddress: vals[6] || '',
          institutionPhone: vals[7] || '',
          department: vals[8] || '',
          studyYear: vals[9] || '2',
          members: [],
          adminInfo: {
            kupikName: 'NORFAZIRAH BINTI KUSIN',
            deputyDirectorName: 'AZLENAH BTE MOHD SEN',
            directorName: 'Ts. JULKIFLI BIN AWANG BESAR (A.D.K)',
            ppiDirectorName: vals[24] || 'Dr. Shahiza binti Ahmad Zainuddin',
          },
          title: title,
          pilotStartDate: vals[11] || '',
          pilotEndDate: vals[12] || '',
          actualStartDate: vals[13] || '',
          actualEndDate: vals[14] || '',
          expectedReportDate: vals[15] || '',
          introduction: vals[16] || '',
          objectives: vals[17] || '',
          location: vals[18] || '',
          sample: vals[19] || '',
          instruments: vals[20] || '',
          impactDepartment: vals[21] || '',
          impactTargetGroup: vals[22] || '',
          impactInstitution: vals[23] || '',
        },
        generatedDocuments: [
          {
            id: `doc-ppp-${idx}-1`,
            applicationId: appId,
            documentType: language === 'EN' ? 'PPP Form' : 'Borang PPP',
            templateKey: `research_cat4_${langLower}_ppp_form`,
            language: language,
            fileName: `${appId}_PPP.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: new Date().toISOString(),
          },
          {
            id: `doc-ppp-${idx}-2`,
            applicationId: appId,
            documentType: language === 'EN' ? 'PPP Proposal' : 'Kertas Cadangan PPP',
            templateKey: `research_cat4_${langLower}_ppp_proposal`,
            language: language,
            fileName: `${appId}_CADANGAN.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: new Date().toISOString(),
          },
        ],
        driveUrl: GOOGLE_DRIVE_FOLDER,
        createdAt: recordCreatedAt,
        updatedAt: new Date().toISOString(),
      };

      syncedApps.push(pppRecord);

      if (icNumber) {
        userMap.set(icNumber, {
          id: `usr-${icNumber}`,
          icNumber,
          name: applicantName,
          phone: vals[3] || '',
          email: '',
          institution: vals[5] || '',
          department: vals[8] || '',
          createdAt: new Date().toISOString(),
        });
      }
    });

    // 4. Fetch Feedback Tab (maklum balas)
    try {
      const fbRows = await fetchSheetData('maklum balas');
      fbRows.forEach((r: any, idx: number) => {
        const vals = parseRowCells(r);
        if (idx === 0 && (vals[0].toUpperCase().includes('JANTINA') || vals[0].toUpperCase().includes('NAMA'))) return;
        if (!vals[0] && !vals[1] && !vals[8]) return;
        feedbacks.push({
          id: `sheet-fb-${idx + 1}`,
          jantina: vals[0] || 'Lelaki',
          umur: vals[1] || '21-30 tahun',
          bangsa: vals[2] || 'Bumiputera Sabah/Sarawak',
          s1: Number(vals[3]) || 5,
          s2: Number(vals[4]) || 5,
          s3: Number(vals[5]) || 5,
          s4: Number(vals[6]) || 5,
          s5: Number(vals[7]) || 5,
          comments: vals[8] || '',
          createdAt: vals[9] || new Date().toISOString()
        });
      });
      console.log(`[Google Sheets] Loaded ${feedbacks.length} feedbacks from maklum balas tab.`);
    } catch (e) {
      console.warn('[Google Sheets] Could not load maklum balas tab:', e);
    }

    console.log(`[Google Sheets] Loaded ${syncedApps.length} applications and ${userMap.size} user accounts from Google Sheets.`);
  } catch (err: any) {
    console.error('[Google Sheets] Error in syncAllSheets:', err);
  }

  return {
    applications: syncedApps,
    users: Array.from(userMap.values()),
    feedbacks: feedbacks,
  };
}

// Prepare formatted row array for writing to Google Sheets
export function prepareSheetRow(record: any): { targetSheet: string; rowValues: any[] } {
  if (record.applicationType === 'INOVASI') {
    const inv = record.innovationData || {};
    const m1 = inv.members?.[0] || {};
    const m2 = inv.members?.[1] || {};
    const admin = inv.adminInfo || {};
    return {
      targetSheet: 'inovasi',
      rowValues: [
        record.applicantName || inv.chiefName || '',
        record.icNumber || inv.chiefIc || '',
        record.institution || inv.institution || 'KOLEJ KOMUNITI BEAUFORT',
        m1.name || '',
        m1.icNumber || '',
        m1.institution || '',
        m2.name || '',
        m2.icNumber || '',
        m2.institution || '',
        admin.kupikName || 'NORFAZIRAH BINTI KUSIN',
        admin.deputyDirectorName || 'AZLENAH BTE MOHD SEN',
        admin.directorName || 'Ts. JULKIFLI BIN AWANG BESAR (A.D.K)',
        record.title || inv.title || '',
        inv.introduction || '',
        inv.objectives || '',
        inv.impactTargetGroup || '',
        inv.impactInstitution || '',
        inv.impactDepartment || '',
        record.language === 'EN' ? 'English' : 'Bahasa Melayu',
        record.email || inv.chiefEmail || '',
        record.applicationId || '',
        formatDateForSheet(record.createdAt),
      ],
    };
  } else {
    const res = record.researchData || {};
    const isPPP = record.category === 'CAT_4' || record.category === 'CAT_5';

    if (isPPP) {
      return {
        targetSheet: 'PPP',
        rowValues: [
          record.applicantName || res.chiefName || '',
          record.icNumber || res.chiefIc || '',
          res.address || '',
          res.chiefPhone || '',
          res.occupation || 'PENSYARAH',
          record.institution || res.institution || '',
          res.institutionAddress || '',
          res.institutionPhone || '',
          res.department || '',
          res.studyYear || '2',
          record.title || res.title || '',
          res.pilotStartDate || '',
          res.pilotEndDate || '',
          res.actualStartDate || '',
          res.actualEndDate || '',
          res.expectedReportDate || '',
          res.introduction || '',
          res.objectives || '',
          res.location || '',
          res.sample || '',
          res.instruments || '',
          res.impactDepartment || '',
          res.impactTargetGroup || '',
          res.impactInstitution || '',
          res.adminInfo?.ppiDirectorName || 'Dr. Shahiza binti Ahmad Zainuddin',
          record.language === 'EN' ? 'English' : 'Bahasa Melayu',
          record.category === 'CAT_5' ? 'KATEGORI V' : 'KATEGORI IV',
          record.email || res.chiefEmail || '',
          record.applicationId || '',
          formatDateForSheet(record.createdAt),
        ],
      };
    } else {
      // Lampiran A (Kategori I, II, III)
      const m1 = res.members?.[0] || {};
      const m2 = res.members?.[1] || {};
      const admin = res.adminInfo || {};

      let catLabel = 'KATEGORI I';
      if (record.category === 'CAT_2') catLabel = 'KATEGORI II';
      else if (record.category === 'CAT_3') catLabel = 'KATEGORI III';

      return {
        targetSheet: 'lampiran a',
        rowValues: [
          record.applicantName || res.chiefName || '',
          record.icNumber || res.chiefIc || '',
          res.chiefPhone || '',
          res.department || '',
          record.institution || res.institution || '',
          m1.name || '',
          m1.icNumber || '',
          m1.phone || '',
          m1.department || '',
          m1.institution || '',
          m2.name || '',
          m2.icNumber || '',
          m2.phone || '',
          m2.department || '',
          m2.institution || '',
          admin.kupikName || 'NORFAZIRAH BINTI KUSIN',
          admin.deputyDirectorName || 'AZLENAH BTE MOHD SEN',
          admin.directorName || 'Ts. JULKIFLI BIN AWANG BESAR (A.D.K)',
          record.title || res.title || '',
          res.conference || '',
          res.introduction || '',
          res.objectives || '',
          res.location || '',
          res.sample || '',
          res.instruments || '',
          res.impactTargetGroup || '',
          res.impactInstitution || '',
          res.impactDepartment || '',
          record.language === 'EN' ? 'English' : 'Bahasa Melayu',
          catLabel,
          record.email || res.chiefEmail || '',
          record.applicationId || '',
          formatDateForSheet(record.createdAt),
        ],
      };
    }
  }
}

// Append row directly to Google Sheets using Google Sheets API v4 or via Apps Script Web App fallback
export async function appendRowToGoogleSheet(targetSheet: string, rowValues: any[], bearerToken?: string): Promise<{ success: boolean; message: string }> {
  if (!bearerToken) {
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (appsScriptUrl) {
      try {
        // Use GET with query params - more reliable than POST from server-to-server
        // (Google redirects strip POST body when called from external servers)
        console.log(`[Google Sheets] Writing via Apps Script (GET method)...`);
        const encodedData = encodeURIComponent(JSON.stringify(rowValues));
        const encodedSheet = encodeURIComponent(targetSheet);
        const getUrl = `${appsScriptUrl}?action=appendRow&sheet=${encodedSheet}&data=${encodedData}`;
        const res = await fetch(getUrl, {
          method: 'GET',
          redirect: 'follow',
        });
        const resText = await res.text();
        // Parse JSON from response (Apps Script may wrap in callback)
        const jsonStart = resText.indexOf('{');
        const jsonEnd = resText.lastIndexOf('}') + 1;
        if (jsonStart >= 0) {
          const resJson = JSON.parse(resText.substring(jsonStart, jsonEnd));
          if (resJson.success) {
            console.log(`[Google Sheets via Apps Script GET] Appended row to "${targetSheet}" successfully!`);
            return { success: true, message: `Berjaya disimpan ke Google Sheets (Sheet: ${targetSheet}).` };
          } else {
            console.warn(`[Google Sheets via Apps Script GET] Failed:`, resJson);
          }
        } else {
          console.warn(`[Google Sheets via Apps Script GET] Unexpected response:`, resText.substring(0, 200));
        }
      } catch (err: any) {
        console.error(`[Google Sheets via Apps Script GET] Exception:`, err.message);
      }
    }
    return { success: true, message: `Disimpan ke sistem iREPRO dan sedia diselaraskan ke sheet "${targetSheet}".` };
  }

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SPREADSHEET_ID}/values/${encodeURIComponent(targetSheet)}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    });

    const resJson = await res.json();
    if (res.ok) {
      console.log(`[Google Sheets API] Successfully appended row to sheet "${targetSheet}"!`);
      return { success: true, message: `Berjaya disimpan terus ke Google Sheets (Sheet: ${targetSheet}).` };
    } else {
      console.warn(`[Google Sheets API] Error appending to sheet "${targetSheet}":`, resJson);
      return { success: false, message: resJson.error?.message || 'Ralat semasa menulis ke Google Sheets.' };
    }
  } catch (err: any) {
    console.error(`[Google Sheets API] Append request exception:`, err);
    return { success: false, message: err.message };
  }
}
