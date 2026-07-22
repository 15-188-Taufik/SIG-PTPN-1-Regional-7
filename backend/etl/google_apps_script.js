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
 * Fungsi trigger utama untuk Installable Edit Trigger.
 */
function sigAutoSync(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var sheetName = sheet.getName();
  
  // Validasi tab sheet yang didukung
  var validSheets = ["produksi_harian", "pemeliharaan_harian", "pemupukan_harian"];
  if (validSheets.indexOf(sheetName) === -1) return;
  
  var row = range.getRow();
  if (row === 1) return; // Jangan proses header
  
  // Dapatkan seluruh header kolom
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idColIdx = headers.indexOf("id_fakta");
  
  // Jika kolom 'id_fakta' tidak ditemukan, buat secara otomatis sebagai Kolom A
  if (idColIdx === -1) {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue("id_fakta");
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    idColIdx = 0;
    // Karena kolom bergeser, sesuaikan sel yang sedang aktif
    range = sheet.getRange(row, range.getColumn() + 1);
  }
  
  // Baca seluruh data pada baris yang sedang diedit
  var rowValues = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
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
  
  // VALIDASI KOLOM WAJIB DINAMIS SESUAI SHEET
  var isInsert = (idFakta === "" || idFakta === null || idFakta === undefined);
  
  if (isInsert) {
    // 1. Tanggal wajib ada di semua tipe sheet
    if (!rowData["tanggal"]) return;

    if (sheetName === "produksi_harian") {
      // Produksi Harian butuh afdeling
      var hasAfd = rowData["id_afdeling"] || (rowData["kebun"] && rowData["afdeling"]);
      if (!hasAfd) return;
    } 
    else if (sheetName === "pemeliharaan_harian") {
      // Pemeliharaan Harian butuh jenis_kegiatan & pengenal blok
      if (!rowData["jenis_kegiatan"]) return;
      var hasBlok = rowData["blok_id"] || rowData["kode_blok"] || rowData["no_polygon"];
      if (!hasBlok) return;
    } 
    else if (sheetName === "pemupukan_harian") {
      // Pemupukan Harian butuh jenis_pupuk, jumlah_pupuk & pengenal blok
      if (!rowData["jenis_pupuk"] || rowData["jumlah_pupuk"] === null || rowData["jumlah_pupuk"] === undefined) return;
      var hasBlok = rowData["blok_id"] || rowData["kode_blok"] || rowData["no_polygon"];
      if (!hasBlok) return;
    }
  }
  
  // Kirim data baris ke database
  syncSingleRowToSIG(sheet, row, idColIdx, sheetName, rowData, isInsert);
}

/**
 * Mengirimkan data baris ke webhook backend
 */
function syncSingleRowToSIG(sheet, rowNum, idColIdx, sheetType, rowData, isInsert) {
  var payload = {
    "sheet_type": sheetType,
    "rows": [rowData]
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
    
    if (responseCode === 200 && result.row_ids && result.row_ids.length > 0) {
      // Tulis kembali ID fakta ke kolom A jika ini adalah baris baru
      if (isInsert) {
        sheet.getRange(rowNum, idColIdx + 1).setValue(result.row_ids[0]);
        SpreadsheetApp.getActiveSpreadsheet().toast("Data baru disinkronisasi ke database. ID: " + result.row_ids[0], "Auto-Sync Sukses", 3);
      } else {
        SpreadsheetApp.getActiveSpreadsheet().toast("Perubahan data di-update ke database. ID: " + rowData.id_fakta, "Auto-Sync Sukses", 3);
      }
    } else {
      var errorDetail = result.detail || responseText;
      Logger.log("Auto-Sync Gagal: " + errorDetail);
      SpreadsheetApp.getActiveSpreadsheet().toast("Error: " + errorDetail, "Auto-Sync Gagal", 4);
    }
  } catch (error) {
    Logger.log("Gagal menghubungi server SIG: " + error.toString());
  }
}
