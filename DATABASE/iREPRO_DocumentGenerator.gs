/**
 * GOOGLE APPS SCRIPT FOR iREPRO HIGH-FIDELITY DOCUMENT GENERATION
 *
 * CARA DEPLOY (PENTING - BACA SEBELUM DEPLOY):
 * 1. Salin SEMUA kod ini ke dalam editor Apps Script anda.
 * 2. Simpan (Ctrl+S).
 * 3. Klik "Deploy" -> "Manage deployments".
 * 4. Pilih deployment aktif -> Klik ikon pensel (Edit).
 * 5. Tukar "Version" kepada "New version".
 * 6. Klik "Deploy". URL tidak akan berubah.
 *
 * ATAU buat deployment BARU:
 * 1. Klik "Deploy" -> "New deployment".
 * 2. Type: Web app | Execute as: Me | Who has access: Anyone
 * 3. Klik "Deploy" -> Salin URL baru -> Kemaskini APPS_SCRIPT_URL di Vercel.
 *
 * IMPORTANT: Every time you update this code, you must create a NEW deployment 
 * (Deploy -> New deployment) OR update the existing deployment version 
 * (Deploy -> Manage deployments -> Edit -> New version -> Deploy).
 */

// ⚡ JALANKAN FUNGSI INI DI EDITOR UNTUK BERI KEBENARAN (AUTHORIZATION) ⚡
// Klik butang "Run" di atas editor Apps Script selepas memilih fungsi ini.
function initAuthorization() {
  Logger.log("Menguji kebenaran Drive dan Document...");
  try {
    var root = DriveApp.getRootFolder();
    Logger.log("Akses Drive berjaya! Nama folder root: " + root.getName());
    var doc = DocumentApp.create("iREPRO Auth Test");
    Logger.log("Akses Document berjaya! ID doc: " + doc.getId());
    DriveApp.getFileById(doc.getId()).setTrashed(true); // padam test file
    Logger.log("Semua kebenaran (Authorization) berjaya diluluskan! Sila deploy semula.");
  } catch (err) {
    Logger.log("Ralat kebenaran: " + err.toString());
  }
}

// ⚡ JALANKAN FUNGSI INI UNTUK UJI JIKA AKAUN ANDA BOLEH AKSES TEMPLATE ⚡
function testCopy() {
  var templateId = "1oTMDV7wNeVI0M8tTHZBxRBuxHZ9Vw0wLTz19h8h7jvw"; // BM Inovasi Proposal
  try {
    var file = DriveApp.getFileById(templateId);
    Logger.log("BERJAYA! Template dijumpai: " + file.getName());
    var copy = file.makeCopy("Test Copy");
    DriveApp.getFileById(copy.getId()).setTrashed(true);
    Logger.log("BERJAYA! Boleh salin template.");
  } catch (err) {
    Logger.log("RALAT AKSES TEMPLATE: " + err.toString());
    Logger.log("Penyelesaian: Sila pastikan akaun Google anda (" + Session.getActiveUser().getEmail() + ") mempunyai akses Edit/View pada template Google Docs ini, atau buat salinan template baru dan masukkan ID baru.");
  }
}

// Health check via GET - verify code version is correct
// Also supports appendRow via GET query params for server-to-server calls
function doGet(e) {
  var params = e ? e.parameter : {};

  // Support appendRow via GET: ?action=appendRow&sheet=inovasi&data=[...]
  if (params.action === "appendRow" && params.sheet && params.data) {
    try {
      var sheetId = params.spreadsheetId || "1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY";
      var rowValues = JSON.parse(decodeURIComponent(params.data));
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName(params.sheet);
      if (!sheet) {
        var sheets = ss.getSheets();
        for (var i = 0; i < sheets.length; i++) {
          if (sheets[i].getName().toLowerCase() === params.sheet.toLowerCase()) {
            sheet = sheets[i];
            break;
          }
        }
      }
      if (!sheet) {
        return createJsonResponse({ success: false, error: "Sheet '" + params.sheet + "' tidak dijumpai." });
      }
      sheet.appendRow(rowValues);
      return createJsonResponse({ success: true, message: "Berjaya tambah baris ke " + params.sheet });
    } catch (err) {
      return createJsonResponse({ success: false, error: err.toString() });
    }
  }

  // Support deleteRow via GET: ?action=deleteRow&sheet=inovasi&rowIndex=3
  // rowIndex is 1-based (actual sheet row number, including header row 1)
  if (params.action === "deleteRow" && params.sheet && params.rowIndex) {
    try {
      var sheetId = params.spreadsheetId || "1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY";
      var rowIndex = parseInt(params.rowIndex);
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName(params.sheet);
      if (!sheet) {
        var sheets = ss.getSheets();
        for (var i = 0; i < sheets.length; i++) {
          if (sheets[i].getName().toLowerCase() === params.sheet.toLowerCase()) {
            sheet = sheets[i];
            break;
          }
        }
      }
      if (!sheet) {
        return createJsonResponse({ success: false, error: "Sheet '" + params.sheet + "' tidak dijumpai." });
      }
      // rowIndex from app is the gviz idx (0-based data row), sheet row = rowIndex + 1 (header) + 1 (1-based)
      var sheetRow = rowIndex + 2; // +1 for header, +1 for 1-based index
      if (sheetRow < 2 || sheetRow > sheet.getLastRow()) {
        return createJsonResponse({ success: false, error: "Row index " + sheetRow + " di luar had sheet." });
      }
      sheet.deleteRow(sheetRow);
      return createJsonResponse({ success: true, message: "Berjaya padam baris " + sheetRow + " dari " + params.sheet });
    } catch (err) {
      return createJsonResponse({ success: false, error: err.toString() });
    }
  }

  // Support updateRow via GET: ?action=updateRow&sheet=inovasi&rowIndex=3&data=[...]
  if (params.action === "updateRow" && params.sheet && params.rowIndex !== undefined && params.data) {
    try {
      var sheetId = params.spreadsheetId || "1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY";
      var rowIndex = parseInt(params.rowIndex);
      var rowValues = JSON.parse(decodeURIComponent(params.data));
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName(params.sheet);
      if (!sheet) {
        var sheets = ss.getSheets();
        for (var i = 0; i < sheets.length; i++) {
          if (sheets[i].getName().toLowerCase() === params.sheet.toLowerCase()) {
            sheet = sheets[i];
            break;
          }
        }
      }
      if (!sheet) {
        return createJsonResponse({ success: false, error: "Sheet '" + params.sheet + "' tidak dijumpai." });
      }
      var sheetRow = rowIndex + 2; // +1 for header row, +1 for 1-based index
      if (sheetRow < 2 || sheetRow > sheet.getLastRow()) {
        return createJsonResponse({ success: false, error: "Row index " + sheetRow + " di luar had sheet." });
      }
      var range = sheet.getRange(sheetRow, 1, 1, rowValues.length);
      range.setValues([rowValues]);
      return createJsonResponse({ success: true, message: "Berjaya kemaskini baris " + sheetRow + " di " + params.sheet });
    } catch (err) {
      return createJsonResponse({ success: false, error: err.toString() });
    }
  }

  return createJsonResponse({
    status: "ok",
    version: "3.0-with-updateRow",
    message: "iREPRO Document Generator berjalan. Guna POST untuk jana dokumen atau kemaskini Sheet."
  });
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    // ── ACTION: appendRow ── Tulis baris terus ke Google Sheet
    if (payload.action === "appendRow" || (payload.targetSheet && payload.action !== "updateRow" && payload.action !== "deleteRow")) {
      var sheetId = payload.spreadsheetId || "1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY";
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName(payload.targetSheet);

      // Fallback: cari nama sheet tanpa ambil kisah huruf besar/kecil
      if (!sheet) {
        var sheets = ss.getSheets();
        for (var i = 0; i < sheets.length; i++) {
          if (sheets[i].getName().toLowerCase() === payload.targetSheet.toLowerCase()) {
            sheet = sheets[i];
            break;
          }
        }
      }

      if (!sheet) {
        return createJsonResponse({ success: false, error: "Sheet '" + payload.targetSheet + "' tidak dijumpai." });
      }

      sheet.appendRow(payload.rowValues);
      return createJsonResponse({ success: true, message: "Berjaya tambah baris ke " + payload.targetSheet });
    }

    // ── ACTION: updateRow ── Kemaskini baris terus ke Google Sheet
    if (payload.action === "updateRow" && payload.targetSheet && payload.rowIndex !== undefined && payload.rowValues) {
      var sheetId = payload.spreadsheetId || "1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY";
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName(payload.targetSheet);
      if (!sheet) {
        var sheets = ss.getSheets();
        for (var i = 0; i < sheets.length; i++) {
          if (sheets[i].getName().toLowerCase() === payload.targetSheet.toLowerCase()) {
            sheet = sheets[i];
            break;
          }
        }
      }
      if (!sheet) {
        return createJsonResponse({ success: false, error: "Sheet '" + payload.targetSheet + "' tidak dijumpai." });
      }
      var rowIndex = parseInt(payload.rowIndex);
      var sheetRow = rowIndex + 2; // +1 for header row, +1 for 1-based index
      if (sheetRow < 2 || sheetRow > sheet.getLastRow()) {
        return createJsonResponse({ success: false, error: "Row index " + sheetRow + " di luar had sheet." });
      }
      var range = sheet.getRange(sheetRow, 1, 1, payload.rowValues.length);
      range.setValues([payload.rowValues]);
      return createJsonResponse({ success: true, message: "Berjaya kemaskini baris " + sheetRow + " di " + payload.targetSheet });
    }

    // ── ACTION: deleteRow ── Padam baris terus dari Google Sheet
    if (payload.action === "deleteRow" && payload.targetSheet && payload.rowIndex !== undefined) {
      var sheetId = payload.spreadsheetId || "1PEMSNeV9dnY4LZZpbE_CpcIJqccJ3SjPnCZ9fAN5uBY";
      var ss = SpreadsheetApp.openById(sheetId);
      var sheet = ss.getSheetByName(payload.targetSheet);
      if (!sheet) {
        var sheets = ss.getSheets();
        for (var i = 0; i < sheets.length; i++) {
          if (sheets[i].getName().toLowerCase() === payload.targetSheet.toLowerCase()) {
            sheet = sheets[i];
            break;
          }
        }
      }
      if (!sheet) {
        return createJsonResponse({ success: false, error: "Sheet '" + payload.targetSheet + "' tidak dijumpai." });
      }
      var rowIndex = parseInt(payload.rowIndex);
      var sheetRow = rowIndex + 2; // +1 for header row, +1 for 1-based index
      if (sheetRow < 2 || sheetRow > sheet.getLastRow()) {
        return createJsonResponse({ success: false, error: "Row index " + sheetRow + " di luar had sheet." });
      }
      sheet.deleteRow(sheetRow);
      return createJsonResponse({ success: true, message: "Berjaya padam baris " + sheetRow + " dari " + payload.targetSheet });
    }

    // ── ACTION: Jana dokumen dari template Google Docs ──
    var templateId = payload.templateId;
    var fileName = payload.fileName;
    var replacements = payload.replacements;

    if (!templateId) {
      return createJsonResponse({ success: false, error: "templateId diperlukan." });
    }

    // 1. Salin fail template dalam Google Drive
    var templateFile = DriveApp.getFileById(templateId);
    var newFile = templateFile.makeCopy(fileName);
    var newDocId = newFile.getId();

    // 2. Buka salinan dan gantikan placeholder
    var doc = DocumentApp.openById(newDocId);
    var body = doc.getBody();

    for (var key in replacements) {
      if (replacements.hasOwnProperty(key)) {
        body.replaceText(escapeRegex(key), replacements[key] || "");
      }
    }

    // Gantikan dalam header jika ada
    var header = doc.getHeader();
    if (header) {
      for (var key in replacements) {
        if (replacements.hasOwnProperty(key)) {
          header.replaceText(escapeRegex(key), replacements[key] || "");
        }
      }
    }

    // Gantikan dalam footer jika ada
    var footer = doc.getFooter();
    if (footer) {
      for (var key in replacements) {
        if (replacements.hasOwnProperty(key)) {
          footer.replaceText(escapeRegex(key), replacements[key] || "");
        }
      }
    }

    doc.saveAndClose();

    // 3. Beri akses kepada sesiapa yang ada pautan
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Pautan muat turun terus sebagai .docx
    var docxUrl = "https://docs.google.com/document/d/" + newDocId + "/export?format=docx";

    return createJsonResponse({
      success: true,
      documentId: newDocId,
      driveUrl: newFile.getUrl(),
      docxUrl: docxUrl
    });

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeRegex(string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
