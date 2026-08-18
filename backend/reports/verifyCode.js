// ── Doğrulama kodu üretici ────────────────────────────────────────────────────
// crypto.randomBytes() — kriptografik güvenli rastgelelik (Math.random() değil)
'use strict';

const { randomBytes } = require('crypto');

/**
 * ZMS-YYYY-XXXX-XXXX formatında benzersiz rapor doğrulama kodu üretir.
 * 0/O ve 1/I karakterleri alfabe dışı bırakılmıştır (okunabilirlik).
 *
 * @param {string|number} projectId
 * @returns {string}
 */
function generateVerifyCode(projectId) {
  const year = new Date().getFullYear();
  const projectSlug = String(projectId || '').replace(/-/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O, 1/I karışıklığı yok
  const bytes = randomBytes(4);
  const rand = Array.from(bytes).map(b => chars[b % chars.length]).join('');
  return `ZMS-${year}-${projectSlug}-${rand}`;
}

module.exports = { generateVerifyCode };
