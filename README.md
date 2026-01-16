# 🏗️ Jet-Grout-Calc

Jet Grouting hesaplamaları için modern web uygulaması. React frontend ve Node.js backend ile geliştirilmiştir.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📋 Özellikler

- ✅ Jet Grout kolon geometrisi hesaplamaları
- ✅ Tekil kolon taşıma kapasitesi analizi
- ✅ İyileştirilmiş zemin parametreleri
- ✅ Oturma analizi
- ✅ Modern ve responsive arayüz
- ✅ Gerçek zamanlı hesaplama

## 🚀 Kurulum

### Gereksinimler
- Node.js v18+
- npm v9+

### Backend Kurulumu
```bash
cd backend
npm install
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
npm start
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

## 🔧 API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/health` | Sağlık kontrolü |
| GET | `/api/defaults` | Varsayılan parametreler |
| GET | `/api/parameters` | Parametre tanımları |
| POST | `/api/calculate` | Hesaplama yap |

### Örnek API İsteği
```bash
curl -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "D": 0.8,
      "s": 1.5,
      "cu": 25,
      "sigmaJet": 5000,
      "Es": 5000,
      "H": 10,
      "qtemel": 150,
      "FS": 2.5
    }
  }'
```

## 📁 Proje Yapısı

```
Jet-Grout/
├── backend/
│   ├── index.js           # Express API sunucusu
│   ├── calculations.js    # Hesaplama fonksiyonları
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Ana React bileşeni
│   │   ├── App.css        # Stil dosyası
│   │   └── components/
│   │       ├── InputField.jsx
│   │       ├── InputField.css
│   │       ├── ResultCard.jsx
│   │       └── ResultCard.css
│   ├── index.html
│   └── package.json
│
└── README.md
```

## 📝 Giriş Parametreleri

| Parametre | Sembol | Birim | Açıklama |
|-----------|--------|-------|----------|
| Kolon Çapı | D | m | Jet grout kolon çapı |
| Kolon Aralığı | s | m | Kolon karelaj aralığı |
| Kolon Yüksekliği | H | m | İyileştirme derinliği |
| Drenajsız Kohezyon | cu | kPa | Zemin kayma mukavemeti |
| Zemin Modülü | Es | kPa | Zemin elastisite modülü |
| Jet Grout Mukavemeti | σjet | kPa | Serbest basınç dayanımı |
| Temel Basıncı | qtemel | kPa | Uygulanan temel basıncı |
| Güvenlik Katsayısı | FS | - | Global güvenlik faktörü |

## 🛠️ Teknolojiler

- **Frontend:** React 18, Vite
- **Backend:** Node.js, Express
- **Styling:** CSS3 (Glassmorphism)

## 📜 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👨‍💻 Geliştirici

Fatih - 2026

---

⭐ Bu proje faydalı olduysa yıldız vermeyi unutmayın!
