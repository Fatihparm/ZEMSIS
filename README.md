# 🏗️ ZEMSIS

Zemin Sistemleri Tasarım ve Analiz Aracı. React frontend ve Node.js/PostgreSQL backend mimarisi ile geliştirilmiş tam donanımlı bir mühendislik aracıdır.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📋 Özellikler

- ✅ **Jet Grout Hesaplamaları**: Kolon geometrisi, tekil/grup taşıma kapasitesi ve oturma analizleri.
- ✅ **Etkileşimli Çizim Modülü (PlanView)**: Zoom, pan, poligon çizimi, kesit hattı belirleme araçları.
- ✅ **DXF Ayrıştırıcı (DxfParser)**: Gerçek dünya profesyonel CAD (.dxf) projelerinden çember ve poligon okuma/işleme.
- ✅ **Gelişmiş Zemin ve Kesit Görünümü (SoilSectionPanel)**: Tek sayfada birleştirilmiş zemin tabakası yönetimi, kalınlık düzenleme ve detaylı Mohr-Coulomb parametreleri girişi.
- ✅ **Undo/Redo Sistemi**: Çizim modülünde geri/ileri alma olanaklarıyla esnek çalışma (Ctrl+Z / Ctrl+Y).
- ✅ **Kullanıcı Doğrulama ve Proje Yönetimi**: PostgreSQL entegrasyonu ile kullanıcı oluşturma, proje kaydetme/yükleme, geçmiş projeleri yönetme.
- ✅ **Modern & Responsive Arayüz**: Dinamik araç çubukları, interaktif araç ipuçları (tooltips), Poppins/Inter font aileleriyle şık tipografi ve Glassmorphism dokunuşları.

## 🚀 Kurulum

### Gereksinimler
- Node.js v18+
- npm v9+
- PostgreSQL
- PostgreSQL için boş bir veritabanı (örn. `jet_grout_db`)

### Backend Kurulumu
```bash
cd backend
npm install
```
Backend kök dizininde bir `.env` dosyası oluşturarak PostgreSQL bağlantı bilgilerinizi ve JWT anahtarınızı ekleyin:
```env
PORT=3001
DB_USER=postgres
DB_HOST=localhost
DB_NAME=jet_grout_db
DB_PASSWORD=sifreniz
DB_PORT=5432
JWT_SECRET=gizli_anahtariniz
```

### Frontend Kurulumu
```bash
cd frontend
npm install
```

## 💻 Çalıştırma

### Backend'i Başlat (Terminal 1)
```bash
cd backend
npm run dev
```
Backend http://localhost:3001 adresinde çalışacaktır.

### Frontend'i Başlat (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend http://localhost:5173 adresinde çalışacaktır.

## 📊 Uygulanan Formüller

### Kolon Geometrisi
| Formül | Açıklama |
|--------|----------|
| `Ajet = π·D²/4` | Jet-grout kolon alanı |
| `a = Ajet/s²` | Alan değiştirme oranı |

### Taşıma Kapasitesi
| Formül | Açıklama |
|--------|----------|
| `Qs = α·cu·π·D·H` | Çevre sürtünme kapasitesi |
| `Qu = Nc·cu·Ap` | Uç direnci |
| `Qemn = Qu/γRsb + Qs/γRu` | Emniyetli kapasite |

### Malzeme Parametreleri
| Formül | Açıklama |
|--------|----------|
| `σjet_tasarım = σjet/FS` | Tasarım basınç dayanımı |
| `Ejg = 300·σjet_tasarım` | Elastisite modülü |
| `cjet = σjet_tasarım × 0.4` | Kohezyon değeri |

### İyileştirilmiş Zemin
| Formül | Açıklama |
|--------|----------|
| `cu_iyileştirilmiş = a·cjet + (1-a)·cu` | İyileştirilmiş kohezyon |
| `E_iyileştirilmiş = Ejg·a + Es·(1-a)` | İyileştirilmiş modül |
| `δ = qnet·L / E_iyileştirilmiş` | Oturma miktarı |

## 📁 Proje Yapısı

```text
Jet-Grout/
├── backend/
│   ├── index.js           # Express API ve Auth sunucusu
│   ├── calculations.js    # Geoteknik hesaplama fonksiyonları
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Ana React Router yapısı
│   │   ├── App.css        # Global stiller (Poppins, Inter vb.)
│   │   └── components/    # UI Bileşenleri (PlanView, SoilSectionPanel, vb.)
│   ├── index.html
│   └── package.json
│
└── README.md
```

## 🛠️ Teknolojiler

- **Frontend:** React 19, Vite, Canvas API
- **Backend:** Node.js, Express
- **Veritabanı & Güvenlik:** PostgreSQL, `pg`, `bcrypt`, `jsonwebtoken`
- **Styling:** Vanilla CSS, CSS Variables, Modern Typography (Poppins & Inter)

## 📜 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👨‍💻 Geliştirici

Fatih - 2026

---

⭐ Bu proje faydalı olduysa yıldız vermeyi unutmayın!
