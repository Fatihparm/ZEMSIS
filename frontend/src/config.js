// API URL konfigürasyonu
// Development: VITE_API_URL tanımlanmamışsa localhost:3001 kullanılır
// Production:  frontend/.env dosyasında VITE_API_URL=/api olarak ayarlayın
//              (veya tam URL: https://api.sizin-domain.com)
export const API_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') // trailing /api varsa çıkar
  : 'http://localhost:3001';

export const API_URL = `${API_BASE_URL}/api`;
