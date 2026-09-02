var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_pizzip = __toESM(require("pizzip"), 1);
var import_docxtemplater = __toESM(require("docxtemplater"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_supabase_js = require("@supabase/supabase-js");
var import_ws = __toESM(require("ws"), 1);

// server/googleSheets.ts
var GOOGLE_SPREADSHEET_ID = "1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY";
var GOOGLE_DRIVE_FOLDER = "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing";
var GOOGLE_OAUTH_CLIENT_ID = "343211370533-q75qrjgahflu3t789p70fj27abdvtv6f.apps.googleusercontent.com";
function formatIc(raw) {
  if (!raw) return "";
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, "");
  if (digits.length === 12) {
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}`;
  }
  return str;
}
function parseSheetDate(dateStr) {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
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
function formatDateForSheet(dateInput) {
  const d = dateInput ? new Date(dateInput) : /* @__PURE__ */ new Date();
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}
async function fetchSheetData(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}&headers=1&t=${Date.now()}`;
  let retries = 3;
  while (retries > 0) {
    try {
      const res = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
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
      const jsonStr = txt.substring(txt.indexOf("{"), txt.lastIndexOf("}") + 1);
      const data = JSON.parse(jsonStr);
      return data.table?.rows || [];
    } catch (err) {
      console.warn(`Error fetching sheet ${tabName} (retries left: ${retries - 1}):`, err.message);
      retries--;
      if (retries > 0) await new Promise((r) => setTimeout(r, 500));
      else return [];
    }
  }
  return [];
}
function parseRowCells(r) {
  return (r?.c || []).map((cell) => {
    if (!cell) return "";
    if (cell.f !== void 0 && cell.f !== null) return String(cell.f).trim();
    if (cell.v !== void 0 && cell.v !== null) {
      const valStr = String(cell.v).trim();
      return valStr === "null" ? "" : valStr;
    }
    return "";
  });
}
async function syncAllSheets() {
  console.log(`[Google Sheets] Loading records directly from Google Sheets: ${GOOGLE_SPREADSHEET_ID}...`);
  const syncedApps = [];
  const userMap = /* @__PURE__ */ new Map();
  const feedbacks = [];
  try {
    const nameToIcMap = /* @__PURE__ */ new Map();
    try {
      const userRows = await fetchSheetData("user");
      userRows.forEach((r, idx) => {
        const vals = parseRowCells(r);
        if (idx === 0) return;
        const userName = (vals[1] || "").trim().toUpperCase();
        const userIc = (vals[2] || "").trim();
        if (userName && userIc) {
          nameToIcMap.set(userName, userIc);
        }
      });
      console.log(`[Google Sheets] Loaded ${nameToIcMap.size} user mapping entries.`);
    } catch (e) {
      console.warn("[Google Sheets] Could not load user tab for name-to-IC lookup:", e);
    }
    const inovasiRows = await fetchSheetData("inovasi");
    inovasiRows.forEach((r, idx) => {
      const vals = parseRowCells(r);
      if (idx === 0 && (vals[0].toUpperCase().includes("NAMA KETUA") || vals[0].toUpperCase().includes("NAMA"))) return;
      const applicantName = (vals[0] || "").toUpperCase();
      const title = vals[12] || "";
      if (!applicantName && !title) return;
      const seq = String(syncedApps.length + 1).padStart(4, "0");
      const appId = vals[20] || `IREPRO-INV-2026-${seq}`;
      const chiefEmail = vals[19] || "";
      let chiefIc = (vals[1] || "").trim();
      const normalizedName = applicantName.trim();
      if ((!chiefIc || chiefIc.length < 5 || chiefIc.replace(/\D/g, "").startsWith("83010112")) && nameToIcMap.has(normalizedName)) {
        chiefIc = nameToIcMap.get(normalizedName);
      }
      const chiefDigits = chiefIc.replace(/\D/g, "");
      if (chiefDigits.length === 12) {
        chiefIc = `${chiefDigits.slice(0, 6)}-${chiefDigits.slice(6, 8)}-${chiefDigits.slice(8, 12)}`;
      } else if (!chiefIc || chiefIc.length < 5) {
        const fallbackDigits = `83010112${String(1e3 + idx).slice(-4)}`;
        chiefIc = `${fallbackDigits.slice(0, 6)}-${fallbackDigits.slice(6, 8)}-${fallbackDigits.slice(8, 12)}`;
      }
      const institution = vals[2] || "KOLEJ KOMUNITI BEAUFORT";
      const m1Name = (vals[3] || "").toUpperCase();
      let m1Ic = (vals[4] || "").trim();
      if ((!m1Ic || m1Ic.length < 5) && m1Name && nameToIcMap.has(m1Name.trim())) {
        m1Ic = nameToIcMap.get(m1Name.trim());
      }
      const m1Digits = m1Ic.replace(/\D/g, "");
      if (m1Digits.length === 12) {
        m1Ic = `${m1Digits.slice(0, 6)}-${m1Digits.slice(6, 8)}-${m1Digits.slice(8, 12)}`;
      }
      const m1Inst = vals[5] || institution;
      const m2Name = (vals[6] || "").toUpperCase();
      let m2Ic = (vals[7] || "").trim();
      if ((!m2Ic || m2Ic.length < 5) && m2Name && nameToIcMap.has(m2Name.trim())) {
        m2Ic = nameToIcMap.get(m2Name.trim());
      }
      const m2Digits = m2Ic.replace(/\D/g, "");
      if (m2Digits.length === 12) {
        m2Ic = `${m2Digits.slice(0, 6)}-${m2Digits.slice(6, 8)}-${m2Digits.slice(8, 12)}`;
      }
      const m2Inst = vals[8] || institution;
      const isDateStr = (s) => /^\d{2}\/\d{2}\/\d{4}/.test(s) || /^\d{4}-\d{2}-\d{2}/.test(s) || s.startsWith("Date(");
      const raw21 = (vals[21] || "").trim();
      let m3Name = !isDateStr(raw21) ? raw21.toUpperCase() : "";
      let m3Ic = m3Name ? (vals[22] || "").trim() : "";
      if ((!m3Ic || m3Ic.length < 5) && m3Name && nameToIcMap.has(m3Name.trim())) {
        m3Ic = nameToIcMap.get(m3Name.trim());
      }
      const m3Digits = m3Ic.replace(/\D/g, "");
      if (m3Digits.length === 12) {
        m3Ic = `${m3Digits.slice(0, 6)}-${m3Digits.slice(6, 8)}-${m3Digits.slice(8, 12)}`;
      }
      const m3Inst = m3Name ? vals[23] || institution : institution;
      const kupikName = vals[9] || "NORFAZIRAH BINTI KUSIN";
      const deputyDirectorName = vals[10] || "AZLENAH BTE MOHD SEN";
      const directorName = vals[11] || "Ts. JULKIFLI BIN AWANG BESAR (A.D.K)";
      const actualTitle = title || "PROJEK INOVASI KKBS";
      const langVal = (vals[18] || "").trim();
      const language = langVal.toLowerCase().startsWith("en") || langVal.toLowerCase().includes("english") || langVal.toLowerCase().includes("inggeris") ? "EN" : "MS";
      const langLower = language.toLowerCase();
      let parsedDate = parseSheetDate(vals[24]);
      if (!parsedDate && isDateStr(raw21)) {
        parsedDate = parseSheetDate(raw21);
      }
      const recordYear = parsedDate ? parsedDate.getFullYear() : 2026;
      const recordCreatedAt = parsedDate ? parsedDate.toISOString() : (/* @__PURE__ */ new Date()).toISOString();
      const membersArray = [
        m1Name ? { id: `m-1`, name: m1Name, icNumber: m1Ic, phone: "", department: "", institution: m1Inst } : null,
        m2Name ? { id: `m-2`, name: m2Name, icNumber: m2Ic, phone: "", department: "", institution: m2Inst } : null,
        m3Name ? { id: `m-3`, name: m3Name, icNumber: m3Ic, phone: "", department: "", institution: m3Inst } : null
      ].filter(Boolean);
      const category = membersArray.length === 3 ? "PELAJAR" : "PENSYARAH";
      const innovationRecord = {
        id: `sheet-inv-${idx + 1}`,
        applicationId: appId,
        applicationType: "INOVASI",
        category,
        language,
        icNumber: chiefIc,
        applicantName: applicantName || "KETUA INOVASI",
        institution,
        title: actualTitle,
        year: recordYear,
        status: "COMPLETED",
        sourceSheet: "inovasi",
        sheetRowIndex: idx + 1,
        innovationData: {
          chiefName: applicantName,
          chiefIc,
          chiefPhone: "012-3456789",
          chiefEmail,
          institution,
          members: membersArray,
          adminInfo: {
            kupikName,
            deputyDirectorName,
            directorName
          },
          title: actualTitle,
          introduction: vals[13] || "",
          objectives: vals[14] || "",
          impactTargetGroup: vals[15] || "",
          impactInstitution: vals[16] || "",
          impactDepartment: vals[17] || ""
        },
        generatedDocuments: [
          {
            id: `doc-inv-${idx}-1`,
            applicationId: appId,
            documentType: "Surat Lantikan Inovasi",
            templateKey: `innovation_${langLower}_appointment`,
            language,
            fileName: `${appId}_LANTIKAN.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: `doc-inv-${idx}-2`,
            applicationId: appId,
            documentType: "Kertas Cadangan Inovasi",
            templateKey: category === "PELAJAR" ? `innovation_student_${langLower}_proposal` : `innovation_${langLower}_proposal`,
            language,
            fileName: `${appId}_CADANGAN.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        ],
        driveUrl: GOOGLE_DRIVE_FOLDER,
        createdAt: recordCreatedAt,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      syncedApps.push(innovationRecord);
      if (chiefIc) {
        userMap.set(chiefIc, {
          id: `usr-${chiefIc}`,
          icNumber: chiefIc,
          name: applicantName,
          phone: "012-3456789",
          email: "",
          institution,
          department: "",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (m1Ic && m1Name) {
        userMap.set(m1Ic, {
          id: `usr-${m1Ic}`,
          icNumber: m1Ic,
          name: m1Name,
          phone: "",
          email: "",
          institution: m1Inst,
          department: "",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (m2Ic && m2Name) {
        userMap.set(m2Ic, {
          id: `usr-${m2Ic}`,
          icNumber: m2Ic,
          name: m2Name,
          phone: "",
          email: "",
          institution: m2Inst,
          department: "",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
    const lampiranRows = await fetchSheetData("lampiran a");
    lampiranRows.forEach((r, idx) => {
      const vals = parseRowCells(r);
      if (idx === 0 && vals[1].toUpperCase().includes("KAD PENGENALAN")) return;
      const applicantName = (vals[0] || "").toUpperCase();
      let rawIc = vals[1] || "";
      const normalizedName = applicantName.trim();
      if ((!rawIc || rawIc.length < 5 || rawIc.includes("820825-06-556")) && nameToIcMap.has(normalizedName)) {
        rawIc = nameToIcMap.get(normalizedName);
      }
      const icNumber = formatIc(rawIc) || `820825-06-556${idx}`;
      const title = vals[18] || "";
      if (!applicantName && !title) return;
      const seq = String(syncedApps.length + 1).padStart(4, "0");
      const appId = vals[31] || `IREPRO-RES-2026-${seq}`;
      const chiefEmail = vals[30] || "";
      const catVal = (vals[29] || "").trim().toUpperCase();
      let category = "CAT_1";
      let catKey = "cat1";
      if (catVal.includes("II") || catVal.includes("KATEGORI 2") || catVal.includes("KATEGORI II")) {
        category = "CAT_2";
        catKey = "cat1";
      } else if (catVal.includes("III") || catVal.includes("KATEGORI 3") || catVal.includes("KATEGORI III")) {
        category = "CAT_3";
        catKey = "cat3";
      }
      const langVal = (vals[28] || "").trim();
      const language = langVal.toLowerCase().startsWith("en") || langVal.toLowerCase().includes("english") || langVal.toLowerCase().includes("inggeris") ? "EN" : "MS";
      const langLower = language.toLowerCase();
      const parsedDate = parseSheetDate(vals[32]);
      const recordYear = parsedDate ? parsedDate.getFullYear() : 2026;
      const recordCreatedAt = parsedDate ? parsedDate.toISOString() : (/* @__PURE__ */ new Date()).toISOString();
      const m1Name = (vals[5] || "").toUpperCase().trim();
      let m1Ic = (vals[6] || "").trim();
      if ((!m1Ic || m1Ic.length < 5) && m1Name && nameToIcMap.has(m1Name)) {
        m1Ic = nameToIcMap.get(m1Name);
      }
      const m2Name = (vals[10] || "").toUpperCase().trim();
      let m2Ic = (vals[11] || "").trim();
      if ((!m2Ic || m2Ic.length < 5) && m2Name && nameToIcMap.has(m2Name)) {
        m2Ic = nameToIcMap.get(m2Name);
      }
      const resRecord = {
        id: `sheet-lampA-${idx + 1}`,
        applicationId: appId,
        applicationType: "PENYELIDIKAN",
        category,
        language,
        icNumber,
        applicantName: applicantName || "PENYELIDIK UTAMA",
        institution: vals[4] || "Kolej Komuniti Beaufort",
        title: title || "KERTAS CADANGAN PENYELIDIKAN",
        year: recordYear,
        status: "COMPLETED",
        sourceSheet: "lampiran a",
        sheetRowIndex: idx + 1,
        researchData: {
          category,
          chiefName: applicantName,
          chiefIc: icNumber,
          chiefPhone: vals[2] || "",
          chiefEmail,
          department: vals[3] || "Unit Penyelidikan & Inovasi",
          institution: vals[4] || "Kolej Komuniti Beaufort",
          members: [
            vals[5] ? { id: `m-1`, name: m1Name, icNumber: formatIc(m1Ic), phone: vals[7] || "", department: vals[8] || "", institution: vals[9] || "Kolej Komuniti Beaufort" } : null,
            vals[10] ? { id: `m-2`, name: m2Name, icNumber: formatIc(m2Ic), phone: vals[12] || "", department: vals[13] || "", institution: vals[14] || "Kolej Komuniti Beaufort" } : null
          ].filter(Boolean),
          adminInfo: {
            kupikName: vals[15] || "NORFAZIRAH BINTI KUSIN",
            deputyDirectorName: vals[16] || "AZLENAH BTE MOHD SEN",
            directorName: vals[17] || "Ts. JULKIFLI BIN AWANG BESAR (A.D.K)"
          },
          title,
          conference: vals[19] || "",
          introduction: vals[20] || "",
          objectives: vals[21] || "",
          location: vals[22] || "Kolej Komuniti Beaufort",
          sample: vals[23] || "",
          instruments: vals[24] || "Soal Selidik",
          impactTargetGroup: vals[25] || "",
          impactInstitution: vals[26] || "",
          impactDepartment: vals[27] || ""
        },
        generatedDocuments: category === "CAT_3" ? [
          {
            id: `doc-res-${idx}-2`,
            applicationId: appId,
            documentType: language === "EN" ? "Appendix A" : "Lampiran A",
            templateKey: `research_cat3_${langLower}_appendix`,
            language,
            fileName: `${appId}_LAMPIRAN.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: `doc-res-${idx}-3`,
            applicationId: appId,
            documentType: language === "EN" ? "Proposal 2" : "Kertas Cadangan 2",
            templateKey: `research_cat3_${langLower}_proposal`,
            language,
            fileName: `${appId}_CADANGAN.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        ] : [
          {
            id: `doc-res-${idx}-1`,
            applicationId: appId,
            documentType: language === "EN" ? "Appointment Letter" : "Surat Lantikan Penyelidik",
            templateKey: `research_cat1_${langLower}_appointment`,
            language,
            fileName: `${appId}_LANTIKAN.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: `doc-res-${idx}-2`,
            applicationId: appId,
            documentType: language === "EN" ? "Appendix A" : "Borang Lampiran A",
            templateKey: `research_cat1_${langLower}_appendix`,
            language,
            fileName: `${appId}_LAMPIRAN.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: `doc-res-${idx}-3`,
            applicationId: appId,
            documentType: language === "EN" ? "Proposal 1" : "Kertas Cadangan Penyelidikan",
            templateKey: `research_cat1_${langLower}_proposal`,
            language,
            fileName: `${appId}_CADANGAN.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        ],
        driveUrl: GOOGLE_DRIVE_FOLDER,
        createdAt: recordCreatedAt,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      syncedApps.push(resRecord);
      if (icNumber) {
        userMap.set(icNumber, {
          id: `usr-${icNumber}`,
          icNumber,
          name: applicantName,
          phone: vals[2] || "",
          email: "",
          institution: vals[4] || "Kolej Komuniti Beaufort",
          department: vals[3] || "",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
    const pppRows = await fetchSheetData("PPP");
    pppRows.forEach((r, idx) => {
      const vals = parseRowCells(r);
      if (idx === 0 && vals[1].toUpperCase().includes("KAD PENGENALAN")) return;
      const applicantName = (vals[0] || "").toUpperCase();
      let rawIc = vals[1] || "";
      const normalizedName = applicantName.trim();
      if ((!rawIc || rawIc.length < 5 || rawIc.includes("830101-12-123")) && nameToIcMap.has(normalizedName)) {
        rawIc = nameToIcMap.get(normalizedName);
      }
      const icNumber = formatIc(rawIc) || `830101-12-123${idx}`;
      const title = vals[10] || "";
      if (!applicantName && !title) return;
      const seq = String(syncedApps.length + 1).padStart(4, "0");
      const appId = vals[28] || `IREPRO-RES-2026-${seq}`;
      const chiefEmail = vals[27] || "";
      const catVal = (vals[26] || "").trim().toUpperCase();
      let category = "CAT_4";
      if (catVal.includes("V") || catVal.includes("KATEGORI 5") || catVal.includes("KATEGORI V")) {
        category = "CAT_5";
      }
      const langVal = (vals[25] || "").trim();
      const language = langVal.toLowerCase().startsWith("en") || langVal.toLowerCase().includes("english") || langVal.toLowerCase().includes("inggeris") ? "EN" : "MS";
      const langLower = language.toLowerCase();
      const parsedDate = parseSheetDate(vals[29]);
      const recordYear = parsedDate ? parsedDate.getFullYear() : 2026;
      const recordCreatedAt = parsedDate ? parsedDate.toISOString() : (/* @__PURE__ */ new Date()).toISOString();
      const pppRecord = {
        id: `sheet-ppp-${idx + 1}`,
        applicationId: appId,
        applicationType: "PENYELIDIKAN",
        category,
        language,
        icNumber,
        applicantName: applicantName || "PENYELIDIK PPP",
        institution: vals[5] || "Universiti Malaysia Sabah",
        title: title || "PERMOHONAN KEBENARAN PENYELIDIKAN (PPP)",
        year: recordYear,
        status: "COMPLETED",
        sourceSheet: "PPP",
        sheetRowIndex: idx + 1,
        researchData: {
          category,
          chiefName: applicantName,
          chiefIc: icNumber,
          chiefPhone: vals[3] || "",
          chiefEmail,
          address: vals[2] || "",
          occupation: vals[4] || "PENSYARAH",
          institution: vals[5] || "",
          institutionAddress: vals[6] || "",
          institutionPhone: vals[7] || "",
          department: vals[8] || "",
          studyYear: vals[9] || "2",
          members: [],
          adminInfo: {
            kupikName: "NORFAZIRAH BINTI KUSIN",
            deputyDirectorName: "AZLENAH BTE MOHD SEN",
            directorName: "Ts. JULKIFLI BIN AWANG BESAR (A.D.K)",
            ppiDirectorName: vals[24] || "Dr. Shahiza binti Ahmad Zainuddin"
          },
          title,
          pilotStartDate: vals[11] || "",
          pilotEndDate: vals[12] || "",
          actualStartDate: vals[13] || "",
          actualEndDate: vals[14] || "",
          expectedReportDate: vals[15] || "",
          introduction: vals[16] || "",
          objectives: vals[17] || "",
          location: vals[18] || "",
          sample: vals[19] || "",
          instruments: vals[20] || "",
          impactDepartment: vals[21] || "",
          impactTargetGroup: vals[22] || "",
          impactInstitution: vals[23] || ""
        },
        generatedDocuments: [
          {
            id: `doc-ppp-${idx}-1`,
            applicationId: appId,
            documentType: language === "EN" ? "PPP Form" : "Borang PPP",
            templateKey: `research_cat4_${langLower}_ppp_form`,
            language,
            fileName: `${appId}_PPP.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          {
            id: `doc-ppp-${idx}-2`,
            applicationId: appId,
            documentType: language === "EN" ? "PPP Proposal" : "Kertas Cadangan PPP",
            templateKey: `research_cat4_${langLower}_ppp_proposal`,
            language,
            fileName: `${appId}_CADANGAN.doc`,
            driveUrl: GOOGLE_DRIVE_FOLDER,
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        ],
        driveUrl: GOOGLE_DRIVE_FOLDER,
        createdAt: recordCreatedAt,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      syncedApps.push(pppRecord);
      if (icNumber) {
        userMap.set(icNumber, {
          id: `usr-${icNumber}`,
          icNumber,
          name: applicantName,
          phone: vals[3] || "",
          email: "",
          institution: vals[5] || "",
          department: vals[8] || "",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
    try {
      const fbRows = await fetchSheetData("maklum balas");
      fbRows.forEach((r, idx) => {
        const vals = parseRowCells(r);
        if (idx === 0 && (vals[0].toUpperCase().includes("JANTINA") || vals[0].toUpperCase().includes("NAMA"))) return;
        if (!vals[0] && !vals[1] && !vals[8]) return;
        feedbacks.push({
          id: `sheet-fb-${idx + 1}`,
          jantina: vals[0] || "Lelaki",
          umur: vals[1] || "21-30 tahun",
          bangsa: vals[2] || "Bumiputera Sabah/Sarawak",
          s1: Number(vals[3]) || 5,
          s2: Number(vals[4]) || 5,
          s3: Number(vals[5]) || 5,
          s4: Number(vals[6]) || 5,
          s5: Number(vals[7]) || 5,
          comments: vals[8] || "",
          createdAt: vals[9] || (/* @__PURE__ */ new Date()).toISOString()
        });
      });
      console.log(`[Google Sheets] Loaded ${feedbacks.length} feedbacks from maklum balas tab.`);
    } catch (e) {
      console.warn("[Google Sheets] Could not load maklum balas tab:", e);
    }
    console.log(`[Google Sheets] Loaded ${syncedApps.length} applications and ${userMap.size} user accounts from Google Sheets.`);
  } catch (err) {
    console.error("[Google Sheets] Error in syncAllSheets:", err);
  }
  return {
    applications: syncedApps,
    users: Array.from(userMap.values()),
    feedbacks
  };
}
function prepareSheetRow(record) {
  if (record.applicationType === "INOVASI") {
    const inv = record.innovationData || {};
    const m1 = inv.members?.[0] || {};
    const m2 = inv.members?.[1] || {};
    const m3 = inv.members?.[2] || {};
    const admin = inv.adminInfo || {};
    return {
      targetSheet: "inovasi",
      rowValues: [
        record.applicantName || inv.chiefName || "",
        record.icNumber || inv.chiefIc || "",
        record.institution || inv.institution || "KOLEJ KOMUNITI BEAUFORT",
        m1.name || "",
        m1.icNumber || "",
        m1.institution || "",
        m2.name || "",
        m2.icNumber || "",
        m2.institution || "",
        admin.kupikName || "NORFAZIRAH BINTI KUSIN",
        admin.deputyDirectorName || "AZLENAH BTE MOHD SEN",
        admin.directorName || "Ts. JULKIFLI BIN AWANG BESAR (A.D.K)",
        record.title || inv.title || "",
        inv.introduction || "",
        inv.objectives || "",
        inv.impactTargetGroup || "",
        inv.impactInstitution || "",
        inv.impactDepartment || "",
        record.language === "EN" ? "English" : "Bahasa Melayu",
        record.email || inv.chiefEmail || "",
        record.applicationId || "",
        m3.name || "",
        m3.icNumber || "",
        m3.institution || "",
        formatDateForSheet(record.createdAt)
      ]
    };
  } else {
    const res = record.researchData || {};
    const isPPP = record.category === "CAT_4" || record.category === "CAT_5";
    if (isPPP) {
      return {
        targetSheet: "PPP",
        rowValues: [
          record.applicantName || res.chiefName || "",
          record.icNumber || res.chiefIc || "",
          res.address || "",
          res.chiefPhone || "",
          res.occupation || "PENSYARAH",
          record.institution || res.institution || "",
          res.institutionAddress || "",
          res.institutionPhone || "",
          res.department || "",
          res.studyYear || "2",
          record.title || res.title || "",
          res.pilotStartDate || "",
          res.pilotEndDate || "",
          res.actualStartDate || "",
          res.actualEndDate || "",
          res.expectedReportDate || "",
          res.introduction || "",
          res.objectives || "",
          res.location || "",
          res.sample || "",
          res.instruments || "",
          res.impactDepartment || "",
          res.impactTargetGroup || "",
          res.impactInstitution || "",
          res.adminInfo?.ppiDirectorName || "Dr. Shahiza binti Ahmad Zainuddin",
          record.language === "EN" ? "English" : "Bahasa Melayu",
          record.category === "CAT_5" ? "KATEGORI V" : "KATEGORI IV",
          record.email || res.chiefEmail || "",
          record.applicationId || "",
          formatDateForSheet(record.createdAt)
        ]
      };
    } else {
      const m1 = res.members?.[0] || {};
      const m2 = res.members?.[1] || {};
      const admin = res.adminInfo || {};
      let catLabel = "KATEGORI I";
      if (record.category === "CAT_2") catLabel = "KATEGORI II";
      else if (record.category === "CAT_3") catLabel = "KATEGORI III";
      return {
        targetSheet: "lampiran a",
        rowValues: [
          record.applicantName || res.chiefName || "",
          record.icNumber || res.chiefIc || "",
          res.chiefPhone || "",
          res.department || "",
          record.institution || res.institution || "",
          m1.name || "",
          m1.icNumber || "",
          m1.phone || "",
          m1.department || "",
          m1.institution || "",
          m2.name || "",
          m2.icNumber || "",
          m2.phone || "",
          m2.department || "",
          m2.institution || "",
          admin.kupikName || "NORFAZIRAH BINTI KUSIN",
          admin.deputyDirectorName || "AZLENAH BTE MOHD SEN",
          admin.directorName || "Ts. JULKIFLI BIN AWANG BESAR (A.D.K)",
          record.title || res.title || "",
          res.conference || "",
          res.introduction || "",
          res.objectives || "",
          res.location || "",
          res.sample || "",
          res.instruments || "",
          res.impactTargetGroup || "",
          res.impactInstitution || "",
          res.impactDepartment || "",
          record.language === "EN" ? "English" : "Bahasa Melayu",
          catLabel,
          record.email || res.chiefEmail || "",
          record.applicationId || "",
          formatDateForSheet(record.createdAt)
        ]
      };
    }
  }
}
async function appendRowToGoogleSheet(targetSheet, rowValues, bearerToken) {
  if (!bearerToken) {
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (appsScriptUrl) {
      try {
        console.log(`[Google Sheets] Writing via Apps Script (GET method)...`);
        const encodedData = encodeURIComponent(JSON.stringify(rowValues));
        const encodedSheet = encodeURIComponent(targetSheet);
        const getUrl = `${appsScriptUrl}?action=appendRow&sheet=${encodedSheet}&data=${encodedData}`;
        const res = await fetch(getUrl, {
          method: "GET",
          redirect: "follow"
        });
        const resText = await res.text();
        const jsonStart = resText.indexOf("{");
        const jsonEnd = resText.lastIndexOf("}") + 1;
        if (jsonStart >= 0) {
          const resJson = JSON.parse(resText.substring(jsonStart, jsonEnd));
          if (resJson.success) {
            console.log(`[Google Sheets via Apps Script GET] Appended row to "${targetSheet}" successfully!`);
            return { success: true, message: `Berjaya disimpan ke Google Sheets (Sheet: ${targetSheet}).` };
          } else {
            console.warn(`[Google Sheets via Apps Script GET] Failed:`, resJson);
            return { success: false, message: resJson.error || `Gagal menulis ke Google Sheets via Apps Script: ${JSON.stringify(resJson)}` };
          }
        } else {
          console.warn(`[Google Sheets via Apps Script GET] Unexpected response:`, resText.substring(0, 200));
          return { success: false, message: `Respon tidak dikenali dari Google Apps Script: ${resText.substring(0, 100)}` };
        }
      } catch (err) {
        console.error(`[Google Sheets via Apps Script GET] Exception:`, err.message);
        return { success: false, message: `Exception semasa menulis ke Google Sheets: ${err.message}` };
      }
    }
    return { success: false, message: `Google Sheets sync URL (APPS_SCRIPT_URL) tidak dikonfigurasikan.` };
  }
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SPREADSHEET_ID}/values/${encodeURIComponent(targetSheet)}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: [rowValues]
      })
    });
    const resJson = await res.json();
    if (res.ok) {
      console.log(`[Google Sheets API] Successfully appended row to sheet "${targetSheet}"!`);
      return { success: true, message: `Berjaya disimpan terus ke Google Sheets (Sheet: ${targetSheet}).` };
    } else {
      console.warn(`[Google Sheets API] Error appending to sheet "${targetSheet}":`, resJson);
      return { success: false, message: resJson.error?.message || "Ralat semasa menulis ke Google Sheets." };
    }
  } catch (err) {
    console.error(`[Google Sheets API] Append request exception:`, err);
    return { success: false, message: err.message };
  }
}

// server.ts
import_dotenv.default.config({ path: ".env.local" });
import_dotenv.default.config();
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured.");
  process.exit(1);
}
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: {
    transport: import_ws.default
  }
});
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
app.use(import_express.default.urlencoded({ extended: true }));
var DATA_DIR = process.env.VERCEL ? "/tmp" : import_path.default.join(process.cwd(), "data");
var STORE_FILE = import_path.default.join(DATA_DIR, "irepro_db.json");
if (!process.env.VERCEL && !import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
var initialUsers = [
  {
    id: "usr-1",
    icNumber: "880512-10-5431",
    name: "Dr. Ahmad Fauzi bin Ismail",
    phone: "012-3456789",
    email: "fauzi.ismail@psa.edu.my",
    institution: "Politeknik Sultan Salahuddin Abdul Aziz Shah",
    department: "Jabatan Kejuruteraan Mekanikal",
    createdAt: "2025-01-15T08:30:00.000Z"
  },
  {
    id: "usr-2",
    icNumber: "910304-08-5678",
    name: "Ts. Siti Nurhaliza binti Ramli",
    phone: "013-9876543",
    email: "siti.nurhaliza@puo.edu.my",
    institution: "Politeknik Ungku Omar",
    department: "Jabatan Teknologi Maklumat & Komunikasi",
    createdAt: "2025-02-10T10:00:00.000Z"
  },
  {
    id: "usr-3",
    icNumber: "850920-01-6789",
    name: "Ts. Mohd Khairul bin Anuar",
    phone: "019-4567890",
    email: "khairul.anuar@kkbb.edu.my",
    institution: "Kolej Komuniti Bayan Baru",
    department: "Unit Sijil Teknologi Maklumat",
    createdAt: "2026-01-08T09:15:00.000Z"
  }
];
var initialApplications = [
  {
    id: "app-inv-001",
    applicationId: "IREPRO-INV-2026-0001",
    applicationType: "INOVASI",
    language: "MS",
    icNumber: "880512-10-5431",
    applicantName: "Dr. Ahmad Fauzi bin Ismail",
    institution: "Politeknik Sultan Salahuddin Abdul Aziz Shah",
    title: "Sistem Pemantauan Pintar IoT Kualiti Udara Makmal Kimia PSA",
    year: 2026,
    status: "COMPLETED",
    innovationData: {
      chiefName: "Dr. Ahmad Fauzi bin Ismail",
      chiefIc: "880512-10-5431",
      chiefPhone: "012-3456789",
      chiefEmail: "fauzi.ismail@psa.edu.my",
      institution: "Politeknik Sultan Salahuddin Abdul Aziz Shah",
      members: [
        {
          id: "mem-1",
          name: "Ts. Mohamad Hafiz bin Zainal",
          icNumber: "920110-10-1233",
          phone: "017-8899123",
          department: "Jabatan Kejuruteraan Elektrik",
          institution: "Politeknik Sultan Salahuddin Abdul Aziz Shah"
        },
        {
          id: "mem-2",
          name: "Puan Nurul Asyikin binti Othman",
          icNumber: "930815-08-5422",
          phone: "011-2345678",
          department: "Jabatan Matematik, Sains & Komputer",
          institution: "Politeknik Sultan Salahuddin Abdul Aziz Shah"
        }
      ],
      adminInfo: {
        kupikName: "Dr. Zulkifli bin Hashim",
        deputyDirectorName: "Ts. Azman bin Mohd Yusof",
        directorName: "Dr. Hajah Salbiah binti Arshad"
      },
      title: "Sistem Pemantauan Pintar IoT Kualiti Udara Makmal Kimia PSA",
      introduction: "Inovasi ini dibangunkan untuk memantau paras gas berbahaya dan kepekatan partikel terampai secara masa nyata di makmal kejuruteraan kimia Politeknik Sultan Salahuddin Abdul Aziz Shah bagi memastikan keselamatan pensyarah dan pelajar.",
      objectives: "1. Membina modul sensor IoT bersepadu berketepatan tinggi.\n2. Menyediakan amaran masa nyata melalui dashboard cloud dan peranti mudah alih.\n3. Mengurangkan risiko pendedahan gas kimia berbahaya sehingga 95%.",
      impactTargetGroup: "Pelajar dan pensyarah makmal kimia mendapat persekitaran pembelajaran dan amali yang lebih selamat.",
      impactInstitution: "Menaikkan penarafan keselamatan institusi mengikut piawaian OSHA dan MyPOLYCC.",
      impactDepartment: "Mengautomasikan rekod keselamatan makmal tanpa memerlukan log manual harian."
    },
    generatedDocuments: [
      {
        id: "doc-1",
        applicationId: "IREPRO-INV-2026-0001",
        documentType: "Surat Lantikan Inovasi",
        templateKey: "innovation_ms_appointment",
        language: "MS",
        fileName: "IREPRO-INV-2026-0001_Lantikan_Inovasi.doc",
        driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
        generatedAt: "2026-01-20T11:00:00.000Z"
      },
      {
        id: "doc-2",
        applicationId: "IREPRO-INV-2026-0001",
        documentType: "Kertas Cadangan Inovasi",
        templateKey: "innovation_ms_proposal",
        language: "MS",
        fileName: "IREPRO-INV-2026-0001_Kertas_Cadangan_Inovasi.doc",
        driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
        generatedAt: "2026-01-20T11:00:00.000Z"
      }
    ],
    driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
    createdAt: "2026-01-20T10:45:00.000Z",
    updatedAt: "2026-01-20T11:00:00.000Z"
  },
  {
    id: "app-res-001",
    applicationId: "IREPRO-RES-2026-0001",
    applicationType: "PENYELIDIKAN",
    category: "CAT_1",
    language: "MS",
    icNumber: "910304-08-5678",
    applicantName: "Ts. Siti Nurhaliza binti Ramli",
    institution: "Politeknik Ungku Omar",
    title: "Keberkesanan Kaedah Gamifikasi Terhadap Penguasaan Algoritma Pelajar Diploma TMK",
    year: 2026,
    status: "COMPLETED",
    researchData: {
      category: "CAT_1",
      chiefName: "Ts. Siti Nurhaliza binti Ramli",
      chiefIc: "910304-08-5678",
      chiefPhone: "013-9876543",
      chiefEmail: "siti.nurhaliza@puo.edu.my",
      department: "Jabatan Teknologi Maklumat & Komunikasi",
      institution: "Politeknik Ungku Omar",
      members: [
        {
          id: "mem-3",
          name: "Encik Razak bin Hamdan",
          icNumber: "891102-08-7711",
          phone: "012-7654321",
          department: "Jabatan Teknologi Maklumat & Komunikasi",
          institution: "Politeknik Ungku Omar"
        }
      ],
      adminInfo: {
        kupikName: "Dr. Noraini binti Kamaruddin",
        deputyDirectorName: "Ts. Haji Shamsul bin Baharom",
        directorName: "Dr. Shamsuri bin Abdullah",
        ppiDirectorName: "Dr. Normala binti Daud"
      },
      title: "Keberkesanan Kaedah Gamifikasi Terhadap Penguasaan Algoritma Pelajar Diploma TMK",
      conference: "National Innovation and Research Conference (NIRC 2026)",
      introduction: "Kajian ini menyelidik impak pembelajaran berasaskan gamifikasi interaktif dalam meningkatkan minat dan prestasi pemikiran komputasional pelajar semester 1 Diploma Sains Komputer.",
      objectives: "1. Mengenal pasti tahap penerimaan pelajar terhadap aplikasi gamifikasi modul pengaturcaraan.\n2. Mengukur peningkatan markah penilaian kuiz dan amali sebelum dan selepas intervensi.\n3. Merangka model pedagogi gamifikasi untuk kurikulum POLYCC.",
      location: "Politeknik Ungku Omar, Ipoh",
      sample: "120 orang pelajar Diploma TMK Semester 1 & 2",
      instruments: "Soal selidik Likert 5-mata, ujian pra/pasca, rekod analitik aktiviti digital",
      pilotStartDate: "2026-02-01",
      pilotEndDate: "2026-02-28",
      actualStartDate: "2026-03-15",
      actualEndDate: "2026-07-30",
      expectedReportDate: "2026-09-15",
      impactDepartment: "Memperbaiki kadar lulus kursus teras pengaturcaraan daripada 72% kepada 88%.",
      impactTargetGroup: "Pelajar lebih bermotivasi dan mempunyai pemahaman logik pengaturcaraan yang kukuh.",
      impactInstitution: "Menjadi penanda aras amalan terbaik TVET instruksional digital bagi institusi POLYCC."
    },
    generatedDocuments: [
      {
        id: "doc-3",
        applicationId: "IREPRO-RES-2026-0001",
        documentType: "Lantikan Penyelidik",
        templateKey: "research_cat1_ms_appointment",
        language: "MS",
        fileName: "IREPRO-RES-2026-0001_Lantikan_Penyelidik.doc",
        driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
        generatedAt: "2026-02-15T09:30:00.000Z"
      },
      {
        id: "doc-4",
        applicationId: "IREPRO-RES-2026-0001",
        documentType: "Lampiran A",
        templateKey: "research_cat1_ms_appendix",
        language: "MS",
        fileName: "IREPRO-RES-2026-0001_Lampiran_A.doc",
        driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
        generatedAt: "2026-02-15T09:30:00.000Z"
      },
      {
        id: "doc-5",
        applicationId: "IREPRO-RES-2026-0001",
        documentType: "Kertas Cadangan 1",
        templateKey: "research_cat1_ms_proposal",
        language: "MS",
        fileName: "IREPRO-RES-2026-0001_Kertas_Cadangan_1.doc",
        driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
        generatedAt: "2026-02-15T09:30:00.000Z"
      }
    ],
    driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
    createdAt: "2026-02-15T09:00:00.000Z",
    updatedAt: "2026-02-15T09:30:00.000Z"
  },
  {
    id: "app-res-002",
    applicationId: "IREPRO-RES-2025-0012",
    applicationType: "PENYELIDIKAN",
    category: "CAT_3",
    language: "MS",
    icNumber: "850920-01-6789",
    applicantName: "Ts. Mohd Khairul bin Anuar",
    institution: "Kolej Komuniti Bayan Baru",
    title: "Kajian Kebolehpasaran Graduan Sijil TVET Kolej Komuniti Zon Utara dalam Industri Semikonduktor",
    year: 2025,
    status: "COMPLETED",
    researchData: {
      category: "CAT_3",
      chiefName: "Ts. Mohd Khairul bin Anuar",
      chiefIc: "850920-01-6789",
      chiefPhone: "019-4567890",
      department: "Unit Penyelidikan & Kebolehpasaran",
      institution: "Kolej Komuniti Bayan Baru",
      members: [],
      adminInfo: {
        kupikName: "Puan Halimah binti Saad",
        deputyDirectorName: "Encik Wan Rosli bin Wan Chik",
        directorName: "Tuan Haji Suhairi bin Ismail",
        ppiDirectorName: "Pengarah Pusat Penyelidikan dan Inovasi (PPI)"
      },
      title: "Kajian Kebolehpasaran Graduan Sijil TVET Kolej Komuniti Zon Utara dalam Industri Semikonduktor",
      introduction: "Kajian empirikal berkaitan padanan kemahiran teknikal graduan kolej komuniti dengan kehendak industri elektrik dan elektronik di Pulau Pinang.",
      objectives: "1. Menilai kadar kebolehpasaran graduan dalam tempoh 6 bulan selepas tamat pengajian.\n2. Mengenal pasti jurang kemahiran teknikal yang diperlukan pihak industri.",
      location: "Kawasan Perindustrian Bayan Lepas & Seberang Perai",
      sample: "250 graduan dan 40 majikan industri",
      instruments: "Soal selidik digital Sistem Pengesanan Graduan (SKPG)",
      impactDepartment: "Memperkemas kurikulum praktikal berpandukan permintaan industri semasa.",
      impactTargetGroup: "Graduan menerima tawaran gaji permulaan yang lebih kompetitif.",
      impactInstitution: "Memperkukuh kolaborasi pintar MoU/MoA antara Kolej Komuniti dan pemain industri."
    },
    generatedDocuments: [
      {
        id: "doc-6",
        applicationId: "IREPRO-RES-2025-0012",
        documentType: "Lampiran A",
        templateKey: "research_cat3_ms_appendix",
        language: "MS",
        fileName: "IREPRO-RES-2025-0012_Lampiran_A.doc",
        driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
        generatedAt: "2025-08-10T14:00:00.000Z"
      },
      {
        id: "doc-7",
        applicationId: "IREPRO-RES-2025-0012",
        documentType: "Kertas Cadangan 2",
        templateKey: "research_cat3_ms_proposal",
        language: "MS",
        fileName: "IREPRO-RES-2025-0012_Kertas_Cadangan_2.doc",
        driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
        generatedAt: "2025-08-10T14:00:00.000Z"
      }
    ],
    driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
    createdAt: "2025-08-10T13:30:00.000Z",
    updatedAt: "2025-08-10T14:00:00.000Z"
  },
  {
    id: "app-inv-002",
    applicationId: "IREPRO-INV-2025-0008",
    applicationType: "INOVASI",
    language: "MS",
    icNumber: "910304-08-5678",
    applicantName: "Ts. Siti Nurhaliza binti Ramli",
    institution: "Politeknik Ungku Omar",
    title: "Aplikasi Pembelajaran Realiti Maya (VR) bagi Operasi Penyelenggaraan Enjin Marin",
    year: 2025,
    status: "COMPLETED",
    innovationData: {
      chiefName: "Ts. Siti Nurhaliza binti Ramli",
      chiefIc: "910304-08-5678",
      chiefPhone: "013-9876543",
      chiefEmail: "siti.nurhaliza@puo.edu.my",
      institution: "Politeknik Ungku Omar",
      members: [],
      adminInfo: {
        kupikName: "Dr. Noraini binti Kamaruddin",
        deputyDirectorName: "Ts. Haji Shamsul bin Baharom",
        directorName: "Dr. Shamsuri bin Abdullah"
      },
      title: "Aplikasi Pembelajaran Realiti Maya (VR) bagi Operasi Penyelenggaraan Enjin Marin",
      introduction: "Simulasi latihan interaktif enjin marin berpandukan model 3D spatial bagi menggantikan peralatan fizikal yang mahal dan terhad.",
      objectives: "1. Mereka bentuk modul latihan VR langkah-demi-langkah.\n2. Mengurangkan kos penyelenggaraan enjin latihan fizikal.",
      impactTargetGroup: "Pelajar Kejuruteraan Marin mendapat latihan tanpa had ruang dan masa.",
      impactInstitution: "Menjadikan PUO peneraju teknologi imersif TVET negara.",
      impactDepartment: "Meningkatkan pematuhan SOP keselamatan maritim."
    },
    generatedDocuments: [],
    driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
    createdAt: "2025-05-14T09:00:00.000Z",
    updatedAt: "2025-05-14T09:15:00.000Z"
  },
  {
    id: "app-res-003",
    applicationId: "IREPRO-RES-2024-0005",
    applicationType: "PENYELIDIKAN",
    category: "CAT_4",
    language: "MS",
    icNumber: "880512-10-5431",
    applicantName: "Dr. Ahmad Fauzi bin Ismail",
    institution: "Universiti Teknologi Malaysia (UTM) / Kerjasama POLYCC",
    title: "Analisis Formulasi Bahan Komposit Serat Semulajadi untuk Komponen Automotif Hijau",
    year: 2024,
    status: "COMPLETED",
    researchData: {
      category: "CAT_4",
      chiefName: "Dr. Ahmad Fauzi bin Ismail",
      chiefIc: "880512-10-5431",
      chiefPhone: "012-3456789",
      institution: "Universiti Teknologi Malaysia (UTM)",
      department: "Fakulti Kejuruteraan Mekanikal",
      occupation: "Penyelidik Pasca Doktoral",
      address: "Skudai, Johor",
      institutionAddress: "UTM Johor Bahru, 81310 Johor",
      institutionPhone: "07-5533333",
      members: [],
      adminInfo: {
        kupikName: "Dr. Zulkifli bin Hashim",
        deputyDirectorName: "Ts. Azman bin Mohd Yusof",
        directorName: "Dr. Hajah Salbiah binti Arshad",
        ppiDirectorName: "Pengarah Pusat Penyelidikan dan Inovasi (PPI)"
      },
      title: "Analisis Formulasi Bahan Komposit Serat Semulajadi untuk Komponen Automotif Hijau",
      introduction: "Kajian struktur mekanikal bahan komposit mesra alam berbanding polimer sintetik konvensional.",
      objectives: "1. Menguji kekuatan tegangan dan impak.\n2. Menilai potensi komersial bahan.",
      location: "Makmal Bahan Termaju UTM & Bengkel Mekanikal PSA",
      sample: "80 spesimen uji kaji ASTM",
      instruments: "Universal Testing Machine (UTM Instron), SEM Microscope",
      impactDepartment: "Menyumbang kepada penerbitan jurnal berimpak tinggi bersama penyelidik POLYCC.",
      impactTargetGroup: "Industri automotif tempatan dalam penggunaan bahan mampan.",
      impactInstitution: "Menjalin jaringan penyelidikan rentas universiti dan politeknik."
    },
    generatedDocuments: [],
    driveUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
    createdAt: "2024-04-18T10:00:00.000Z",
    updatedAt: "2024-04-18T10:00:00.000Z"
  }
];
var initialAuditLogs = [
  {
    id: "log-1",
    user: "880512-10-5431 (Dr. Ahmad Fauzi bin Ismail)",
    action: "Login",
    timestamp: "2026-01-20T10:30:00.000Z",
    details: "Pengguna log masuk melalui No. KP"
  },
  {
    id: "log-2",
    user: "880512-10-5431 (Dr. Ahmad Fauzi bin Ismail)",
    action: "Create application",
    applicationId: "IREPRO-INV-2026-0001",
    timestamp: "2026-01-20T10:45:00.000Z",
    details: "Permohonan Inovasi dicipta dengan ID IREPRO-INV-2026-0001"
  },
  {
    id: "log-3",
    user: "880512-10-5431 (Dr. Ahmad Fauzi bin Ismail)",
    action: "Generate document",
    applicationId: "IREPRO-INV-2026-0001",
    timestamp: "2026-01-20T11:00:00.000Z",
    details: "Dokumen Surat Lantikan & Kertas Cadangan Inovasi dijana secara automatik"
  },
  {
    id: "log-4",
    user: "910304-08-5678 (Ts. Siti Nurhaliza binti Ramli)",
    action: "Create application",
    applicationId: "IREPRO-RES-2026-0001",
    timestamp: "2026-02-15T09:00:00.000Z",
    details: "Permohonan Penyelidikan Kategori I dicipta"
  },
  {
    id: "log-5",
    user: "Admin (KUPIK System)",
    action: "Admin action",
    timestamp: "2026-02-16T08:00:00.000Z",
    details: "Pentadbir memantau statistik dan senarai permohonan"
  }
];
var db = {
  users: initialUsers,
  applications: initialApplications,
  auditLogs: initialAuditLogs,
  feedback: []
};
var lastSyncTime = "1970-01-01T00:00:00.000Z";
var activeSyncPromise = null;
var initialSyncPromise = null;
var isInitialSyncDone = false;
async function refreshFromSupabase() {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }
  activeSyncPromise = (async () => {
    try {
      const { data: users, error: userError } = await supabase.from("users").select("*");
      if (userError) throw userError;
      const { data: applications, error: appError } = await supabase.from("applications").select("*");
      if (appError) throw appError;
      const { data: feedbacks, error: fbError } = await supabase.from("feedback").select("*");
      if (fbError) throw fbError;
      const { data: auditLogs, error: logError } = await supabase.from("audit_logs").select("*");
      if (logError) throw logError;
      db.users = users || [];
      db.applications = (applications || []).map((a) => ({
        ...a,
        generatedDocuments: a.generatedDocuments || [],
        innovationData: a.innovationData || null,
        researchData: a.researchData || null
      }));
      db.feedback = feedbacks || [];
      db.auditLogs = auditLogs || [];
      lastSyncTime = (/* @__PURE__ */ new Date()).toISOString();
      console.log(`[iREPRO Server] Successfully synced cache from Supabase! Users: ${db.users.length}, Apps: ${db.applications.length}, Feedback: ${db.feedback.length}`);
      isInitialSyncDone = true;
      return true;
    } catch (err) {
      console.error("[iREPRO Server] Error during Supabase sync:", err);
      return false;
    } finally {
      activeSyncPromise = null;
    }
  })();
  return activeSyncPromise;
}
initialSyncPromise = refreshFromSupabase();
var ensureSyncedMiddleware = async (req, res, next) => {
  if (req.path.startsWith("/api/") && req.path !== "/api/health") {
    const now = Date.now();
    const lastSyncMs = new Date(lastSyncTime).getTime();
    if (now - lastSyncMs > 1e4 || !isInitialSyncDone) {
      try {
        await refreshFromSupabase();
      } catch (err) {
        console.error("[iREPRO Server] ensureSyncedMiddleware error:", err);
      }
    }
  }
  next();
};
app.use(ensureSyncedMiddleware);
function addAuditLog(user, action, applicationId, details) {
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user,
    action,
    applicationId,
    details,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.auditLogs.unshift(newLog);
  supabase.from("audit_logs").insert({
    id: newLog.id,
    user: newLog.user,
    action: newLog.action,
    applicationId: newLog.applicationId || null,
    details: newLog.details || null,
    timestamp: newLog.timestamp
  }).then(({ error }) => {
    if (error) console.error("[Supabase] Failed to write audit log:", error);
  });
}
function generateApplicationId() {
  let maxSeq = 25;
  db.applications.forEach((app2) => {
    if (app2.applicationId) {
      const match = app2.applicationId.match(/iREPRO-(\d+)/i);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  });
  const nextSeq = maxSeq + 1;
  return `iREPRO-${String(nextSeq).padStart(5, "0")}`;
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", system: "iREPRO API Engine", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/auth/user-login", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Alamat emel diperlukan." });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: "Sila masukkan alamat emel yang sah (contoh: pengguna@test.com)." });
  }
  const existingUser = db.users.find(
    (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
  );
  if (existingUser) {
    addAuditLog(
      `${existingUser.icNumber || "TIADA-IC"} (${existingUser.name})`,
      "Login",
      void 0,
      "Pengguna log masuk ke Dashboard (Emel)"
    );
    return res.json({
      exists: true,
      user: existingUser
    });
  } else {
    return res.json({
      exists: false
    });
  }
});
app.post("/api/auth/register-user", async (req, res) => {
  const { icNumber, name, phone, email, institution, department, overwrite } = req.body;
  if (!icNumber || !name) {
    return res.status(400).json({ error: "No. Kad Pengenalan dan Nama Penuh diperlukan." });
  }
  const raw = String(icNumber).trim();
  const digits = raw.replace(/\D/g, "");
  const cleanIc = digits.length === 12 ? `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 12)}` : raw;
  const existing = db.users.find(
    (u) => u.icNumber === cleanIc || digits && u.icNumber.replace(/\D/g, "") === digits
  );
  if (existing) {
    const existingEmail = (existing.email || "").trim().toLowerCase();
    const newEmail = String(email || "").trim().toLowerCase();
    if (existingEmail !== newEmail) {
      if (!overwrite) {
        return res.status(409).json({
          error: "DUPLICATE_IC",
          message: "No Kad Pengenalan anda telah wujud, adakah anda pasti untuk mengemaskini emel baharu anda?"
        });
      }
    }
    existing.name = name.trim().toUpperCase();
    if (phone) existing.phone = phone.trim();
    if (email) existing.email = email.trim();
    if (institution) existing.institution = institution.trim().toUpperCase();
    if (department) existing.department = department.trim();
    const { error: updateError } = await supabase.from("users").upsert(existing, { onConflict: "icNumber" });
    if (updateError) {
      console.error("[Supabase] Error updating user:", updateError);
      return res.status(500).json({ error: "Gagal mengemaskini pengguna di database." });
    }
    addAuditLog(
      `${cleanIc} (${existing.name})`,
      "Pendaftaran",
      void 0,
      `Kemaskini emel & maklumat pengguna sedia ada (Emel baru: ${existing.email})`
    );
    return res.json({ success: true, user: existing });
  }
  const newUser = {
    id: `usr-${Date.now()}`,
    icNumber: cleanIc,
    name: name.trim().toUpperCase(),
    phone: phone?.trim() || "",
    email: email?.trim() || "",
    institution: institution?.trim().toUpperCase() || "KOLEJ KOMUNITI BEAUFORT",
    department: department?.trim() || "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.users.push(newUser);
  const { error: insertError } = await supabase.from("users").insert(newUser);
  if (insertError) {
    console.error("[Supabase] Error registering user:", insertError);
    return res.status(500).json({ error: "Gagal mendaftar pengguna ke database." });
  }
  addAuditLog(
    `${cleanIc} (${newUser.name})`,
    "Pendaftaran",
    void 0,
    "Pendaftaran pengguna baharu berjaya"
  );
  res.json({ success: true, user: newUser });
});
app.post("/api/auth/admin-login", (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "kupikkkbs";
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Kata laluan pentadbir tidak sah." });
  }
  addAuditLog("Admin KUPIK / PPI", "Login", void 0, "Pentadbir log masuk ke Dashboard Admin");
  res.json({
    success: true,
    admin: {
      role: "ADMIN",
      name: "Pentadbir iREPRO (KUPIK / PPI)",
      email: "admin.irepro@mohe.gov.my"
    }
  });
});
app.put("/api/auth/update-profile", async (req, res) => {
  const { id, name, phone, institution } = req.body;
  if (!id) {
    return res.status(400).json({ error: "ID Pengguna diperlukan." });
  }
  const existing = db.users.find((u) => u.id === id);
  if (!existing) {
    return res.status(404).json({ error: "Pengguna tidak ditemui." });
  }
  if (name) existing.name = name.trim().toUpperCase();
  if (phone) existing.phone = phone.trim();
  if (institution) existing.institution = institution.trim().toUpperCase();
  const { error: updateError } = await supabase.from("users").upsert(existing, { onConflict: "icNumber" });
  if (updateError) {
    console.error("[Supabase] Error updating user profile:", updateError);
    return res.status(500).json({ error: "Gagal mengemaskini profil di database." });
  }
  addAuditLog(
    `${existing.icNumber} (${existing.name})`,
    "Update application",
    void 0,
    "Kemaskini maklumat profil pengguna"
  );
  return res.json({ success: true, user: existing });
});
app.get("/api/applications", async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  const { icNumber, search, type, category, year, language, limit, page } = req.query;
  try {
    await refreshFromSupabase();
  } catch (err) {
    console.warn("[iREPRO] Could not refresh from Supabase, using cached data:", err);
  }
  let list = db.applications.map((a) => ({
    ...a,
    year: a.createdAt ? new Date(a.createdAt).getFullYear() : Number(a.year)
  }));
  if (icNumber) {
    const targetIc = String(icNumber).trim();
    const targetDigits = targetIc.replace(/\D/g, "");
    list = list.filter((a) => {
      const aIc = a.icNumber?.replace(/\D/g, "");
      const chiefInvIc = a.innovationData?.chiefIc?.replace(/\D/g, "");
      const chiefResIc = a.researchData?.chiefIc?.replace(/\D/g, "");
      const memberInvMatch = a.innovationData?.members?.some(
        (m) => m.icNumber === targetIc || targetDigits && m.icNumber?.replace(/\D/g, "") === targetDigits
      );
      const memberResMatch = a.researchData?.members?.some(
        (m) => m.icNumber === targetIc || targetDigits && m.icNumber?.replace(/\D/g, "") === targetDigits
      );
      return a.icNumber === targetIc || targetDigits && aIc === targetDigits || a.innovationData?.chiefIc === targetIc || targetDigits && chiefInvIc === targetDigits || a.researchData?.chiefIc === targetIc || targetDigits && chiefResIc === targetDigits || memberInvMatch || memberResMatch;
    });
  }
  if (type && type !== "ALL") list = list.filter((a) => a.applicationType === type);
  if (category && category !== "ALL") list = list.filter((a) => a.category === category);
  if (year && year !== "ALL") list = list.filter((a) => a.year === Number(year));
  if (language && language !== "ALL") list = list.filter((a) => a.language === language);
  if (search) {
    const q = String(search).toLowerCase().trim();
    list = list.filter(
      (a) => a.applicationId.toLowerCase().includes(q) || a.title.toLowerCase().includes(q) || a.applicantName.toLowerCase().includes(q) || a.icNumber.includes(q) || a.institution.toLowerCase().includes(q)
    );
  }
  list.sort((a, b) => {
    const parseDate = (dStr) => {
      if (!dStr) return 0;
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) return d.getTime();
      const parts = String(dStr).split(/[\/\-\s:]/);
      if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year2 = parseInt(parts[2], 10);
        const hours = parts[3] ? parseInt(parts[3], 10) : 0;
        const minutes = parts[4] ? parseInt(parts[4], 10) : 0;
        const seconds = parts[5] ? parseInt(parts[5], 10) : 0;
        const pd = new Date(year2, month, day, hours, minutes, seconds);
        if (!isNaN(pd.getTime())) return pd.getTime();
      }
      return 0;
    };
    const dateA = parseDate(a.createdAt);
    const dateB = parseDate(b.createdAt);
    if (dateB !== dateA) return dateB - dateA;
    return (b.applicationId || "").localeCompare(a.applicationId || "", void 0, { numeric: true, sensitivity: "base" });
  });
  const total = list.length;
  const p = Number(page) || 1;
  const lim = Number(limit) || 100;
  const paginated = list.slice((p - 1) * lim, p * lim);
  res.json({
    total,
    page: p,
    limit: lim,
    applications: paginated
  });
});
app.get("/api/applications/:id", (req, res) => {
  const { id } = req.params;
  const appItem = db.applications.find((a) => a.id === id || a.applicationId === id);
  if (!appItem) {
    return res.status(404).json({ error: "Permohonan tidak dijumpai." });
  }
  res.json(appItem);
});
app.post("/api/applications", async (req, res) => {
  try {
    const data = req.body;
    const year = data.year || (/* @__PURE__ */ new Date()).getFullYear();
    const appType = data.applicationType;
    if (!appType || !data.icNumber || !data.applicantName || !data.title) {
      return res.status(400).json({ error: "Sila lengkapkan semua medan wajib." });
    }
    const appId = generateApplicationId();
    const driveFolderBase = GOOGLE_DRIVE_FOLDER;
    const newRecord = {
      id: `app-${Date.now()}`,
      applicationId: appId,
      applicationType: appType,
      category: data.category,
      language: data.language || "MS",
      icNumber: data.icNumber.trim(),
      applicantName: data.applicantName.trim().toUpperCase(),
      email: data.email || data.innovationData?.chiefEmail || data.researchData?.chiefEmail || "",
      institution: data.institution?.trim() || "Kolej Komuniti Beaufort",
      title: data.title.trim(),
      year,
      status: "COMPLETED",
      innovationData: data.innovationData,
      researchData: data.researchData,
      generatedDocuments: (data.generatedDocuments || []).map((doc) => ({
        ...doc,
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        applicationId: appId,
        driveUrl: driveFolderBase,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString()
      })),
      driveUrl: driveFolderBase,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const { targetSheet, rowValues } = prepareSheetRow(newRecord);
    newRecord.sourceSheet = targetSheet;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : void 0;
    const { error: appError } = await supabase.from("applications").insert({
      id: newRecord.id,
      applicationId: newRecord.applicationId,
      applicationType: newRecord.applicationType,
      category: newRecord.category || null,
      language: newRecord.language,
      icNumber: newRecord.icNumber,
      applicantName: newRecord.applicantName,
      email: newRecord.email,
      institution: newRecord.institution,
      title: newRecord.title,
      year: newRecord.year,
      status: newRecord.status,
      sourceSheet: newRecord.sourceSheet,
      sheetRowIndex: null,
      // Updated after sync
      innovationData: newRecord.innovationData || null,
      researchData: newRecord.researchData || null,
      generatedDocuments: newRecord.generatedDocuments,
      driveUrl: newRecord.driveUrl,
      createdAt: newRecord.createdAt,
      updatedAt: newRecord.updatedAt
    });
    if (appError) {
      console.error("[Supabase] Failed to save application:", appError);
      return res.status(500).json({ error: `Gagal menyimpan permohonan ke database: ${appError.message}` });
    }
    db.applications.unshift(newRecord);
    (async () => {
      try {
        console.log(`[Google Sheets Background Sync] Syncing ${appId} to sheet "${targetSheet}"...`);
        const sheetResult = await appendRowToGoogleSheet(targetSheet, rowValues, bearerToken);
        if (sheetResult.success) {
          console.log(`[Google Sheets Background Sync] Appended row to "${targetSheet}" successfully!`);
          const { applications: freshApps } = await syncAllSheets();
          const syncedApp = freshApps.find((a) => a.applicationId === appId);
          if (syncedApp && syncedApp.sheetRowIndex !== void 0) {
            await supabase.from("applications").update({
              sheetRowIndex: syncedApp.sheetRowIndex
            }).eq("applicationId", appId);
            const cacheApp = db.applications.find((a) => a.applicationId === appId);
            if (cacheApp) cacheApp.sheetRowIndex = syncedApp.sheetRowIndex;
            console.log(`[Google Sheets Background Sync] Updated sheetRowIndex ${syncedApp.sheetRowIndex} for ${appId} in database.`);
          }
        } else {
          console.warn(`[Google Sheets Background Sync] Failed to append row to "${targetSheet}":`, sheetResult.message);
        }
      } catch (err) {
        console.error(`[Google Sheets Background Sync] Error during sync:`, err.message);
      }
    })();
    const syncedRecord = newRecord;
    addAuditLog(
      `${newRecord.icNumber} (${newRecord.applicantName})`,
      "Create application",
      appId,
      `Permohonan ${appType} berjaya direkodkan ke Google Sheets (Sheet: ${targetSheet}) [${appId}]`
    );
    addAuditLog(
      `${newRecord.icNumber} (${newRecord.applicantName})`,
      "Generate document",
      appId,
      `Dokumen rasmi (${newRecord.generatedDocuments.length} fail) berjaya dijana`
    );
    res.status(201).json({
      success: true,
      application: syncedRecord,
      targetSheet,
      googleSheetsSynced: false,
      sheetMessage: "Penyelarasan Google Sheets sedang diproses di latar belakang."
    });
  } catch (err) {
    console.error("Error creating application:", err);
    res.status(500).json({ error: "Maaf, permohonan tidak dapat diproses. Sila cuba lagi." });
  }
});
app.get("/api/sheets/pending-sync", async (req, res) => {
  try {
    const { data, error } = await supabase.from("applications").select("*").is("sheetRowIndex", null);
    if (error) throw error;
    res.json({ pendingCount: data?.length || 0, pending: data || [] });
  } catch (err) {
    res.status(500).json({ error: `Gagal menyemak rekod belum diselaraskan: ${err.message}` });
  }
});
app.post("/api/sheets/sync-all", async (req, res) => {
  try {
    const { data: pending, error } = await supabase.from("applications").select("*").is("sheetRowIndex", null);
    if (error) throw error;
    if (!pending || pending.length === 0) {
      return res.json({ success: true, message: "Semua rekod sudah diselaraskan ke Google Sheets." });
    }
    console.log(`[iREPRO Sync All] Found ${pending.length} pending records to sync to Google Sheets.`);
    let successCount = 0;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : void 0;
    for (const record of pending) {
      try {
        const { targetSheet, rowValues } = prepareSheetRow(record);
        const result = await appendRowToGoogleSheet(targetSheet, rowValues, bearerToken);
        if (result.success) {
          successCount++;
        }
      } catch (e) {
        console.error(`[iREPRO Sync All] Error syncing record ${record.applicationId}:`, e.message);
      }
    }
    const { applications: freshApps } = await syncAllSheets();
    for (const app2 of freshApps) {
      await supabase.from("applications").update({
        sheetRowIndex: app2.sheetRowIndex
      }).eq("applicationId", app2.applicationId);
    }
    await refreshFromSupabase();
    res.json({
      success: true,
      message: `Berjaya menyelaras ${successCount} daripada ${pending.length} rekod ke Google Sheets.`
    });
  } catch (err) {
    res.status(500).json({ error: `Ralat semasa menyelaraskan semua rekod: ${err.message}` });
  }
});
app.get("/api/sheets/config", (req, res) => {
  res.json({
    spreadsheetId: GOOGLE_SPREADSHEET_ID,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`,
    driveFolderUrl: GOOGLE_DRIVE_FOLDER,
    clientId: GOOGLE_OAUTH_CLIENT_ID,
    sheets: {
      inovasi: "inovasi (Permohonan Inovasi)",
      lampiranA: "lampiran a (Penyelidikan Kategori I, II, III)",
      ppp: "PPP (Penyelidikan Kategori IV, V)"
    },
    totalApplications: db.applications.length,
    lastSyncTime
  });
});
app.post("/api/sheets/pull", async (req, res) => {
  try {
    console.log("[iREPRO Server] Force pulling from Google Sheets...");
    const { applications, users, feedbacks } = await syncAllSheets();
    if (users.length > 0) {
      const uniqueUsersMap = /* @__PURE__ */ new Map();
      const { data: dbUsers } = await supabase.from("users").select("*");
      const dbUsersMap = new Map((dbUsers || []).map((u) => [u.icNumber, u]));
      users.forEach((u) => {
        const existingDbUser = dbUsersMap.get(u.icNumber);
        const finalEmail = existingDbUser?.email || u.email || "";
        const finalPhone = existingDbUser?.phone || u.phone || "";
        const finalName = existingDbUser?.name || u.name;
        const finalInstitution = existingDbUser?.institution || u.institution || "Kolej Komuniti Beaufort";
        const finalDepartment = existingDbUser?.department || u.department || "";
        uniqueUsersMap.set(u.icNumber, {
          id: existingDbUser?.id || u.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          icNumber: u.icNumber,
          name: finalName,
          phone: finalPhone,
          email: finalEmail,
          institution: finalInstitution,
          department: finalDepartment,
          createdAt: existingDbUser?.createdAt || u.createdAt || (/* @__PURE__ */ new Date()).toISOString()
        });
      });
      await supabase.from("users").upsert(Array.from(uniqueUsersMap.values()), { onConflict: "icNumber" });
    }
    if (applications.length > 0) {
      const { data: deletedRecords } = await supabase.from("deleted_applications").select("applicationId");
      const deletedIds = new Set((deletedRecords || []).map((d) => d.applicationId));
      const appsToInsert = applications.filter((a) => !deletedIds.has(a.applicationId)).map((a) => ({
        id: a.id || `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        applicationId: a.applicationId,
        applicationType: a.applicationType,
        category: a.category || null,
        language: a.language || "MS",
        icNumber: a.icNumber,
        applicantName: a.applicantName,
        email: a.email || "",
        institution: a.institution || "",
        title: a.title,
        year: Number(a.year) || (/* @__PURE__ */ new Date()).getFullYear(),
        status: a.status || "COMPLETED",
        sourceSheet: a.sourceSheet || null,
        sheetRowIndex: a.sheetRowIndex !== void 0 && a.sheetRowIndex !== null ? Number(a.sheetRowIndex) : null,
        innovationData: a.innovationData || null,
        researchData: a.researchData || null,
        generatedDocuments: a.generatedDocuments || [],
        driveUrl: a.driveUrl || "",
        createdAt: a.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: a.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
      }));
      if (appsToInsert.length > 0) {
        await supabase.from("applications").upsert(appsToInsert, { onConflict: "id" });
      }
      if (deletedIds.size > 0) {
        console.log(`[Sync] Skipped ${deletedIds.size} deleted records:`, [...deletedIds]);
      }
    }
    if (feedbacks.length > 0) {
      const feedbackToInsert = feedbacks.map((f, idx) => {
        const parsedDate = parseSheetDate(f.createdAt);
        const createdAt = parsedDate ? parsedDate.toISOString() : (/* @__PURE__ */ new Date()).toISOString();
        return {
          id: f.id || `fb-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          jantina: f.jantina || "",
          umur: f.umur || "",
          bangsa: f.bangsa || "",
          s1: Number(f.s1) || 0,
          s2: Number(f.s2) || 0,
          s3: Number(f.s3) || 0,
          s4: Number(f.s4) || 0,
          s5: Number(f.s5) || 0,
          comments: f.comments || "",
          createdAt
        };
      });
      await supabase.from("feedback").upsert(feedbackToInsert, { onConflict: "id" });
    }
    await refreshFromSupabase();
    res.json({
      success: true,
      message: "Data terkini berjaya ditarik dari Google Sheets dan disegerakkan ke Supabase.",
      totalApplications: db.applications.length,
      lastSyncTime
    });
  } catch (err) {
    console.error("[iREPRO Server] Pull from sheets error:", err);
    res.status(500).json({ error: "Gagal menarik data dari Google Sheets." });
  }
});
app.post("/api/sheets/push-record", async (req, res) => {
  try {
    const { applicationId } = req.body;
    const record = db.applications.find((a) => a.id === applicationId || a.applicationId === applicationId);
    if (!record) {
      return res.status(404).json({ error: "Permohonan tidak dijumpai." });
    }
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : void 0;
    const { targetSheet, rowValues } = prepareSheetRow(record);
    const result = await appendRowToGoogleSheet(targetSheet, rowValues, bearerToken);
    if (result.success) {
      const { applications: freshApps } = await syncAllSheets();
      const syncedApp = freshApps.find((a) => a.applicationId === applicationId);
      if (syncedApp && syncedApp.sheetRowIndex !== void 0) {
        await supabase.from("applications").update({
          sheetRowIndex: syncedApp.sheetRowIndex
        }).eq("applicationId", applicationId);
        record.sheetRowIndex = syncedApp.sheetRowIndex;
      }
    }
    res.json({
      success: result.success,
      targetSheet,
      message: result.message
    });
  } catch (err) {
    res.status(500).json({ error: "Ralat semasa menghantar rekod ke Google Sheets." });
  }
});
app.put("/api/applications/:id", async (req, res) => {
  const { id } = req.params;
  const index = db.applications.findIndex((a) => a.id === id || a.applicationId === id);
  if (index === -1) {
    return res.status(404).json({ error: "Permohonan tidak dijumpai." });
  }
  const existing = db.applications[index];
  const updateData = req.body;
  const updated = {
    ...existing,
    ...updateData,
    id: existing.id,
    applicantName: (updateData.applicantName || existing.applicantName).trim().toUpperCase(),
    email: updateData.email || updateData.innovationData?.chiefEmail || updateData.researchData?.chiefEmail || existing.email || "",
    applicationId: existing.applicationId,
    // Preserve immutable ID
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const { error: updateError } = await supabase.from("applications").update({
    category: updated.category,
    language: updated.language,
    applicantName: updated.applicantName,
    email: updated.email,
    institution: updated.institution,
    title: updated.title,
    innovationData: updated.innovationData || null,
    researchData: updated.researchData || null,
    generatedDocuments: updated.generatedDocuments,
    driveUrl: updated.driveUrl,
    updatedAt: updated.updatedAt
  }).eq("applicationId", updated.applicationId);
  if (updateError) {
    console.error("[Supabase] Error updating application:", updateError);
    return res.status(500).json({ error: "Gagal mengemaskini permohonan ke database." });
  }
  db.applications[index] = updated;
  if (existing.sheetRowIndex !== void 0 && existing.sheetRowIndex !== null && existing.sourceSheet) {
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (appsScriptUrl) {
      (async () => {
        try {
          const { targetSheet, rowValues } = prepareSheetRow(updated);
          const payload = {
            action: "updateRow",
            targetSheet,
            rowIndex: existing.sheetRowIndex - 1,
            // 0-based data row index
            rowValues
          };
          console.log(`[Google Sheets Background Update] Updating in-place row ${existing.sheetRowIndex} for: ${updated.applicationId} in tab: ${targetSheet}...`);
          const updateRes = await fetch(appsScriptUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const updateResult = await updateRes.json().catch(() => ({}));
          console.log(`[Google Sheets Background Update] Update response:`, updateResult);
        } catch (err) {
          console.error("[Google Sheets Background Update] Error updating sheet row:", err);
        }
      })();
    }
  }
  const finalRecord = updated;
  addAuditLog(
    `${finalRecord.icNumber} (${finalRecord.applicantName})`,
    "Update application",
    finalRecord.applicationId,
    `Maklumat permohonan ${finalRecord.applicationId} telah dikemaskini`
  );
  res.json({ success: true, application: finalRecord });
});
app.delete("/api/applications/:id", async (req, res) => {
  const { id } = req.params;
  const index = db.applications.findIndex((a) => a.id === id || a.applicationId === id);
  if (index === -1) {
    return res.status(404).json({ error: "Permohonan tidak dijumpai." });
  }
  const deleted = db.applications.splice(index, 1)[0];
  const { error: deleteError } = await supabase.from("applications").delete().eq("applicationId", deleted.applicationId);
  if (deleteError) {
    console.error("[Supabase] Error deleting application:", deleteError);
    db.applications.splice(index, 0, deleted);
    return res.status(500).json({ error: "Gagal memadam permohonan dari database." });
  }
  await supabase.from("deleted_applications").upsert(
    { applicationId: deleted.applicationId, deletedAt: (/* @__PURE__ */ new Date()).toISOString() },
    { onConflict: "applicationId" }
  ).then(({ error }) => {
    if (error && error.code !== "42P01") {
      console.warn("[Supabase] Could not record deletion:", error.message);
    }
  });
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  if (appsScriptUrl && deleted.sourceSheet && deleted.sheetRowIndex !== void 0 && deleted.sheetRowIndex !== null) {
    (async () => {
      try {
        const sheetName = encodeURIComponent(deleted.sourceSheet);
        const deleteUrl = `${appsScriptUrl}?action=deleteRow&sheet=${sheetName}&rowIndex=${deleted.sheetRowIndex}`;
        const delRes = await fetch(deleteUrl, { method: "GET", redirect: "follow" });
        const delText = await delRes.text();
        console.log(`[Google Sheets Background Delete] Delete row result for ${deleted.applicationId}:`, delText);
        const { applications: freshApps } = await syncAllSheets();
        for (const app2 of freshApps) {
          if (app2.applicationId === deleted.applicationId) continue;
          await supabase.from("applications").update({
            sheetRowIndex: app2.sheetRowIndex
          }).eq("applicationId", app2.applicationId);
          const cacheApp = db.applications.find((a) => a.applicationId === app2.applicationId);
          if (cacheApp) cacheApp.sheetRowIndex = app2.sheetRowIndex;
        }
      } catch (err) {
        console.warn(`[Google Sheets Background Delete] Failed to delete row from sheet:`, err.message);
      }
    })();
  }
  addAuditLog(
    "Admin KUPIK",
    "Delete application",
    deleted.applicationId,
    `Permohonan ${deleted.applicationId} (${deleted.title}) telah dipadam`
  );
  res.json({ success: true, message: "Permohonan berjaya dipadam.", applicationId: deleted.applicationId });
});
app.get("/api/backup", async (req, res) => {
  const secret = process.env.BACKUP_SECRET || "irepro-backup-2026";
  const providedSecret = req.headers["authorization"]?.replace("Bearer ", "") || req.query.secret;
  const isVercelCron = req.headers["x-vercel-cron"] === "1" || req.headers["user-agent"]?.includes("vercel-cron");
  if (!isVercelCron && providedSecret !== secret) {
    return res.status(401).json({ error: "Unauthorized. Provide ?secret=<BACKUP_SECRET> or set Authorization header." });
  }
  function toCsv(rows, columns) {
    const escape = (val) => {
      if (val === null || val === void 0) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const header = columns.join(",");
    const body = rows.map((row) => columns.map((col) => escape(row[col])).join(","));
    return [header, ...body].join("\r\n");
  }
  try {
    console.log("[Backup] Starting Supabase CSV backup to Google Drive...");
    const [appsRes, usersRes, feedbackRes, deletedRes, logsRes] = await Promise.all([
      supabase.from("applications").select("*").order("createdAt", { ascending: true }),
      supabase.from("users").select("*").order("createdAt", { ascending: true }),
      supabase.from("feedback").select("*").order("createdAt", { ascending: true }),
      supabase.from("deleted_applications").select("*").order("deletedAt", { ascending: true }),
      supabase.from("audit_logs").select("*").order("createdAt", { ascending: false }).limit(500)
    ]);
    if (appsRes.error) throw appsRes.error;
    if (usersRes.error) throw usersRes.error;
    const apps = appsRes.data || [];
    const users = usersRes.data || [];
    const feedbacks = feedbackRes.data || [];
    const deleted = deletedRes.data || [];
    const logs = logsRes.data || [];
    const csvFiles = [
      {
        table: "applications",
        rows: apps.length,
        csv: toCsv(apps, [
          "applicationId",
          "applicationType",
          "category",
          "language",
          "icNumber",
          "applicantName",
          "email",
          "institution",
          "title",
          "year",
          "status",
          "sourceSheet",
          "sheetRowIndex",
          "driveUrl",
          "createdAt",
          "updatedAt"
        ])
      },
      {
        table: "users",
        rows: users.length,
        csv: toCsv(users, [
          "id",
          "icNumber",
          "name",
          "phone",
          "email",
          "institution",
          "department",
          "createdAt"
        ])
      },
      {
        table: "feedback",
        rows: feedbacks.length,
        csv: toCsv(feedbacks, [
          "id",
          "jantina",
          "umur",
          "bangsa",
          "s1",
          "s2",
          "s3",
          "s4",
          "s5",
          "comments",
          "createdAt"
        ])
      },
      {
        table: "deleted_applications",
        rows: deleted.length,
        csv: toCsv(deleted, ["applicationId", "deletedAt"])
      },
      {
        table: "audit_logs",
        rows: logs.length,
        csv: toCsv(logs, ["id", "user", "action", "applicationId", "details", "timestamp"])
      }
    ];
    const stats = {
      totalApplications: apps.length,
      totalUsers: users.length,
      totalFeedback: feedbacks.length,
      totalDeleted: deleted.length,
      totalInovasi: apps.filter((a) => a.applicationType === "INOVASI").length,
      totalPenyelidikan: apps.filter((a) => a.applicationType === "PENYELIDIKAN").length
    };
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (!appsScriptUrl) throw new Error("APPS_SCRIPT_URL not configured");
    const driveRes = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveBackupToDrive", csvFiles })
    });
    const driveResult = await driveRes.json();
    if (!driveResult.success) throw new Error(driveResult.error || "Apps Script backup failed");
    const fileList = (driveResult.files || []).map((f) => f.fileName).join(", ");
    addAuditLog(
      "System (Cron)",
      "Backup",
      void 0,
      `Backup CSV berjaya: ${driveResult.files?.length || 0} fail (${driveResult.totalSizeKb || 0} KB) \u2014 ${fileList}`
    );
    console.log(`[Backup] \u2713 CSV backup complete: ${driveResult.files?.length} files, ${driveResult.totalSizeKb} KB`);
    return res.json({
      success: true,
      message: `Backup berjaya: ${driveResult.files?.length || 0} fail CSV`,
      files: driveResult.files,
      stats,
      totalSizeKb: driveResult.totalSizeKb
    });
  } catch (err) {
    console.error("[Backup] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/stats", (req, res) => {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const totalApplications = db.applications.length;
  const totalInnovation = db.applications.filter((a) => a.applicationType === "INOVASI").length;
  const totalResearch = db.applications.filter((a) => a.applicationType === "PENYELIDIKAN").length;
  const uniqueApplicants = new Set(db.applications.map((a) => a.icNumber)).size;
  const currentYearInnovation = db.applications.filter((a) => a.applicationType === "INOVASI" && a.year === currentYear).length;
  const currentYearResearch = db.applications.filter((a) => a.applicationType === "PENYELIDIKAN" && a.year === currentYear).length;
  const yearsSet = new Set(db.applications.map((a) => a.year));
  yearsSet.add(currentYear);
  yearsSet.add(currentYear - 1);
  yearsSet.add(currentYear - 2);
  const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
  const byYear = sortedYears.map((yr) => {
    const inv = db.applications.filter((a) => a.year === yr && a.applicationType === "INOVASI").length;
    const res2 = db.applications.filter((a) => a.year === yr && a.applicationType === "PENYELIDIKAN").length;
    return {
      year: yr,
      innovation: inv,
      research: res2,
      total: inv + res2
    };
  });
  const catCounts = {
    CAT_1: { label: "Kategori I (POLYCC A - POLYCC A - Pengarah Institusi)", count: 0 },
    CAT_2: { label: "Kategori II (POLYCC - Agensi Luar - Pengarah Institusi)", count: 0 },
    CAT_3: { label: "Kategori III (POLYCC A - POLYCC B - Pengarah PPI)", count: 0 },
    CAT_4: { label: "Kategori IV (Agensi Luar - POLYCC - Pengarah PPI)", count: 0 },
    CAT_5: { label: "Kategori V (Pensyarah Sambung Belajar/Pelajar IPT - Agensi Luar - Pengarah PPI)", count: 0 }
  };
  db.applications.forEach((a) => {
    if (a.applicationType === "PENYELIDIKAN" && a.category && catCounts[a.category]) {
      catCounts[a.category].count += 1;
    }
  });
  const byCategory = Object.keys(catCounts).map((key) => ({
    category: key,
    label: catCounts[key].label,
    count: catCounts[key].count
  }));
  const instCounts = {};
  db.applications.forEach((a) => {
    const inst = a.institution || "Lain-lain";
    instCounts[inst] = (instCounts[inst] || 0) + 1;
  });
  const byInstitution = Object.keys(instCounts).map((inst) => ({
    institution: inst,
    count: instCounts[inst]
  })).sort((a, b) => b.count - a.count);
  const totalFeedback = db.feedback.length;
  let s1Sum = 0, s2Sum = 0, s3Sum = 0, s4Sum = 0, s5Sum = 0;
  db.feedback.forEach((f) => {
    s1Sum += Number(f.s1) || 0;
    s2Sum += Number(f.s2) || 0;
    s3Sum += Number(f.s3) || 0;
    s4Sum += Number(f.s4) || 0;
    s5Sum += Number(f.s5) || 0;
  });
  const feedbackStats = {
    total: totalFeedback,
    s1Avg: totalFeedback > 0 ? Number((s1Sum / totalFeedback).toFixed(2)) : 0,
    s2Avg: totalFeedback > 0 ? Number((s2Sum / totalFeedback).toFixed(2)) : 0,
    s3Avg: totalFeedback > 0 ? Number((s3Sum / totalFeedback).toFixed(2)) : 0,
    s4Avg: totalFeedback > 0 ? Number((s4Sum / totalFeedback).toFixed(2)) : 0,
    s5Avg: totalFeedback > 0 ? Number((s5Sum / totalFeedback).toFixed(2)) : 0
  };
  res.json({
    totalApplications,
    totalInnovation,
    totalResearch,
    totalApplicants: uniqueApplicants,
    currentYearInnovation,
    currentYearResearch,
    byYear,
    byCategory,
    byInstitution,
    feedbackStats
  });
});
app.get("/api/audit-logs", (req, res) => {
  res.json(db.auditLogs);
});
app.post("/api/feedback", async (req, res) => {
  const { jantina, umur, bangsa, s1, s2, s3, s4, s5, comments } = req.body;
  const formattedDate = formatDateForSheet(/* @__PURE__ */ new Date());
  const rowValues = [
    jantina || "Lelaki",
    umur || "21-30 tahun",
    bangsa || "Bumiputera Sabah/Sarawak",
    Number(s1) || 5,
    Number(s2) || 5,
    Number(s3) || 5,
    Number(s4) || 5,
    Number(s5) || 5,
    comments?.trim() || "",
    formattedDate
  ];
  const item = {
    id: `fb-${Date.now()}`,
    jantina: jantina || "Lelaki",
    umur: umur || "21-30 tahun",
    bangsa: bangsa || "Bumiputera Sabah/Sarawak",
    s1: Number(s1) || 5,
    s2: Number(s2) || 5,
    s3: Number(s3) || 5,
    s4: Number(s4) || 5,
    s5: Number(s5) || 5,
    comments: comments?.trim() || "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const { error: fbError } = await supabase.from("feedback").insert(item);
  if (fbError) {
    console.error("[Supabase] Error inserting feedback:", fbError);
    return res.status(500).json({ error: "Gagal merekodkan maklum balas." });
  }
  db.feedback.push(item);
  (async () => {
    try {
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : void 0;
      await appendRowToGoogleSheet("maklum balas", rowValues, bearerToken);
      console.log(`[iREPRO Server] Successfully appended feedback to 'maklum balas' sheet tab.`);
    } catch (err) {
      console.warn("[iREPRO Server] Could not write feedback to Google Sheets:", err);
    }
  })();
  res.json({ success: true, message: "Maklum balas penggunaan iREPRO berjaya direkodkan. Terima kasih!" });
});
app.get("/api/feedback", (req, res) => {
  res.json(db.feedback);
});
var GOOGLE_DOC_TEMPLATES = {
  innovation_ms_appointment: "1MNR1SAoZYiz91ItxZN8dvNPoP0Rxz8XtP4eemhcStXs",
  innovation_ms_proposal: "1oTMDV7wNeVI0M8tTHZBxRBuxHZ9Vw0wLTz19h8h7jvw",
  innovation_student_ms_proposal: "1sEwenqky6oDrY4GgqrXlX95mPsNjrugz61klNzu-c2s",
  innovation_en_appointment: "1MNR1SAoZYiz91ItxZN8dvNPoP0Rxz8XtP4eemhcStXs",
  // Fallback to BM layout
  innovation_en_proposal: "123A87vegDr84kN_CfZqgmFE5NsKmskzg53fNexWBOaI",
  innovation_student_en_proposal: "1Jrgr9H-ERnLfDAqQN_CS_lV0uw5dlZUdIXAknaWwrO4",
  innovation_lecturer_ms_report: "1VmxmoM3ppC_XBBVDjvF3jN_HziCZZpJdNT1okwogpSg",
  innovation_lecturer_en_report: "1J_ecaL8sMGa0gjbF6FDJK58bclFLHF9Wrq9PZ5RzmOk",
  innovation_student_ms_report: "1RzBfF6du9uIXXNhLDx6mXQAFruNnElxYnS7H_Hy0kVU",
  innovation_student_en_report: "1yzaRAtRn7cdM5J67h1nzSisFaq7DqyHxyQs8JomVqVY",
  innovation_certificate: "1UDlAfDrZZjJ0VVLaU8vPhpo5VknQgNpKdxIQuky3t4w",
  research_cat1_ms_appointment: "11nFMnx-oVpeFHEi2MAKROtW1N1HNyb-9Krp7Gl5CXdU",
  research_cat1_ms_appendix: "1icgQ-qs0-nqbD98e788D4Kv9eEaRqHZG4EMtcEZnstQ",
  research_cat1_ms_proposal: "1bFvTnQrDuAJDaimq_Y5fIyjfzS5RHOt5NWJtLp2Fd-s",
  research_cat3_ms_appendix: "1icgQ-qs0-nqbD98e788D4Kv9eEaRqHZG4EMtcEZnstQ",
  // Reuses Lampiran A
  research_cat3_ms_proposal: "11ZyJj3-SwT6mPgMjOZ8iVtDAymxR22zr-kjr0qbjoIs",
  research_cat4_ms_ppp_form: "1xzdAIhEir1CcThe0mHdcjzcOzwNoy8GI4H4moM0GLps",
  research_cat4_ms_ppp_proposal: "15BeGHI9zgoTAxEXSUqr5dlEg-lzjC3Id_HSFMx9mu8k",
  research_cat1_en_appointment: "11nFMnx-oVpeFHEi2MAKROtW1N1HNyb-9Krp7Gl5CXdU",
  // Fallback to BM layout
  research_cat1_en_appendix: "1h36dYDUmdXMwY_x2Y49ONvBSyL-DEJwQvnPDfkBR26o",
  research_cat1_en_proposal: "11bPtQP0nFEXA20yIHEXsno1f9mcIS8LcznIjEo47s2Y",
  research_cat3_en_appendix: "1h36dYDUmdXMwY_x2Y49ONvBSyL-DEJwQvnPDfkBR26o",
  // Reuses Appendix A
  research_cat3_en_proposal: "1YzzZe3WI7CIRWC8vGNCYKTeHoQ0ujY_6C-BVy1cFw-s",
  research_cat4_en_ppp_form: "173yx1CFvgqJaMa0qIFMnZZNTXEuBHj90NIjHPe8ZgcI",
  research_cat4_en_ppp_proposal: "17Zas_WPdmlVS5ox19a2qzGwOulp3TDuDbj_MB2pfEIM"
};
function buildReplacements(templateKey, app2) {
  const chiefName = app2.applicantName?.toUpperCase() || "";
  const chiefIc = app2.icNumber || "";
  const title = app2.title?.toUpperCase() || "";
  const members = app2.members || app2.innovationData?.members || app2.researchData?.members || [];
  const adminInfo = app2.adminOfficers || app2.innovationData?.adminInfo || app2.researchData?.adminInfo || {
    kupikName: "NORFAZIRAH BINTI KUSIN",
    deputyDirectorName: "AZLENAH BTE MOHD SEN",
    directorName: "Ts. JULKIFLI BIN AWANG BESAR (A.D.K)",
    ppiDirectorName: "Dr. Shahiza binti Ahmad Zainuddin"
  };
  const introduction = (app2.innovationData?.introduction || app2.researchData?.introduction || "").trim();
  const objectives = (app2.innovationData?.objectives || app2.researchData?.objectives || "").trim();
  const impactTargetGroup = (app2.innovationData?.impactTargetGroup || app2.researchData?.impactTargetGroup || "").trim();
  const impactInstitution = (app2.innovationData?.impactInstitution || app2.researchData?.impactInstitution || "").trim();
  const impactDepartment = (app2.innovationData?.impactDepartment || app2.researchData?.impactDepartment || "").trim();
  const instruments = (app2.researchData?.instruments || "").trim();
  return {
    "[NAMA KETUA]": chiefName,
    "[NAMA]": chiefName,
    "[ NAMA ]": chiefName,
    "[NAMA 1]": members[0]?.name || "",
    "[NAMA 2]": members[1]?.name || "",
    "[NAMA 3]": members[2]?.name || "",
    "[TAJUK]": title,
    "[TAJUK PENYELIDIKAN]": title,
    "[PENGARAH]": adminInfo.directorName || "",
    "Ts. JULKIFLI BIN AWANG BESAR, A.D.K": adminInfo.directorName || "",
    "[INSTITUSI]": app2.institution || "",
    "[PENGENALAN]": introduction,
    "[ PENGENALAN]": introduction,
    "[OBJEKTIF]": objectives,
    "[ OBJEKTIF]": objectives,
    "[INSTRUMEN]": instruments,
    "[ INSTRUMEN]": instruments,
    "[IMPAK SASARAN]": impactTargetGroup,
    "[ IMPAK SASARAN]": impactTargetGroup,
    "[IMPAK INSTITUSI]": impactInstitution,
    "[ IMPAK INSTITUSI]": impactInstitution,
    "[IMPAK JABATAN]": impactDepartment,
    "[IMPAK JABATAN ]": impactDepartment,
    "[TIMBALAN PENGARAH]": adminInfo.deputyDirectorName || "",
    "[INSTITUSI 1]": members[0]?.institution || "",
    "[INSTITUSI 2]": members[1]?.institution || "",
    "[INSTITUSI 3]": members[2]?.institution || "",
    "[NAMA KUPIK]": adminInfo.kupikName || "",
    "[PENGARAH PPI]": adminInfo.ppiDirectorName || "",
    "[NAMA PENGARAH PPI]": adminInfo.ppiDirectorName || "",
    "<<TAJUK INOVASI>>": title,
    "<<NAMA KETUA>>": chiefName,
    "<<PENGENALAN>>": introduction,
    "<<OBJEKTIF>>": objectives,
    "<<IMPAK SASARAN>>": impactTargetGroup,
    "<<IMPAK INSTITUSI>>": impactInstitution,
    "<<IMPAK JABATAN>>": impactDepartment,
    "<<PENGARAH>>": adminInfo.directorName || "",
    "<<INSTITUSI>>": app2.institution || "",
    "<<TIMBALAN PENGARAH>>": adminInfo.deputyDirectorName || "",
    "<<NAMA 1>>": members[0]?.name || "",
    "<<INSTITUSI 1>>": members[0]?.institution || "",
    "<<NAMA 2>>": members[1]?.name || "",
    "<<INSTITUSI 2>>": members[1]?.institution || "",
    "<<NAMA 3>>": members[2]?.name || "",
    "<<INSTITUSI 3>>": members[2]?.institution || "",
    "<<NAMA KUPIK>>": adminInfo.kupikName || "",
    "[NO. KP]": chiefIc,
    "[NO. TELEFON]": app2.researchData?.chiefPhone || "",
    "[JABATAN]": app2.researchData?.department || "",
    "[NO. KP 1]": members[0]?.icNumber || "",
    "[NO. TELEFON 1]": members[0]?.phone || "",
    "[JABATAN 1]": members[0]?.department || "",
    "[NO. KP 2]": members[1]?.icNumber || "",
    "[NO. TELEFON 2]": members[1]?.phone || "",
    "[JABATAN 2]": members[1]?.department || "",
    "[NO. KP 3]": members[2]?.icNumber || "",
    "[NO. TELEFON 3]": members[2]?.phone || "",
    "[JABATAN 3]": members[2]?.department || "",
    "[PERSIDANGAN]": app2.researchData?.conference || "",
    "[TEMPAT]": app2.researchData?.location || "",
    "[SAMPEL]": app2.researchData?.sample || "",
    "[ALAMAT]": app2.researchData?.address || "",
    "[PEKERJAAN]": app2.researchData?.occupation || "",
    "[ALAMAT INSTITUSI]": app2.researchData?.institutionAddress || "",
    "[NO. TEL INSTITUSI]": app2.researchData?.institutionPhone || "",
    "[FAKULTI/JABATAN]": app2.researchData?.department || "",
    "[TAHUN PENGAJIAN]": app2.researchData?.studyYear || "",
    "[MULA RINTIS]": app2.researchData?.pilotStartDate || "",
    "[AKHIR RINTIS]": app2.researchData?.pilotEndDate || "",
    "[MULA SEBENAR]": app2.researchData?.actualStartDate || "",
    "[AKHIR SEBENAR]": app2.researchData?.actualEndDate || "",
    "[TARIKH LAPORAN]": app2.researchData?.expectedReportDate || ""
  };
}
app.post("/api/documents/generate-docx", async (req, res) => {
  try {
    const { templateKey, applicationId } = req.body;
    const appRecord = db.applications.find((a) => a.id === applicationId || a.applicationId === applicationId);
    if (!appRecord) {
      return res.status(404).json({ error: "Permohonan tidak dijumpai." });
    }
    const templateId = GOOGLE_DOC_TEMPLATES[templateKey];
    if (!templateId) {
      return res.status(400).json({ error: "Templat dokumen tidak dijumpai." });
    }
    console.log(`[Local DOCX Generator] Downloading template: ${templateKey} (${templateId})...`);
    const templateUrl = `https://docs.google.com/document/d/${templateId}/export?format=docx`;
    const templateRes = await fetch(templateUrl);
    if (!templateRes.ok) {
      return res.status(500).json({ error: `Gagal memuat turun templat daripada Google Docs (HTTP ${templateRes.status}).` });
    }
    const arrayBuffer = await templateRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[Local DOCX Generator] Rendering template with docxtemplater...`);
    const zip = new import_pizzip.default(buffer);
    const doc = new import_docxtemplater.default(zip, {
      delimiters: { start: "[", end: "]" },
      paragraphLoop: true,
      linebreaks: true
    });
    const replacements = buildReplacements(templateKey, appRecord);
    const cleanReplacements = {};
    for (const [key, value] of Object.entries(replacements)) {
      const cleanKey = key.replace(/^\[/, "").replace(/\]$/, "");
      cleanReplacements[cleanKey] = value;
    }
    doc.render(cleanReplacements);
    const outBuffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE"
    });
    const docName = `${applicationId}_${templateKey}.docx`;
    console.log(`[Local DOCX Generator] Document ${docName} successfully generated (${outBuffer.length} bytes)!`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${docName}"`);
    res.send(outBuffer);
  } catch (err) {
    console.error("[Local DOCX Generator] Failed to generate document:", err.message);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/documents/generate-pdf", async (req, res) => {
  try {
    const { templateKey, applicationId } = req.body;
    const appRecord = db.applications.find((a) => a.id === applicationId || a.applicationId === applicationId);
    if (!appRecord) {
      return res.status(404).json({ error: "Permohonan tidak dijumpai." });
    }
    const templateId = GOOGLE_DOC_TEMPLATES[templateKey];
    if (!templateId) {
      return res.status(400).json({ error: "Templat dokumen tidak dijumpai." });
    }
    console.log(`[Local PDF Generator] Downloading PDF template: ${templateKey} (${templateId})...`);
    let pdfUrl = `https://docs.google.com/presentation/d/${templateId}/export/pdf`;
    let pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) {
      pdfUrl = `https://docs.google.com/document/d/${templateId}/export?format=pdf`;
      pdfRes = await fetch(pdfUrl);
    }
    if (!pdfRes.ok) {
      return res.status(500).json({ error: `Gagal memuat turun PDF daripada Google (HTTP ${pdfRes.status}).` });
    }
    const arrayBuffer = await pdfRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const docName = `${applicationId}_${templateKey}.pdf`;
    console.log(`[Local PDF Generator] PDF Document ${docName} successfully generated (${buffer.length} bytes)!`);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${docName}"`);
    res.send(buffer);
  } catch (err) {
    console.error("[Local PDF Generator] Failed to generate PDF:", err.message);
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/integrations/status", (req, res) => {
  res.json({
    googleSheets: {
      status: "CONNECTED",
      innovationSheetUrl: "https://docs.google.com/spreadsheets/d/1EEVIAGcK56R2ImX24KykRdN183evSoydx0BBwzz__Ts/edit?usp=sharing",
      researchSheetUrl: "https://docs.google.com/spreadsheets/d/1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY/edit?usp=sharing",
      syncedRecordsCount: db.applications.length,
      lastSync: (/* @__PURE__ */ new Date()).toISOString()
    },
    googleDrive: {
      status: "CONNECTED",
      rootFolderUrl: "https://drive.google.com/drive/folders/1egXO2QrPNoRnngA9fgfIe39-hiykscjK?usp=sharing",
      totalDocumentsStored: db.applications.reduce((acc, a) => acc + (a.generatedDocuments?.length || 0), 0)
    }
  });
});
app.get("/api/export", (req, res) => {
  const { type, year } = req.query;
  let list = [...db.applications];
  if (type && type !== "ALL") {
    list = list.filter((a) => a.applicationType === type);
  }
  if (year && year !== "ALL") {
    list = list.filter((a) => a.year === Number(year));
  }
  const csvHeader = [
    "No",
    "Application ID",
    "Jenis Permohonan",
    "Kategori",
    "Tahun",
    "Bahasa",
    "No Kad Pengenalan",
    "Nama Pemohon",
    "Institusi",
    "Tajuk",
    "Status Rekod",
    "Tarikh Permohonan",
    "Google Drive Folder"
  ].join(",");
  const csvRows = list.map((a, idx) => {
    return [
      idx + 1,
      `"${a.applicationId}"`,
      `"${a.applicationType}"`,
      `"${a.category || "-"}"`,
      a.year,
      `"${a.language}"`,
      `"${a.icNumber}"`,
      `"${a.applicantName.replace(/"/g, '""')}"`,
      `"${a.institution.replace(/"/g, '""')}"`,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.status}"`,
      `"${new Date(a.createdAt).toLocaleString("ms-MY")}"`,
      `"${a.driveUrl}"`
    ].join(",");
  });
  const csvContent = [csvHeader, ...csvRows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="iREPRO_Rekod_${type || "Semua"}_${year || "Semua"}.csv"`);
  res.send(csvContent);
});
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath, { etag: false, lastModified: false, setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.set("Pragma", "no-cache");
      }
    } }));
    app.get("*", (req, res) => {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.set("Pragma", "no-cache");
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`iREPRO Server running on http://localhost:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  start();
}
var server_default = app;
//# sourceMappingURL=server.cjs.map
