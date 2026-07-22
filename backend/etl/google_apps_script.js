/**
 * Google Apps Script - SIG PTPN Real-Time Auto-Sync (v3.1 - Installable Trigger)
 * 
 * PENTING: Karena kebijakan keamanan Google, trigger otomatis yang memanggil
 * API eksternal (UrlFetchApp) memerlukan "Installable Trigger" di Google Sheets.
 * 
 * PETUNJUK SETUP UTAMA (Wajib Dilakukan Sekali):
 * 1. Di Google Sheets Anda, buka menu: Extensions -> Apps Script.
 * 2. Hapus seluruh kode lama, lalu salin (paste) seluruh isi script ini.
 * 3. Simpan proyek dengan menekan tombol disket (Save).
 * 4. Di bagian menu kiri Apps Script, klik ikon jam weker (Triggers).
 * 5. Klik tombol "+ Add Trigger" di pojok kanan bawah.
 * 6. Konfigurasi Trigger:
 *    - Choose which function to run: Pilih "sigAutoSync" (JANGAN pilih onEdit)
 *    - Choose which deployment should run: Pilih "Head"
 *    - Select event source: Pilih "From spreadsheet"
 *    - Select event type: Pilih "On edit"
 * 7. Klik "Save" dan setujui izin akses keamanan yang diminta Google.
 * 
 * Setelah itu, setiap kali Anda selesai mengisi/mengubah baris di spreadsheet,
 * data akan langsung sinkron secara otomatis ke database!
 */

// Konfigurasi Webhook
var API_BASE_URL = "https://sig-ptpn-1-regional-7.onrender.com/api/sync"; 
var API_KEY = "kunci-rahasia-pilihan-anda-2026";                       

/**
 * Fungsi trigger utama untuk Installable Edit Trigger (Mendukung Multi-Baris / Copy-Paste Bulk).
 */
function sigAutoSync(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var sheetName = sheet.getName();
  
  // Validasi tab sheet yang didukung
  var validSheets = ["produksi_harian", "pemeliharaan_harian", "pemupukan_harian"];
  if (validSheets.indexOf(sheetName) === -1) return;
  
  var startRow = range.getRow();
  var numRows = range.getNumRows();
  
  // Dapatkan seluruh header kolom
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idColIdx = headers.indexOf("id_fakta");
  
  // Jika kolom 'id_fakta' tidak ditemukan, buat secara otomatis sebagai Kolom A
  if (idColIdx === -1) {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue("id_fakta");
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    idColIdx = 0;
  }
  
  var rowsToSync = [];
  var rowIndices = []; // Menyimpan koordinat baris asli untuk penulisan ID balik
  
  // Ambil semua data pada area yang diedit sekaligus
  var dataRange = sheet.getRange(startRow, 1, numRows, headers.length);
  var allValues = dataRange.getValues();
  
  for (var i = 0; i < numRows; i++) {
    var currentRowNum = startRow + i;
    if (currentRowNum === 1) continue; // Skip header row
    
    var rowValues = allValues[i];
    var idFakta = rowValues[idColIdx];
    
    // Bentuk objek payload data
    var rowData = {};
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j].toString().trim();
      if (headerName === "") continue;
      
      var cellVal = rowValues[j];
      
      // Format Tanggal ke string YYYY-MM-DD
      if (cellVal instanceof Date) {
        cellVal = Utilities.formatDate(cellVal, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "yyyy-MM-dd");
      }
      
      if (cellVal === "") {
        cellVal = null;
      }
      rowData[headerName] = cellVal;
    }
    
    // VALIDASI KOLOM WAJIB DINAMIS SESUAI SHEET (Hanya jika ini data baru / Insert)
    var isInsert = (idFakta === "" || idFakta === null || idFakta === undefined);
    var isValid = true;
    
    if (isInsert) {
      if (!rowData["tanggal"]) {
        isValid = false;
      } else if (sheetName === "produksi_harian") {
        var hasAfd = rowData["id_afdeling"] || (rowData["kebun"] && rowData["afdeling"]);
        if (!hasAfd) isValid = false;
      } else if (sheetName === "pemeliharaan_harian") {
        if (!rowData["jenis_kegiatan"]) isValid = false;
        var hasBlok = rowData["blok_id"] || rowData["kode_blok"] || rowData["no_polygon"];
        if (!hasBlok) isValid = false;
      } else if (sheetName === "pemupukan_harian") {
        if (!rowData["jenis_pupuk"] || rowData["jumlah_pupuk"] === null || rowData["jumlah_pupuk"] === undefined) isValid = false;
        var hasBlok = rowData["blok_id"] || rowData["kode_blok"] || rowData["no_polygon"];
        if (!hasBlok) isValid = false;
      }
    }
    
    if (isValid) {
      rowsToSync.push(rowData);
      rowIndices.push({
        rowNum: currentRowNum,
        isInsert: isInsert
      });
    }
  }
  
  if (rowsToSync.length === 0) return;
  
  // Kirim seluruh data baris sekaligus ke database (Batch Webhook)
  syncBatchToSIG(sheet, sheetName, idColIdx, rowsToSync, rowIndices);
}

/**
 * Mengirimkan kumpulan data baris secara batch ke webhook backend
 */
function syncBatchToSIG(sheet, sheetType, idColIdx, rowsToSync, rowIndices) {
  var payload = {
    "sheet_type": sheetType,
    "rows": rowsToSync
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "X-API-Key": API_KEY
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    var response = UrlFetchApp.fetch(API_BASE_URL + "/webhook", options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    var result = JSON.parse(responseText);
    
    if (responseCode === 200) {
      var successCount = result.inserted_updated || 0;
      var newIdsCount = 0;
      
      // Gunakan hasil baris per baris (results) dari server jika tersedia
      if (result.results && result.results.length === rowsToSync.length) {
        for (var k = 0; k < result.results.length; k++) {
          var res = result.results[k];
          var info = rowIndices[k];
          if (res.status === "success" && info.isInsert) {
            sheet.getRange(info.rowNum, idColIdx + 1).setValue(res.id_fakta || res.id);
            newIdsCount++;
          }
        }
      }
      // Fallback menggunakan array row_ids (bila semua baris sukses)
      else if (result.row_ids && result.row_ids.length === rowsToSync.length) {
        for (var k = 0; k < result.row_ids.length; k++) {
          var info = rowIndices[k];
          if (info.isInsert) {
            sheet.getRange(info.rowNum, idColIdx + 1).setValue(result.row_ids[k]);
            newIdsCount++;
          }
        }
      }
      
      var msg = "Berhasil sinkronisasi " + successCount + " data baris ke database.";
      if (newIdsCount > 0) {
        msg += " " + newIdsCount + " ID fakta baru ditulis ke Sheets.";
      }
      
      if (result.errors && result.errors.length > 0) {
        msg += " Namun terdapat " + result.errors.length + " data baris yang error.";
        Logger.log("Errors: " + JSON.stringify(result.errors));
      }
      
      SpreadsheetApp.getActiveSpreadsheet().toast(msg, "Batch Sync Selesai", 5);
      
    } else {
      var errorDetail = result.detail || responseText;
      Logger.log("Batch Sync Gagal: " + errorDetail);
      SpreadsheetApp.getActiveSpreadsheet().toast("Error: " + errorDetail, "Batch Sync Gagal", 5);
    }
  } catch (error) {
    Logger.log("Gagal menghubungi server SIG: " + error.toString());
    SpreadsheetApp.getActiveSpreadsheet().toast("Koneksi gagal: " + error.toString(), "Batch Sync Gagal", 5);
  }
}
