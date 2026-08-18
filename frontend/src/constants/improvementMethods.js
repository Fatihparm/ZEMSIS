/**
 * ZEMSIS — İyileştirme Yöntemi Sabitleri
 *
 * Tüm desteklenen zemin iyileştirme yöntemlerinin merkezi tanımı.
 * Key, label (TR/EN), ikon ve badge rengi burada tutulur.
 */

export const IMPROVEMENT_METHODS = [
  {
    key: 'jet_grout',
    labelTR: 'Jet Grout',
    labelEN: 'Jet Grouting',
    icon: '💉',
    color: '#1565c0',       // Mavi
    bgColor: '#e3f2fd',
    borderColor: '#90caf9',
  },
  {
    key: 'stone_column',
    labelTR: 'Taş Kolon',
    labelEN: 'Stone Column',
    icon: '🪨',
    color: '#2e7d32',       // Yeşil
    bgColor: '#e8f5e9',
    borderColor: '#a5d6a7',
  },
  {
    key: 'pile',
    labelTR: 'Kazık',
    labelEN: 'Pile',
    icon: '🏗️',
    color: '#e65100',       // Turuncu
    bgColor: '#fff3e0',
    borderColor: '#ffcc80',
  },
  {
    key: 'dsm',
    labelTR: 'DSM',
    labelEN: 'DSM',
    icon: '🧱',
    color: '#6a1b9a',       // Mor
    bgColor: '#f3e5f5',
    borderColor: '#ce93d8',
  },
];

/**
 * Key'e göre yöntem nesnesini döndürür. Bulunamazsa jet_grout döner.
 * @param {string} key
 * @returns {typeof IMPROVEMENT_METHODS[0]}
 */
export function getMethodByKey(key) {
  return IMPROVEMENT_METHODS.find(m => m.key === key) ?? IMPROVEMENT_METHODS[0];
}

/**
 * Key'e göre dile uygun etiketi döndürür.
 * @param {string} key
 * @param {boolean} tr
 * @returns {string}
 */
export function getMethodLabel(key, tr = true) {
  const method = getMethodByKey(key);
  return tr ? method.labelTR : method.labelEN;
}
