'use client';

import { useState, useEffect } from 'react';
import { PemeliharaanItem, PemupukanItem } from '@/lib/api';

interface BlokOption {
  id: number;
  kebun: string;
  afdeling: string;
  kode_blok: string;
}

interface KegiatanModalProps {
  isOpen: boolean;
  type: 'pemeliharaan' | 'pemupukan';
  initialData?: PemeliharaanItem | PemupukanItem | null;
  blokList: BlokOption[];
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
}

export default function KegiatanModal({
  isOpen,
  type,
  initialData,
  blokList,
  onClose,
  onSubmit,
}: KegiatanModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [blokId, setBlokId] = useState<number>(blokList[0]?.id || 1);
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [jenisKegiatan, setJenisKegiatan] = useState('');
  const [material, setMaterial] = useState('');
  const [jenisPupuk, setJenisPupuk] = useState('');
  const [dosisAplikasi, setDosisAplikasi] = useState<string>('');
  const [jumlahPupuk, setJumlahPupuk] = useState<string>('');
  const [luasAplikasi, setLuasAplikasi] = useState<string>('');
  const [tenagaKerja, setTenagaKerja] = useState<string>('');
  const [keterangan, setKeterangan] = useState('');

  useEffect(() => {
    if (initialData) {
      setBlokId(initialData.blok_id);
      setTanggal(initialData.tanggal || new Date().toISOString().split('T')[0]);
      setLuasAplikasi(initialData.luas_aplikasi?.toString() || '');
      setTenagaKerja(initialData.tenaga_kerja?.toString() || '');
      setKeterangan(initialData.keterangan || '');

      if (type === 'pemeliharaan') {
        const item = initialData as PemeliharaanItem;
        setJenisKegiatan(item.jenis_kegiatan || '');
        setMaterial(item.material || '');
        setDosisAplikasi(item.dosis_aplikasi?.toString() || '');
      } else {
        const item = initialData as PemupukanItem;
        setJenisPupuk(item.jenis_pupuk || '');
        setJumlahPupuk(item.jumlah_pupuk?.toString() || '');
      }
    } else {
      // Reset defaults
      if (blokList.length > 0) setBlokId(blokList[0].id);
      setTanggal(new Date().toISOString().split('T')[0]);
      setJenisKegiatan(type === 'pemeliharaan' ? 'Penyiangan Lahan' : '');
      setJenisPupuk(type === 'pemupukan' ? 'NPK 15-15-15' : '');
      setMaterial('');
      setDosisAplikasi('');
      setJumlahPupuk('');
      setLuasAplikasi('');
      setTenagaKerja('');
      setKeterangan('');
    }
    setError('');
  }, [initialData, isOpen, type, blokList]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!blokId) {
      setError('Pilih Blok Kebun terlebih dahulu');
      return;
    }

    setSubmitting(true);
    try {
      if (type === 'pemeliharaan') {
        if (!jenisKegiatan.trim()) {
          setError('Jenis Kegiatan wajib diisi');
          setSubmitting(false);
          return;
        }
        await onSubmit({
          blok_id: Number(blokId),
          tanggal,
          jenis_kegiatan: jenisKegiatan.trim(),
          material: material.trim() || null,
          dosis_aplikasi: dosisAplikasi ? parseFloat(dosisAplikasi) : null,
          luas_aplikasi: luasAplikasi ? parseFloat(luasAplikasi) : null,
          tenaga_kerja: tenagaKerja ? parseInt(tenagaKerja, 10) : null,
          keterangan: keterangan.trim() || null,
        });
      } else {
        if (!jenisPupuk.trim()) {
          setError('Jenis Pupuk wajib diisi');
          setSubmitting(false);
          return;
        }
        if (!jumlahPupuk || parseFloat(jumlahPupuk) <= 0) {
          setError('Jumlah Pupuk wajib diisi angka positif');
          setSubmitting(false);
          return;
        }
        await onSubmit({
          blok_id: Number(blokId),
          tanggal,
          jenis_pupuk: jenisPupuk.trim(),
          jumlah_pupuk: parseFloat(jumlahPupuk),
          luas_aplikasi: luasAplikasi ? parseFloat(luasAplikasi) : null,
          tenaga_kerja: tenagaKerja ? parseInt(tenagaKerja, 10) : null,
          keterangan: keterangan.trim() || null,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  }

  const titleText = `${initialData ? 'Edit' : 'Tambah'} Catatan ${
    type === 'pemeliharaan' ? 'Pemeliharaan Harian' : 'Pemupukan Harian'
  }`;

  return (
    <div style={styles.backdrop}>
      <div style={styles.modalTile}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>{titleText}</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={styles.formBody}>
          {/* Target Blok Select */}
          <div style={styles.field}>
            <label style={styles.label}>Pilih Blok Kebun *</label>
            <select
              value={blokId}
              onChange={(e) => setBlokId(Number(e.target.value))}
              style={styles.input}
              required
            >
              {blokList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.kebun} — {b.afdeling} — Blok {b.kode_blok || b.id}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal */}
          <div style={styles.field}>
            <label style={styles.label}>Tanggal Kegiatan *</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {/* Type Specific Fields */}
          {type === 'pemeliharaan' ? (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Jenis Kegiatan *</label>
                <input
                  type="text"
                  placeholder="Contoh: Penyiangan, Wiwiltan, Semprot Herbisida"
                  value={jenisKegiatan}
                  onChange={(e) => setJenisKegiatan(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.fieldRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Bahan / Material</label>
                  <input
                    type="text"
                    placeholder="Contoh: Glyphosate, Gramoxone"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Dosis Aplikasi (L/Kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={dosisAplikasi}
                    onChange={(e) => setDosisAplikasi(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={styles.fieldRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Jenis Pupuk *</label>
                  <input
                    type="text"
                    placeholder="Contoh: NPK 15-15-15, Urea, TSP, Dolomit"
                    value={jenisPupuk}
                    onChange={(e) => setJenisPupuk(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Jumlah Pupuk (Kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={jumlahPupuk}
                    onChange={(e) => setJumlahPupuk(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Luas Aplikasi & Tenaga Kerja */}
          <div style={styles.fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Luas Aplikasi (Ha)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={luasAplikasi}
                onChange={(e) => setLuasAplikasi(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Tenaga Kerja (HK)</label>
              <input
                type="number"
                placeholder="Jumlah orang/HK"
                value={tenagaKerja}
                onChange={(e) => setTenagaKerja(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          {/* Keterangan */}
          <div style={styles.field}>
            <label style={styles.label}>Keterangan Catatan</label>
            <textarea
              rows={2}
              placeholder="Catatan tambahan lokasi atau kondisi pengerjaan..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              style={{ ...styles.input, resize: 'vertical' }}
            />
          </div>

          {/* Footer Actions */}
          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.btnSecondary} disabled={submitting}>
              Batal
            </button>
            <button type="submit" style={styles.btnPrimary} disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '16px',
  },
  modalTile: {
    background: '#ffffff',
    width: '100%',
    maxWidth: '540px',
    borderRadius: '4px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '14px 20px',
    background: '#161616',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '600',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    fontSize: '16px',
    cursor: 'pointer',
  },
  errorAlert: {
    background: '#fff0f1',
    color: '#da1e28',
    padding: '10px 16px',
    fontSize: '12px',
    borderLeft: '4px solid #da1e28',
  },
  formBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fieldRow: {
    display: 'flex',
    gap: '12px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#393939',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    fontSize: '13px',
    border: '1px solid #8d8d8d',
    borderRadius: '2px',
    outline: 'none',
    background: '#f4f4f4',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
    paddingTop: '12px',
    borderTop: '1px solid #e0e0e0',
  },
  btnSecondary: {
    padding: '8px 16px',
    fontSize: '13px',
    background: '#393939',
    color: '#ffffff',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
  },
  btnPrimary: {
    padding: '8px 16px',
    fontSize: '13px',
    background: '#0f62fe',
    color: '#ffffff',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    fontWeight: '600',
  },
};
