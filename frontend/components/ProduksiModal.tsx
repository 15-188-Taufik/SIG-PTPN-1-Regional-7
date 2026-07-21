'use client';

import { useState, useEffect } from 'react';
import { ProduksiItem } from '@/lib/api';

interface KebunAfdelingOption {
  kebun: string;
  afdeling: string;
}

interface ProduksiModalProps {
  isOpen: boolean;
  initialData?: ProduksiItem | null;
  kebunAfdelingList: KebunAfdelingOption[];
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
}

export default function ProduksiModal({
  isOpen,
  initialData,
  kebunAfdelingList,
  onClose,
  onSubmit,
}: ProduksiModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedKebun, setSelectedKebun] = useState<string>('Unit Bergen');
  const [selectedAfdeling, setSelectedAfdeling] = useState<string>('Afdeling I');
  const [targetTon, setTargetTon] = useState<string>('');
  const [aktualTon, setAktualTon] = useState<string>('');
  const [pemanenHk, setPemanenHk] = useState<string>('');
  const [curahHujanMm, setCurahHujanMm] = useState<string>('');
  const [rendemenPersen, setRendemenPersen] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setTanggal(initialData.tanggal || new Date().toISOString().split('T')[0]);
      if (initialData.kebun) setSelectedKebun(initialData.kebun);
      if (initialData.afdeling) setSelectedAfdeling(initialData.afdeling);
      setTargetTon(initialData.target_harian_ton?.toString() || '');
      setAktualTon(initialData.produksi_aktual_ton?.toString() || '');
      setPemanenHk(initialData.jumlah_pemanen_hk?.toString() || '');
      setCurahHujanMm(initialData.curah_hujan_mm?.toString() || '');
      setRendemenPersen(initialData.rendemen_persen?.toString() || '');
    } else {
      setTanggal(new Date().toISOString().split('T')[0]);
      if (kebunAfdelingList.length > 0) {
        setSelectedKebun(kebunAfdelingList[0].kebun);
        setSelectedAfdeling(kebunAfdelingList[0].afdeling);
      }
      setTargetTon('');
      setAktualTon('');
      setPemanenHk('');
      setCurahHujanMm('');
      setRendemenPersen('');
    }
    setError('');
  }, [initialData, isOpen, kebunAfdelingList]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!aktualTon || parseFloat(aktualTon) < 0) {
      setError('Produksi Aktual wajib diisi angka non-negatif');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        tanggal,
        kebun: selectedKebun,
        afdeling: selectedAfdeling,
        target_harian_ton: targetTon ? parseFloat(targetTon) : 0.0,
        produksi_aktual_ton: parseFloat(aktualTon),
        jumlah_pemanen_hk: pemanenHk ? parseInt(pemanenHk, 10) : 0,
        curah_hujan_mm: curahHujanMm ? parseFloat(curahHujanMm) : 0.0,
        rendemen_persen: rendemenPersen ? parseFloat(rendemenPersen) : 0.0,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Gagal menyimpan data produksi harian');
    } finally {
      setSubmitting(false);
    }
  }

  const titleText = `${initialData ? 'Edit' : 'Tambah'} Catatan Produksi Harian`;

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
          {/* Kebun & Afdeling Row */}
          <div style={styles.fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Kebun / Unit *</label>
              <input
                type="text"
                value={selectedKebun}
                onChange={(e) => setSelectedKebun(e.target.value)}
                placeholder="Contoh: Unit Bergen"
                style={styles.input}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Afdeling *</label>
              <input
                type="text"
                value={selectedAfdeling}
                onChange={(e) => setSelectedAfdeling(e.target.value)}
                placeholder="Contoh: Afdeling I"
                style={styles.input}
                required
              />
            </div>
          </div>

          {/* Tanggal */}
          <div style={styles.field}>
            <label style={styles.label}>Tanggal Produksi *</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {/* Target & Aktual Ton */}
          <div style={styles.fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Target Harian (Ton)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={targetTon}
                onChange={(e) => setTargetTon(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Produksi Aktual (Ton) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={aktualTon}
                onChange={(e) => setAktualTon(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>

          {/* Pemanen HK, Curah Hujan, Rendemen */}
          <div style={styles.fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Jumlah Pemanen (HK)</label>
              <input
                type="number"
                placeholder="Jumlah orang"
                value={pemanenHk}
                onChange={(e) => setPemanenHk(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Curah Hujan (mm)</label>
              <input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={curahHujanMm}
                onChange={(e) => setCurahHujanMm(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Rendemen (%)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00%"
                value={rendemenPersen}
                onChange={(e) => setRendemenPersen(e.target.value)}
                style={styles.input}
              />
            </div>
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
