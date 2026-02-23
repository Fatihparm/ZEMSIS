import ResultCard from './ResultCard';
import StressChart from './StressChart';
import './LayerResultsPanel.css';

function LayerResultsPanel({ results, translations, lang }) {
    if (!results) return null;

    const t = translations;

    // Zemin tipi ismini çevir
    const getSoilTypeName = (type) => {
        const names = {
            en: { kum: 'Sand', kil: 'Clay', silt: 'Silt', kaya: 'Rock', cakil: 'Gravel' },
            tr: { kum: 'Kum', kil: 'Kil', silt: 'Silt', kaya: 'Kaya', cakil: 'Çakıl' }
        };
        return names[lang]?.[type] || type;
    };

    const formatNum = (val, decimals = 2) => {
        if (typeof val === 'number') {
            return val.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: decimals
            });
        }
        return val;
    };

    return (
        <div className="layer-results-panel">
            {/* Katman bazlı tablo */}
            <div className="layer-results-table-wrapper">
                <h3>{t.layerTable}</h3>
                <div className="table-scroll">
                    <table className="layer-results-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{t.soilType}</th>
                                <th>{t.depthRange}</th>
                                <th>h (m)</th>
                                <th>γ (kN/m³)</th>
                                <th>σᵥ (kPa)</th>
                                <th>φ (°)</th>
                                <th>c (kPa)</th>
                                <th>E (kN/m²)</th>
                                <th>ν</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.layers.map((layer) => (
                                <tr key={layer.index}>
                                    <td className="center">{layer.index}</td>
                                    <td>{getSoilTypeName(layer.soilType)}</td>
                                    <td className="center">{formatNum(layer.startDepth, 1)} – {formatNum(layer.endDepth, 1)}</td>
                                    <td className="right">{formatNum(layer.thickness, 1)}</td>
                                    <td className="right">{formatNum(layer.gamma, 1)}</td>
                                    <td className="right highlight">{formatNum(layer.stressAtBottom)}</td>
                                    <td className="right">{formatNum(layer.phi, 1)}</td>
                                    <td className="right">{formatNum(layer.cohesion)}</td>
                                    <td className="right">{formatNum(layer.elasticity, 0)}</td>
                                    <td className="right">{formatNum(layer.poisson, 3)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Gerilme-Derinlik Grafiği */}
            <StressChart layers={results.layers} lang={lang} />

            {/* Özet kartları */}
            <div className="layer-summary-section">
                <h3>{t.summary}</h3>
                <div className="summary-cards">
                    <ResultCard title="" results={results.summary} />
                </div>
            </div>
        </div>
    );
}

export default LayerResultsPanel;
