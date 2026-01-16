import './ResultCard.css';

function ResultCard({ title, results }) {
    if (!results) return null;

    const formatValue = (val) => {
        if (typeof val === 'number') {
            if (Math.abs(val) >= 1000) {
                return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
            }
            return val.toFixed(4).replace(/\.?0+$/, '');
        }
        return val;
    };

    return (
        <div className="result-card">
            <h3>{title}</h3>
            <div className="result-grid">
                {Object.entries(results).map(([key, item]) => (
                    <div key={key} className="result-item">
                        <span className="result-label">{item.description || key}</span>
                        <span className="result-value">
                            {formatValue(item.value)}
                            <span className="result-unit">{item.unit}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ResultCard;
