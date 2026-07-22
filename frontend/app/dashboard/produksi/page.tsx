'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNav from '@/components/HeaderNav';
import ProduksiModal from '@/components/ProduksiModal';
import {
  fetchProduksiList,
  createProduksi,
  updateProduksi,
  deleteProduksi,
  fetchKebunList,
  ProduksiItem,
  ProduksiListResponse,
} from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export default function ProduksiPage() {
  const router = useRouter();

  // State
  const [data, setData] = useState<ProduksiListResponse>({
    total: 0,
    total_target: 0,
    total_aktual: 0,
    capaian_persen: 0,
    total_pemanen: 0,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [kebunList, setKebunList] = useState<string[]>([]);
  const [selectedKebun, setSelectedKebun] = useState<string>('');
  const [selectedAfdeling, setSelectedAfdeling] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProduksiItem | null>(null);

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  // Load Kebuns dropdown
  useEffect(() => {
    async function loadInitialOptions() {
      try {
        const kList = await fetchKebunList();
        setKebunList(kList || []);
      } catch (err) {
        console.error('Error loading kebun options:', err);
      }
    }
    loadInitialOptions();
  }, []);

  // Fetch data list
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchProduksiList({
        kebun: selectedKebun || undefined,
        afdeling: selectedAfdeling || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search.trim() || undefined,
        sort_order: sortOrder,
        limit: 2000,
      });
      setData(res);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Gagal memuat data produksi harian');
    } finally {
      setLoading(false);
    }
  }, [selectedKebun, selectedAfdeling, startDate, endDate, search, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Paginated Items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return data.items.slice(startIndex, startIndex + pageSize);
  }, [data.items, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(data.items.length / pageSize));

  // CRUD Actions
  function handleOpenCreate() {
    setEditingItem(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(item: ProduksiItem) {
    setEditingItem(item);
    setIsModalOpen(true);
  }

  async function handleDelete(id_fakta: number) {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan produksi harian ini?')) return;
    try {
      await deleteProduksi(id_fakta);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Gagal menghapus data');
    }
  }

  async function handleFormSubmit(formData: any) {
    if (editingItem) {
      await updateProduksi(editingItem.id_fakta, formData);
    } else {
      await createProduksi(formData);
    }
    loadData();
  }

  function handleResetFilters() {
    setSelectedKebun('');
    setSelectedAfdeling('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setSortOrder('desc');
  }

  return (
    <div style={styles.container}>
      <HeaderNav />

      <main style={styles.mainContent}>
        {/* Page Title Header */}
        <div style={styles.titleSection}>
          <div>
            <h1 style={styles.pageTitle}>Detail Produksi Harian</h1>
            <p style={styles.pageSubtitle}>
              Pencatatan dan analisis target vs aktual hasil panen produksi harian, HK pemanen, curah hujan, dan rendemen.
            </p>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Total Produksi Aktual</div>
            <div style={{ ...styles.kpiValue, color: '#24a148' }}>
              {data.total_aktual.toLocaleString('id-ID', { minimumFractionDigits: 1 })}{' '}
              <span style={{ fontSize: '16px' }}>Ton</span>
            </div>
            <div style={styles.kpiSub}>Hasil produksi panen</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Total Target Harian</div>
            <div style={{ ...styles.kpiValue, color: '#0f62fe' }}>
              {data.total_target.toLocaleString('id-ID', { minimumFractionDigits: 1 })}{' '}
              <span style={{ fontSize: '16px' }}>Ton</span>
            </div>
            <div style={styles.kpiSub}>Target RKAP harian</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Capaian Target</div>
            <div
              style={{
                ...styles.kpiValue,
                color: data.capaian_persen >= 100 ? '#24a148' : '#f5a623',
              }}
            >
              {data.capaian_persen.toLocaleString('id-ID', { minimumFractionDigits: 1 })}%
            </div>
            <div style={styles.kpiSub}>Persentase realisasi panen</div>
          </div>
          <div style={styles.kpiCard}>
            <div style={styles.kpiLabel}>Total Pemanen</div>
            <div style={{ ...styles.kpiValue, color: '#8a3ffc' }}>
              {data.total_pemanen.toLocaleString('id-ID')}{' '}
              <span style={{ fontSize: '16px' }}>HK</span>
            </div>
            <div style={styles.kpiSub}>Tenaga panen teralokasi</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={styles.filterCard}>
          <div style={styles.filterGrid}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Kebun / Unit</label>
              <select
                value={selectedKebun}
                onChange={(e) => setSelectedKebun(e.target.value)}
                style={styles.filterInput}
              >
                <option value="">Semua Kebun</option>
                {kebunList.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Afdeling</label>
              <input
                type="text"
                placeholder="Contoh: Afdeling I"
                value={selectedAfdeling}
                onChange={(e) => setSelectedAfdeling(e.target.value)}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Dari Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Urutkan Tanggal</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                style={styles.filterInput}
              >
                <option value="desc">Terbaru ke Terlama</option>
                <option value="asc">Terlama ke Terbaru</option>
              </select>
            </div>

            <div style={{ ...styles.filterGroup, flex: 2 }}>
              <label style={styles.filterLabel}>Pencarian Kata Kunci</label>
              <input
                type="text"
                placeholder="Cari kebun atau afdeling..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.filterInput}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <button onClick={handleResetFilters} style={styles.btnSecondary}>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && <div style={styles.errorAlert}>{error}</div>}

        {/* Datagrid Table with Sticky Header & Scrollable Body */}
        <div style={styles.tableCard}>
          <div style={styles.tableHeaderBar}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#161616' }}>
              Daftar Catatan Produksi Harian ({data.items.length} catatan terurai)
            </div>
          </div>

          <div style={styles.tableScrollWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>No</th>
                  <th style={styles.th}>Tanggal</th>
                  <th style={styles.th}>Kebun / Unit</th>
                  <th style={styles.th}>Afdeling</th>
                  <th style={styles.th}>Target (Ton)</th>
                  <th style={styles.th}>Aktual (Ton)</th>
                  <th style={styles.th}>Capaian (%)</th>
                  <th style={styles.th}>Pemanen (HK)</th>
                  <th style={styles.th}>Hujan (mm)</th>
                  <th style={styles.th}>Rendemen (%)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#6f6f6f' }}>
                      Memuat data produksi harian...
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#6f6f6f', fontStyle: 'italic' }}>
                      Belum ada catatan produksi harian yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((row, idx) => {
                    const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                    const capaian = row.target_harian_ton > 0 ? (row.produksi_aktual_ton / row.target_harian_ton) * 100 : 0;
                    return (
                      <tr key={row.id_fakta} style={idx % 2 === 1 ? styles.trEven : styles.trOdd}>
                        <td style={styles.td}>{globalIdx}</td>
                        <td style={{ ...styles.td, fontWeight: '600' }}>{row.tanggal}</td>
                        <td style={styles.td}>{row.kebun || '-'}</td>
                        <td style={styles.td}>{row.afdeling || '-'}</td>
                        <td style={styles.td}>{row.target_harian_ton ? row.target_harian_ton.toLocaleString('id-ID') : '-'}</td>
                        <td style={{ ...styles.td, fontWeight: '700', color: '#24a148' }}>
                          {row.produksi_aktual_ton.toLocaleString('id-ID')} Ton
                        </td>
                        <td style={{ ...styles.td, fontWeight: '600', color: capaian >= 100 ? '#24a148' : '#f5a623' }}>
                          {capaian > 0 ? `${capaian.toFixed(1)}%` : '-'}
                        </td>
                        <td style={styles.td}>{row.jumlah_pemanen_hk ? `${row.jumlah_pemanen_hk} HK` : '-'}</td>
                        <td style={styles.td}>{row.curah_hujan_mm ? `${row.curah_hujan_mm} mm` : '0'}</td>
                        <td style={styles.td}>{row.rendemen_persen ? `${row.rendemen_persen}%` : '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          <div style={styles.paginationFooter}>
            <div style={{ fontSize: '12px', color: '#525252' }}>
              Menampilkan halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> (Total <strong>{data.items.length}</strong> catatan)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span>Baris per halaman:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={styles.pageSizeSelect}
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={styles.pageBtn}
                >
                  ◀
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={styles.pageBtn}
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* CRUD Modal */}
      <ProduksiModal
        isOpen={isModalOpen}
        initialData={editingItem}
        kebunAfdelingList={[
          { kebun: 'Unit Bergen', afdeling: 'Afdeling I' },
          { kebun: 'Unit Bergen', afdeling: 'Afdeling II' },
          { kebun: 'Unit Bergen', afdeling: 'Afdeling III' },
          { kebun: 'Unit Kedaton', afdeling: 'Afdeling A' },
          { kebun: 'Unit Kedaton', afdeling: 'Afdeling B' },
          { kebun: 'Unit Tulungbuyut', afdeling: 'Afdeling A' },
          { kebun: 'Unit Way Berulu', afdeling: 'Afdeling I' },
          { kebun: 'Unit Way Lima', afdeling: 'Afdeling I' },
        ]}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    maxHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#f4f4f4',
    fontFamily: "'Inter', sans-serif",
  },
  mainContent: {
    flex: 1,
    minHeight: 0,
    maxWidth: '1400px',
    width: '100%',
    margin: '0 auto',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflow: 'hidden',
  },
  titleSection: {
    flex: '0 0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  pageTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#161616',
  },
  pageSubtitle: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#525252',
  },
  btnPrimary: {
    background: '#24a148',
    color: '#ffffff',
    border: 'none',
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '2px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
  },
  kpiGrid: {
    flex: '0 0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
  },
  kpiCard: {
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderTop: '3px solid #24a148',
    padding: '10px 14px',
    borderRadius: '2px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  kpiLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#525252',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#161616',
    margin: '4px 0 2px 0',
  },
  kpiSub: {
    fontSize: '11px',
    color: '#8d8d8d',
  },
  filterCard: {
    flex: '0 0 auto',
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    padding: '10px 14px',
    borderRadius: '2px',
  },
  filterGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: '1 1 140px',
  },
  filterLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#525252',
  },
  filterInput: {
    padding: '5px 8px',
    fontSize: '12px',
    border: '1px solid #8d8d8d',
    borderRadius: '2px',
    background: '#f4f4f4',
    outline: 'none',
  },
  btnSecondary: {
    background: '#393939',
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    borderRadius: '2px',
    cursor: 'pointer',
  },
  errorAlert: {
    flex: '0 0 auto',
    background: '#fff0f1',
    color: '#da1e28',
    padding: '8px 12px',
    fontSize: '12px',
    borderLeft: '4px solid #da1e28',
  },
  tableCard: {
    flex: 1,
    minHeight: 0,
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '2px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tableHeaderBar: {
    flex: '0 0 auto',
    padding: '8px 14px',
    background: '#e0e0e0',
    borderBottom: '1px solid #d1d1d1',
  },
  tableScrollWrapper: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  thRow: {
    background: '#262626',
    color: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  th: {
    padding: '8px 10px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '11px',
    letterSpacing: '0.3px',
  },
  trOdd: {
    background: '#ffffff',
  },
  trEven: {
    background: '#f4f4f4',
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid #e0e0e0',
    color: '#161616',
  },
  actionEditBtn: {
    background: '#e8f0fe',
    color: '#0f62fe',
    border: '1px solid #b3d1ff',
    padding: '3px 7px',
    fontSize: '11px',
    borderRadius: '2px',
    cursor: 'pointer',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  actionDeleteBtn: {
    background: '#fff0f1',
    color: '#da1e28',
    border: '1px solid #ffb3b8',
    padding: '3px 7px',
    fontSize: '11px',
    borderRadius: '2px',
    cursor: 'pointer',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  paginationFooter: {
    flex: '0 0 auto',
    padding: '8px 14px',
    background: '#ffffff',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
  },
  pageSizeSelect: {
    padding: '3px 6px',
    fontSize: '12px',
    border: '1px solid #8d8d8d',
    borderRadius: '2px',
    background: '#f4f4f4',
  },
  pageBtn: {
    background: '#393939',
    color: '#ffffff',
    border: 'none',
    padding: '3px 8px',
    fontSize: '11px',
    borderRadius: '2px',
    cursor: 'pointer',
  },
};
