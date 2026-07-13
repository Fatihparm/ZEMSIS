/**
 * useCalculation — Hesaplama hook'u
 *
 * Jet grout hesaplamasını API'ye gönderir, loading ve error state'lerini yönetir.
 * safeConvert ile birim dönüşüm güvenliği sağlanır.
 * Daha önce App.jsx içindeydi.
 */
import { useState } from 'react';
import { API_URL } from '../config';

const toKPa = (value, unit) => unit === 'MPa' ? value * 1000 : value;

/**
 * @param {{ parameters, units, setResults, setActiveTab }} workspace
 * @param {{ tr: boolean, t: object }} langCtx
 */
export function useCalculation(workspace, langCtx) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleCalculate = async () => {
    const { parameters, units, setResults, setActiveTab } = workspace;
    const { tr, t } = langCtx;

    setLoading(true);
    setError(null);
    try {
      const maxMm = parseFloat(parameters.maxSettlementMm) || null;

      // ── Birim dönüşüm güvenliği: her sayısal alan için NaN kontrolü ──
      const safeConvert = (fieldName, unitKey) => {
        const raw = parseFloat(parameters[fieldName]);
        if (isNaN(raw)) {
          throw new Error(
            tr
              ? `"${fieldName}" için geçersiz değer. Lütfen sayısal bir değer girin.`
              : `Invalid value for "${fieldName}". Please enter a numeric value.`
          );
        }
        const unit = units[unitKey] || 'kPa';
        return toKPa(raw, unit);
      };

      const convertedParams = {
        ...parameters,
        sigmaJet: safeConvert('sigmaJet', 'sigmaJet'),
        Es:       safeConvert('Es', 'Es'),
        Ejg:      safeConvert('Ejg', 'Ejg'),
        cu:       safeConvert('cu', 'cu'),
        qtemel:   safeConvert('qtemel', 'qtemel'),
        qnet:     parameters.qnet ? safeConvert('qnet', 'qnet') : undefined,
        maxSettlementMm: maxMm,
        maxSettlementCm: maxMm ? maxMm / 10 : null,
      };

      const response = await fetch(`${API_URL}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters: convertedParams, lang: tr ? 'tr' : 'en' })
      });
      const data = await response.json();
      if (data.success) {
        setResults(data.results);
        setActiveTab('results');
      } else {
        setError(data.error || t.calcFailed);
      }
    } catch (err) {
      // Network hataları TypeError, birim hataları Error olarak gelir
      if (err instanceof TypeError) {
        setError(t.apiError);
      } else {
        setError(err.message || t.calcFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, setError, handleCalculate };
}
