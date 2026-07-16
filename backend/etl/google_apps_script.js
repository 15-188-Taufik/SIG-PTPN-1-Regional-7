/**
 * Google Apps Script - SIG PTPN Real-Time Integration (v2.2)
 * 
 * Fitur Baru:
 * 1. Dua Menu Utama Terpisah: "Kirim data ke PTPN" dan "Hapus data" di bar atas Google Sheets.
 * 2. Auto-create & Writeback ID: Menyisipkan kolom "id_fakta" secara otomatis dan menuliskan ID database kembali ke sheet.
 * 3. Edit/Replace Data: Baris yang sudah memiliki id_fakta akan di-update (termasuk tanggal & kegiatan).
 * 4. Hapus Data Terpilih: Menghapus data dari database & spreadsheet sekaligus.
 * 
 * Petunjuk Penggunaan:
 * 1. Di Google Sheets Anda, buka menu: Extensions -> Apps Script.
 * 2. Hapus seluruh kode lama, lalu salin (paste) seluruh isi script ini.
 * 3. Simpan proyek Apps Script dengan menekan tombol disket (Save).
 * 4. PENTING: Muat ulang (reload/refresh) halaman Google Sheets Anda di browser agar tombol menu baru muncul.
 */

// Konfigurasi Webhook
var API_BASE_URL = "https://sig-ptpn-1-regional-7.onrender.com/api/sync"; 
var API_KEY = "kunci-rahasia-pilihan-anda-2026";                       

/**
 * Membuat menu kustom di bar atas Google Sheets secara terpisah.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  // Menu 1: Kirim data ke PTPN
  ui.createMenu('Kirim data ke PTPN')
      .addItem('Kirim Data Sheet Aktif', 'syncActiveSheetToSIG')
      .addToUi();
      
  // Menu 2: Hapus data
  ui.createMenu('Hapus data')
      .addItem('Hapus Baris Terpilih dari Database', 'deleteSelectedRowsFromSIG')
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
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("Gagal", "Sheet '" + sheetName + "' tidak memiliki baris data untuk dikirim.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // 1. Cek atau Buat Kolom "id_fakta" sebagai kolom pertama (Kolom A)
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idColIdx = headers.indexOf("id_fakta");
  if (idColIdx === -1) {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue("id_fakta");
    SpreadsheetApp.getActiveSpreadsheet().toast("Menambahkan kolom 'id_fakta' baru...", "Setup Kolom", 3);
    
    // Ambil ulang data header setelah kolom disisipkan
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    idColIdx = 0;
  }
  
  // Membaca ulang seluruh data range
  var data = sheet.getDataRange().getValues();
  var payloadRows = [];
  var rowIndices = []; // Menyimpan nomor baris asli di spreadsheet (1-based)
  
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
        cellVal = Utilities.formatDate(cellVal, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "yyyy-MM-dd");
      }
      
      // Ubah string kosong menjadi null agar Pydantic/Python tidak error tipe data
      if (cellVal === "") {
        cellVal = null;
      }
      
      row[headerName] = cellVal;
      
      // Cek apakah baris ini benar-benar berisi data (kecuali id_fakta)
      if (headerName !== "id_fakta" && cellVal !== "" && cellVal !== null && cellVal !== undefined) {
        rowIsEmpty = false;
      }
    }
    
    // Hanya masukkan baris yang tidak kosong
    if (!rowIsEmpty) {
      payloadRows.push(row);
      rowIndices.push(i + 1); // 1-based index baris
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
    "muteHttpExceptions": true
  };
  
  SpreadsheetApp.getActiveSpreadsheet().toast("Sedang mensinkronisasi " + payloadRows.length + " data...", "Sinkronisasi...", 10);
  
  try {
    var response = UrlFetchApp.fetch(API_BASE_URL + "/webhook", options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    var result = JSON.parse(responseText);
    
    if (responseCode === 200) {
      // 2. Tulis Kembali ID ke Kolom "id_fakta" (Writeback) secara batch
      if (result.row_ids && result.row_ids.length === payloadRows.length) {
        var freshLastRow = sheet.getLastRow();
        var idRange = sheet.getRange(1, idColIdx + 1, freshLastRow, 1);
        var idValues = idRange.getValues();
        
        for (var k = 0; k < result.row_ids.length; k++) {
          var targetSheetRowIdx = rowIndices[k] - 1; // 0-based array index
          idValues[targetSheetRowIdx][0] = result.row_ids[k];
        }
        
        idRange.setValues(idValues);
      }
      
      var summaryMsg = "Sinkronisasi Berhasil!\n" +
                       "• Total data diproses: " + result.processed + "\n" +
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
      "Tidak dapat terhubung ke URL API: " + API_BASE_URL + "/webhook\n\n" +
      "Detail teknis: " + error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Menghapus baris terpilih dari database dan menghapusnya dari spreadsheet.
 */
function deleteSelectedRowsFromSIG() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var sheetName = sheet.getName();
  
  // Validasi tipe sheet
  var validSheets = ["produksi_harian", "pemeliharaan_harian", "pemupukan_harian"];
  if (validSheets.indexOf(sheetName) === -1) {
    SpreadsheetApp.getUi().alert("Error", "Gunakan fitur ini di tab: produksi_harian, pemeliharaan_harian, atau pemupukan_harian", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var range = sheet.getActiveRange();
  if (!range) {
    SpreadsheetApp.getUi().alert("Info", "Pilih baris atau sel yang ingin dihapus terlebih dahulu.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var startRow = range.getRow();
  var numRows = range.getNumRows();
  
  // Ambil header
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idColIdx = headers.indexOf("id_fakta");
  if (idColIdx === -1) {
    SpreadsheetApp.getUi().alert("Peringatan", "Kolom 'id_fakta' tidak ditemukan. Sinkronisasi harus dijalankan minimal sekali agar kolom 'id_fakta' terbentuk.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  var idsToDelete = [];
  var rowsToDeleteLocal = []; // Untuk melacak baris mana saja yang akan kita delete dari sheet
  
  // Baca ID dari baris yang dipilih
  for (var i = 0; i < numRows; i++) {
    var currentRowNum = startRow + i;
    if (currentRowNum === 1) continue; // Jangan hapus header
    
    var idVal = sheet.getRange(currentRowNum, idColIdx + 1).getValue();
    
    if (idVal !== "" && idVal !== null && idVal !== undefined) {
      idsToDelete.push(Number(idVal));
    }
    rowsToDeleteLocal.push(currentRowNum);
  }
  
  if (rowsToDeleteLocal.length === 0) {
    SpreadsheetApp.getUi().alert("Info", "Tidak ada baris data yang terpilih untuk dihapus.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  // Jika ada ID yang terdaftar di database, minta konfirmasi dan hapus di backend
  if (idsToDelete.length > 0) {
    var confirmResponse = SpreadsheetApp.getUi().alert(
      "Konfirmasi Penghapusan",
      "Apakah Anda yakin ingin menghapus " + idsToDelete.length + " data terpilih dari database Supabase?\nTindakan ini tidak dapat dibatalkan.",
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    
    if (confirmResponse !== SpreadsheetApp.getUi().Button.YES) {
      return;
    }
    
    // Kirim request delete ke Backend
    var payload = {
      "sheet_type": sheetName,
      "ids": idsToDelete
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
      var response = UrlFetchApp.fetch(API_BASE_URL + "/delete", options);
      var responseCode = response.getResponseCode();
      var responseText = response.getContentText();
      var result = JSON.parse(responseText);
      
      if (responseCode !== 200) {
        var errorDetail = result.detail || responseText;
        SpreadsheetApp.getUi().alert("Gagal Hapus", "Gagal menghapus dari database server:\n" + errorDetail, SpreadsheetApp.getUi().ButtonSet.OK);
        return;
      }
      
      SpreadsheetApp.getActiveSpreadsheet().toast("Berhasil menghapus " + result.deleted_count + " data dari database.", "Sukses", 3);
    } catch (error) {
      SpreadsheetApp.getUi().alert("Gagal Terhubung", "Gagal menghubungi server untuk menghapus data:\n" + error.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
  } else {
    // Jika tidak ada ID database (data baru belum disinkronisasi), langsung konfirmasi hapus lokal saja
    var confirmLocal = SpreadsheetApp.getUi().alert(
      "Hapus Baris Lokal",
      "Baris yang dipilih belum ter-posting ke database. Hapus baris dari Google Sheets?",
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    if (confirmLocal !== SpreadsheetApp.getUi().Button.YES) {
      return;
    }
  }
  
  // Hapus baris dari spreadsheet secara lokal (diurutkan terbalik agar index tidak bergeser)
  rowsToDeleteLocal.sort(function(a, b) { return b - a; });
  for (var j = 0; j < rowsToDeleteLocal.length; j++) {
    sheet.deleteRow(rowsToDeleteLocal[j]);
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast("Baris berhasil dihapus dari Spreadsheet.", "Selesai", 3);
}
