import { useState, useEffect } from 'react';
import InputField from './components/InputField';
import ResultCard from './components/ResultCard';
import './App.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [activeTab, setActiveTab] = useState('geometry');
  const [parameters, setParameters] = useState({
    D: 0.8,
    s: 1.5,
    cu: 25,
    sigmaJet: 5000,
    Es: 5000,
    H: 10,
    qtemel: 150,
    FS: 2.5,
    alpha: 0.5,
    Nc: 9
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load defaults on mount
  useEffect(() => {
    fetch(`${API_URL}/defaults`)
      .then(res => res.json())
      .then(data => setParameters(prev => ({ ...prev, ...data })))
      .catch(err => console.log('Using local defaults'));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters })
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setActiveTab('results');
      } else {
        setError(data.error || 'Calculation failed');
      }
    } catch (err) {
      setError('Cannot connect to API. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'geometry', label: 'Geometry' },
    { id: 'soil', label: 'Soil Properties' },
    { id: 'jetgrout', label: 'Jet Grout' },
    { id: 'loading', label: 'Loading' },
    { id: 'results', label: 'Results' }
  ];

  return (
    <div className="app-container">
      <header className="header">
        <h1>🏗️ Jet-Grout-Calc</h1>
        <p>Jet Grouting Design & Analysis Tool</p>
      </header>

      <nav className="tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {error && <div className="error-message">{error}</div>}

        {/* Geometry Tab */}
        {activeTab === 'geometry' && (
          <section className="tab-panel">
            <h2>Column Geometry</h2>
            <div className="form-grid">
              <InputField
                label="Column Diameter"
                name="D"
                value={parameters.D}
                onChange={handleInputChange}
                unit="m"
                placeholder="0.8"
                min={0.3}
                max={3.0}
                step={0.1}
                tooltip="Jet grout column diameter"
              />
              <InputField
                label="Column Spacing"
                name="s"
                value={parameters.s}
                onChange={handleInputChange}
                unit="m"
                placeholder="1.5"
                min={0.5}
                max={5.0}
                step={0.1}
                tooltip="Grid spacing between columns"
              />
              <InputField
                label="Column Height"
                name="H"
                value={parameters.H}
                onChange={handleInputChange}
                unit="m"
                placeholder="10"
                min={1}
                max={50}
                step={0.5}
                tooltip="Treatment depth / column length"
              />
            </div>
          </section>
        )}

        {/* Soil Properties Tab */}
        {activeTab === 'soil' && (
          <section className="tab-panel">
            <h2>Soil Properties</h2>
            <div className="form-grid">
              <InputField
                label="Undrained Cohesion (cu)"
                name="cu"
                value={parameters.cu}
                onChange={handleInputChange}
                unit="kPa"
                placeholder="25"
                min={5}
                max={200}
                tooltip="Soil undrained shear strength"
              />
              <InputField
                label="Soil Elastic Modulus (Es)"
                name="Es"
                value={parameters.Es}
                onChange={handleInputChange}
                unit="kPa"
                placeholder="5000"
                min={1000}
                max={100000}
                step={100}
                tooltip="Soil elastic modulus"
              />
              <InputField
                label="Adhesion Factor (α)"
                name="alpha"
                value={parameters.alpha}
                onChange={handleInputChange}
                unit="-"
                placeholder="0.5"
                min={0.3}
                max={1.0}
                step={0.05}
                tooltip="Shaft adhesion factor"
              />
              <InputField
                label="Bearing Capacity Factor (Nc)"
                name="Nc"
                value={parameters.Nc}
                onChange={handleInputChange}
                unit="-"
                placeholder="9"
                min={5.14}
                max={9}
                step={0.1}
                tooltip="Nc factor (typically 9 for clay)"
              />
            </div>
          </section>
        )}

        {/* Jet Grout Tab */}
        {activeTab === 'jetgrout' && (
          <section className="tab-panel">
            <h2>Jet Grout Properties</h2>
            <div className="form-grid">
              <InputField
                label="Jet Grout Strength (σjet)"
                name="sigmaJet"
                value={parameters.sigmaJet}
                onChange={handleInputChange}
                unit="kPa"
                placeholder="5000"
                min={1000}
                max={20000}
                step={100}
                tooltip="Unconfined compressive strength of jet grout"
              />
              <InputField
                label="Factor of Safety (FS)"
                name="FS"
                value={parameters.FS}
                onChange={handleInputChange}
                unit="-"
                placeholder="2.5"
                min={1.5}
                max={5.0}
                step={0.1}
                tooltip="Global factor of safety"
              />
            </div>
          </section>
        )}

        {/* Loading Tab */}
        {activeTab === 'loading' && (
          <section className="tab-panel">
            <h2>Loading Conditions</h2>
            <div className="form-grid">
              <InputField
                label="Foundation Pressure (qtemel)"
                name="qtemel"
                value={parameters.qtemel}
                onChange={handleInputChange}
                unit="kPa"
                placeholder="150"
                min={50}
                max={1000}
                step={10}
                tooltip="Applied foundation pressure"
              />
            </div>
          </section>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <section className="tab-panel results-panel">
            <h2>Calculation Results</h2>
            {results ? (
              <div className="results-grid">
                <ResultCard title="📐 Geometry" results={results.geometry} />
                <ResultCard title="🧱 Material Parameters" results={results.material} />
                <ResultCard title="💪 Bearing Capacity" results={results.capacity} />
                <ResultCard title="🌍 Improved Soil" results={results.improvedSoil} />
                <ResultCard title="📉 Settlement" results={results.settlement} />
              </div>
            ) : (
              <div className="no-results">
                <p>No results yet. Enter parameters and click "Calculate".</p>
              </div>
            )}
          </section>
        )}

        {/* Calculate Button */}
        {activeTab !== 'results' && (
          <div className="action-bar">
            <button
              className="calculate-btn"
              onClick={handleCalculate}
              disabled={loading}
            >
              {loading ? 'Calculating...' : '🔬 Calculate'}
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Jet-Grout-Calc v1.0 © 2026 | Based on Geotechnical Engineering Formulas</p>
      </footer>
    </div>
  );
}

export default App;
