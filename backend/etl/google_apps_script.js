/**
 * Google Apps Script - SIG PTPN Real-Time Integration
 * 
 * Petunjuk Penggunaan:
 * 1. Di Google Sheets Anda, buka menu: Extensions -> Apps Script.
 * 2. Hapus kode default, lalu salin (paste) seluruh isi script ini.
 * 3. Ubah nilai variabel `API_URL` dan `API_KEY` di bawah ini sesuai konfigurasi hosting backend Anda.
 * 4. Simpan proyek Apps Script, lalu reload Google Sheets Anda.
 * 5. Menu baru "SIG PTPN R7" akan muncul di bar atas. Anda bisa mengklik tombol di menu tersebut
 *    untuk mengirim data sheet aktif Anda ke database SIG.
 */

// Konfigurasi Webhook
var API_URL = "http://localhost:8000/api/sync/webhook"; // Ganti dengan URL domain produksi Anda saat dideploy
var API_KEY = "ptpn7-secret-sync-key-2026";             // Ganti dengan API Key yang sama dengan .env SYNC_API_KEY Anda

/**
 * Membuat menu kustom saat Google Sheets dibuka.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('SIG PTPN R7')
      .addItem('Kirim Data Sheet Aktif ke SIG', 'syncActiveSheetToSIG')
      .addToUi();
}

/**
 * Fungsi utama untuk membaca data dari tab sheet aktif dan mengirimkannya ke API SIG.
 */
function syncActiveSheetToSIG() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  
  // Validasi tipe sheet
  var validSheets = ["produksi_harian", "pemeliharaan_harian", "pemupukan_harian"];
  if (validSheets.indexOf(sheetName) === -1) {
    SpreadsheetApp.getUi().alert(
      "Gagal Sinkronisasi",
      "Nama tab sheet saat ini '" + sheetName + "' tidak valid.\n" +
      "Pastikan Anda berada di salah satu tab berikut untuk melakukan sinkronisasi:\n" +
      "1. produksi_harian\n" +
      "2. pemeliharaan_harian\n" +
      "3. pemupukan_harian",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    SpreadsheetApp.getUi().alert("Gagal", "Sheet '" + sheetName + "' tidak memiliki baris data untuk dikirim.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var headers = data[0];
  var payloadRows = [];
  
  // Proses baris demi baris
  for (var i = 1; i < data.length; i++) {
    var row = {};
    var rowIsEmpty = true;
    
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j].toString().trim();
      var cellVal = data[i][j];
      
      // Lewati kolom kosong tanpa header
      if (headerName === "") continue;
      
      // Formatting Tanggal ke string format YYYY-MM-DD
      if (cellVal instanceof Date) {
        // Gunakan timezone script/spreadsheet untuk memformat tanggal
        cellVal = Utilities.formatDate(cellVal, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "yyyy-MM-dd");
      }
      
      row[headerName] = cellVal;
      
      // Cek apakah baris ini benar-benar berisi data
      if (cellVal !== "" && cellVal !== null && cellVal !== undefined) {
        rowIsEmpty = false;
      }
    }
    
    // Hanya masukkan baris yang tidak kosong
    if (!rowIsEmpty) {
      payloadRows.push(row);
    }
  }
  
  if (payloadRows.length === 0) {
    SpreadsheetApp.getUi().alert("Gagal", "Tidak ada data yang valid untuk dikirim.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  // Siapkan payload JSON
  var payload = {
    "sheet_type": sheetName,
    "rows": payloadRows
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "X-API-Key": API_KEY
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true // Agar kita bisa membaca detail error response dari server
  };
  
  SpreadsheetApp.getActiveSpreadsheet().toast("Sedang mengirim " + payloadRows.length + " data ke SIG...", "Sinkronisasi...", 10);
  
  try {
    var response = UrlFetchApp.fetch(API_URL, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    var result = JSON.parse(responseText);
    
    if (responseCode === 200) {
      var summaryMsg = "Sinkronisasi Berhasil!\n" +
                       "• Total data dikirim: " + result.processed + "\n" +
                       "• Sukses tersimpan (Upsert): " + result.inserted_updated + "\n";
      
      if (result.errors && result.errors.length > 0) {
        summaryMsg += "\nBeberapa baris dilewati karena error:\n" + result.errors.join("\n");
        SpreadsheetApp.getUi().alert("Sinkronisasi Selesai dengan Catatan", summaryMsg, SpreadsheetApp.getUi().ButtonSet.OK);
      } else {
        SpreadsheetApp.getUi().alert("Sukses", summaryMsg, SpreadsheetApp.getUi().ButtonSet.OK);
      }
    } else {
      var errorDetail = result.detail || responseText;
      SpreadsheetApp.getUi().alert(
        "Koneksi Gagal (HTTP " + responseCode + ")",
        "Pesan server:\n" + errorDetail,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      "Gagal Menghubungi Server SIG",
      "Tidak dapat terhubung ke URL API: " + API_URL + "\n\n" +
      "Penyebab umum:\n" +
      "1. Server backend SIG tidak aktif atau sedang down.\n" +
      "2. URL API salah atau salah ketik.\n" +
      "3. Masalah jaringan internet.\n\n" +
      "Detail teknis: " + error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}
