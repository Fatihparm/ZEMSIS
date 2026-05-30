// local_mode: 0 = Sunucu (production), 1 = Yerel (local development)
export const local_mode = 0; 

export const API_BASE_URL = local_mode === 1 ? 'http://localhost:3001' : '';
export const API_URL = `${API_BASE_URL}/api`;
