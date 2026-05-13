import './LockedDataTable.css';

const CATEGORY_LABELS = {
  geometry: 'Geometri Sonuçları',
  material: 'Malzeme Parametreleri',
  capacity: 'Taşıma Kapasitesi',
  improvedSoil: 'İyileştirilmiş Zemin Özellikleri',
  settlement: 'Oturma Hesapları',
};

const PARAM_DEFS = [
  { key: 'D', label: 'Kolon Çapı (D)', unit: 'm' },
  { key: 's', label: 'Kolon Aralığı (s)', unit: 'm' },
  { key: 'H', label: 'Kolon Yüksekliği (H)', unit: 'm' },
  { key: 'cu', label: 'Drenajsız Kohezyon (cu)', unit: 'kPa' },
  { key: 'Es', label: 'Zemin Elastisite Modülü (Es)', unit: 'kPa' },
  { key: 'alpha', label: 'Aderans Faktörü (α)', unit: '-' },
  { key: 'Nc', label: 'Taşıma Kap. Katsayısı (Nc)', unit: '-' },
  { key: 'sigmaJet', label: 'Jet Grout Dayanımı (σjet)', unit: 'kPa' },
  { key: 'Ejg', label: 'Jet Grout Elastisite Modülü (Ejg)', unit: 'kPa' },
  { key: 'qtemel', label: 'Temel Basıncı (qtemel)', unit: 'kPa' },
  { key: 'qnet', label: 'Net Basınç (qnet)', unit: 'kPa' },
  { key: 'Fs', label: 'Malzeme Güvenlik Faktörü (Fs)', unit: '-' },
  { key: 'FS', label: 'Taşıma Kap. Güvenlik Faktörü (FS)', unit: '-' },
];

function fmtNum(val) {
  if (val === null || val === undefined || val === '') return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return String(val);
  if (Math.abs(n) >= 10000) return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  return n.toFixed(3);
}

/**
 * Hesaplama sonuçlarını ve parametrelerini salt-okunur tablo olarak gösterir.
 * Kullanıcı hiçbir değeri değiştiremez — veriler DB'den gelir.
 */
function LockedDataTable({ parameters, results }) {
  const hasParams = parameters && Object.keys(parameters).length > 0;
  const hasResults = results && Object.keys(results).length > 0;

  return (
    <div className="locked-data-root">
      {/* ── Uyarı Banner ── */}
      <div className="locked-banner">
        <span className="locked-icon">🔒</span>
        <div>
          <strong>Kilitli Sistem Verileri</strong>
          <p>Bu bölümdeki değerler ZEMSIS tarafından hesaplanmış olup değiştirilemez.
            Raporda birebir kullanılacaktır.</p>
        </div>
      </div>

      {/* ── Tasarım Parametreleri ── */}
      {hasParams && (
        <div className="locked-section">
          <h4 className="locked-section-title">
            <span className="locked-chip">KİLİTLİ</span>
            Jet Grout Tasarım Parametreleri
          </h4>
          <table className="locked-table">
            <thead>
              <tr>
                <th>Parametre</th>
                <th>Değer</th>
                <th>Birim</th>
              </tr>
            </thead>
            <tbody>
              {PARAM_DEFS.filter(d => parameters[d.key] !== undefined).map(d => (
                <tr key={d.key}>
                  <td>{d.label}</td>
                  <td className="locked-val">{fmtNum(parameters[d.key])}</td>
                  <td className="locked-unit">{d.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Hesaplama Sonuçları ── */}
      {hasResults && Object.entries(results).map(([cat, items]) => {
        if (!items || typeof items !== 'object') return null;
        const catLabel = CATEGORY_LABELS[cat] || cat;
        return (
          <div className="locked-section" key={cat}>
            <h4 className="locked-section-title">
              <span className="locked-chip">KİLİTLİ</span>
              {catLabel}
            </h4>
            <table className="locked-table">
              <thead>
                <tr>
                  <th>Parametre</th>
                  <th>Değer</th>
                  <th>Birim</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(items).map(([key, item]) => {
                  const val = typeof item === 'object' && item ? item.value : item;
                  const unit = typeof item === 'object' && item ? (item.unit || '—') : '—';
                  const label = typeof item === 'object' && item ? (item.label || key) : key;
                  return (
                    <tr key={key}>
                      <td>{label}</td>
                      <td className="locked-val">{fmtNum(val)}</td>
                      <td className="locked-unit">{unit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {!hasParams && !hasResults && (
        <div className="locked-empty">
          <p>⚠ Henüz hesaplama yapılmamış. <br />
            Lütfen "Parametreler" sekmesinde değerleri girip hesaplama yapın.</p>
        </div>
      )}
    </div>
  );
}

export default LockedDataTable;
