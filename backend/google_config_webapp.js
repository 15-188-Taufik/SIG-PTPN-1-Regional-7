/**
 * SIG PTPN - Config Store Web App
 * 
 * SETUP (lakukan sekali):
 * 1. Buka script.google.com -> New Project -> beri nama "SIG PTPN Config"
 * 2. Hapus kode default, paste seluruh isi file ini
 * 3. Klik Deploy -> New Deployment
 * 4. Type: Web app
 * 5. Execute as: Me
 * 6. Who has access: Anyone
 * 7. Klik Deploy -> Salin URL deployment (format: https://script.google.com/macros/s/xxx/exec)
 * 8. Tempel URL tersebut ke:
 *    - start_local_backend.ps1 (variabel $CONFIG_WEBAPP_URL)
 *    - app_script_auto_sync.js (variabel CONFIG_WEBAPP_URL)
 */

var SECRET_KEY = "ptpn-sig-config-2026"; // Ganti jika mau

/**
 * GET: Ambil URL backend saat ini
 * Dipanggil oleh Apps Script sync sebelum mengirim data
 */
function doGet(e) {
  var props = PropertiesService.getScriptProperties();
  var url   = props.getProperty("backend_url");
  var updatedAt = props.getProperty("updated_at") || "-";

  // Fallback ke Render.com jika belum pernah di-set
  if (!url) {
    url = "https://sig-ptpn-1-regional-7.onrender.com";
  }

  var result = { url: url, updated_at: updatedAt, status: "ok" };
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST: Simpan URL backend baru
 * Dipanggil oleh start_local_backend.ps1 setelah tunnel aktif
 */
function doPost(e) {
  try {
    var data   = JSON.parse(e.postData.contents);
    var secret = data.secret;

    if (secret !== SECRET_KEY) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var newUrl = data.url;
    if (!newUrl || !newUrl.startsWith("https://")) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: "Invalid URL" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var props = PropertiesService.getScriptProperties();
    props.setProperty("backend_url", newUrl);
    props.setProperty("updated_at", new Date().toISOString());

    Logger.log("Backend URL updated: " + newUrl);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", url: newUrl }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
