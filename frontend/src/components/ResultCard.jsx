import './ResultCard.css';

function ResultCard({ title, results, lang = 'tr' }) {
    if (!results) return null;

    const locale = lang === 'tr' ? 'tr-TR' : 'en-US';

    const formatValue = (val) => {
        if (typeof val === 'boolean') return null; // boolean'lar badge ile render edilir
        if (typeof val === 'number') {
            if (Math.abs(val) >= 1000) {
                return val.toLocaleString(locale, { maximumFractionDigits: 2 });
            }
            return val.toFixed(4).replace(/\.?0+$/, '');
        }
        return val;
    };

    const renderValue = (key, item) => {
        // #1 — boolean değerler için renkli badge
        if (typeof item.value === 'boolean') {
            return (
                <span className={`result-badge ${item.value ? 'result-badge--ok' : 'result-badge--fail'}`}>
                    {item.value ? '✅' : '❌'}
                    <span className="result-badge-text">
                        {item.value
                            ? (lang === 'tr' ? 'Güvenli' : 'Safe')
                            : (lang === 'tr' ? 'Güvensiz' : 'Unsafe')}
                    </span>
                </span>
            );
        }

        // #8 — Ejg için kaynak etiketi
        const ejgAutoKeys = ['Ejg'];
        const isEjgAuto = ejgAutoKeys.includes(key) && item.isAuto;

        // #4 — Kapasite oranı olan item'lar için progress bar
        if (item.ratio !== undefined && item.ratio !== null) {
            const pct = Math.min(item.ratio * 100, 100);
            const color = item.ratio > 1 ? '#ef4444' : item.ratio > 0.85 ? '#f59e0b' : '#22c55e';
            return (
                <div className="result-value-with-bar">
                    <span className="result-value">
                        {formatValue(item.value)}
                        <span className="result-unit">{item.unit}</span>
                        {isEjgAuto && <span className="result-auto-tag">{lang === 'tr' ? 'oto' : 'auto'}</span>}
                    </span>
                    <div className="result-progress-track">
                        <div
                            className="result-progress-fill"
                            style={{ width: `${pct}%`, background: color }}
                        />
                        <span className="result-progress-label" style={{ color }}>
                            {(item.ratio * 100).toFixed(0)}%
                        </span>
                    </div>
                </div>
            );
        }

        // #9 — Oturma sınır karşılaştırması
        if (item.limit !== undefined && item.limit !== null) {
            const ok = item.value <= item.limit;
            return (
                <div className="result-value-with-limit">
                    <span className="result-value">
                        {formatValue(item.value)}
                        <span className="result-unit">{item.unit}</span>
                    </span>
                    <span className={`result-limit-badge ${ok ? 'result-limit--ok' : 'result-limit--fail'}`}>
                        {ok ? '✅' : '⚠️'} &le; {item.limit} {item.unit}
                    </span>
                </div>
            );
        }

        return (
            <span className="result-value">
                {formatValue(item.value)}
                {item.value !== null && item.value !== undefined && (
                    <span className="result-unit">{item.unit}</span>
                )}
                {isEjgAuto && <span className="result-auto-tag">{lang === 'tr' ? 'oto' : 'auto'}</span>}
            </span>
        );
    };

    return (
        <div className="result-card">
            <h3>{title}</h3>
            <div className="result-grid">
                {Object.entries(results).map(([key, item]) => (
                    <div key={key} className={`result-item${typeof item.value === 'boolean' ? ' result-item--bool' : ''}`}>
                        <span className="result-label">{item.description || key}</span>
                        {renderValue(key, item)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ResultCard;
