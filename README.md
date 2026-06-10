# 🏗️ ZEMSIS — Zemin Sistemleri Tasarım ve Analiz Aracı

ZEMSIS, modern geoteknik mühendisliği hesaplamaları, CAD tabanlı etkileşimli çizim modülü, zemin profil analizi, dinamik rapor hazırlama editörü ve belediye onay/başvuru portalını tek bir çatı altında birleştiren, React frontend ve Node.js/PostgreSQL backend mimarisi üzerine kurulu tam donanımlı bir mühendislik ve denetim platformudur.

![Version](https://img.shields.io/badge/version-2.5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-v18%2B-brightgreen)
![Docker](https://img.shields.io/badge/docker-ready-blue)

---

## 📋 Öne Çıkan Özellikler

### 1. 📊 Geoteknik & Jet Grout Analizleri
* **Kolon Geometrisi & Alan Dağılımı**: Kolon çapı ($D$), yerleşim aralığı ($s$) ve zemin iyileştirme derinliğine ($H$) bağlı kolon alanı ($A_{jet}$) ve alan değiştirme oranları ($a$).
* **Taşıma Kapasitesi & Oturma Analizi**: Tekil ve grup bazında taşıma kapasitesi, uç dirençleri ve çevre sürtünmeleri ($Q_s$, $Q_u$). Mohr-Coulomb parametreleri ile iyileştirilmiş zemin modülü ($E_{iyileştirilmiş}$) ve oturma ($s$) analizleri.
* **Derinliğe Göre Gerilme Grafiği**: Zemin katmanları boyunca derinlikle değişen net gerilme ve taşıma kapasitesi kontrolünü gösteren dinamik grafikler (`StressChart`).

### 2. ✏️ Etkileşimli Çizim Modülü (`PlanView`)
* **Tasarım Paneli**: Zoom, pan, kılavuz çizgiler (grid), koordinat takibi ve dinamik jet-grout yerleşim araçları.
* **Undo/Redo Sistemi**: Çizimler üzerinde tam kontrol sağlayan geri alma (Ctrl+Z) ve ileri alma (Ctrl+Y) mekanizması.
* **Kesit Hattı Belirleme**: Zemin profil kesitini çıkarmak için çizim alanı üzerinden kesit çizgisi çekme aracı.

### 3. 📐 Gelişmiş Zemin & Kesit Görünümü (`SoilSectionPanel` & `CrossSectionView`)
* **Çok Katmanlı Zemin Yapısı**: Kum, kil, silt ve kaya tabakalarının kalınlık, birim hacim ağırlık ($\gamma$), içsel sürtünme açısı ($\phi$), kohezyon ($c$), elastisite modülü ($E_s$) ve Poisson oranı ($\nu$) parametreleriyle eklenip yönetilmesi.
* **Yeraltı Suyu Seviyesi**: Yeraltı su seviyesinin (YASS) derinliğe bağlı olarak ayarlanması ve efektif gerilme hesaplarının otomatik güncellenmesi.
* **İnteraktif Kesit Çizimi**: Belirlenen kesit hattı boyunca zemin katmanlarını ve kolonları görselleştiren dinamik enkesit görünümü.

### 4. 📂 Profesyonel CAD Entegrasyonu (`DxfParser`)
* **DXF Import**: Gerçek dünya AutoCAD ve benzeri CAD projelerinden (`.dxf` uzantılı) çember, poligon ve noktaları okuyarak koordinatları doğrudan platforma aktarma ve işleme kapasitesi.

### 5. ✍️ Rapor Editörü & DOCX Rapor Oluşturucu (`ReportEditorPage` & `reports.js`)
* **Zengin Rapor Taslak Editörü**: Giriş, Mevcut Zemin Araştırmaları, Depremsellik (TBDY-2018 ve AFAD verileri uyumlu), Önerilen Temel Sistemi gibi 12 ana bölümden oluşan detaylı rapor editörü.
* **Blok Bazlı Zengin İçerik**: Rapor bölümlerine dinamik olarak alt başlıklar, paragraflar, özel resimler (görsel açıklamalarıyla) ve özel tablolar ekleyebilme.
* **Kurumsal Word Raporu (.docx)**: Tek tıkla projenin hesaplama sonuçlarını, zemin tabakalarını, çizim görsellerini ve kullanıcı yorumlarını kurumsal antetli bir şablonda Microsoft Word belgesi olarak indirme.

### 6. 🏛️ Belediye Başvuru & Onay Portalı (`OfficerPortal` & `applications.js`)
* **Proje Gönderimi**: Tasarlanan projelerin ilgili belediyelere (örn. Bursa Büyükşehir, Osmangazi, Nilüfer, Kestel) resmi onay için gönderilmesi.
* **Yetkili Denetimi**: Belediye personellerinin (`municipal_officer` rolü), kendi bölgelerine gelen başvuruları görebildiği, projeyi salt-okunur (kilitli) modda detaylıca inceleyebildiği portal.
* **Karar Mekanizması**: Projeyi onaylama veya eksiklikleri belirterek gerekçeli karar (ret notu) ile iade etme. Onaylanan veya bekleyen projelere ait resmi hesap raporunu doğrudan belediye panelinden indirebilme.

---

## 🛠️ Teknolojik Altyapı

* **Frontend**: React 19, Vite, Canvas API, CSS Variables, Modern Font Aileleri (Poppins & Inter).
* **Backend**: Node.js, Express.js.
* **Veritabanı**: PostgreSQL (Bağlantı havuzu `pg` pool, otomatik şema migrasyonları).
* **Güvenlik**: JWT (JsonWebToken), şifreleme için `bcrypt` ve rol tabanlı yetkilendirme (mühendis/belediye görevlisi).
* **Word Rapor Kütüphanesi**: `docx` kütüphanesi (Word şablonları, özel hizalanmış tablolar ve görsel gömmeler için).
* **Konteynerleştirme**: Docker & Docker Compose.

---

## 🚀 Kurulum ve Çalıştırma

Platformu çalıştırmak için yerel kurulumu veya Docker ile hızlı ayağa kaldırma yöntemini tercih edebilirsiniz.

### Yöntem A: Docker Compose ile Hızlı Başlangıç (Önerilen)

Sisteminizde Docker ve Docker Compose yüklü ise, tek bir komutla Frontend, Backend ve PostgreSQL veritabanını ayağa kaldırabilirsiniz:

1. Proje kök dizininde terminali açın:
   ```bash
   docker-compose up --build
   ```
2. Servisler ayağa kalktıktan sonra tarayıcınızdan erişin:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:3001](http://localhost:3001)
   - **PostgreSQL Veritabanı**: Local port `5433` üzerinden erişilebilir durumdadır.

---

### Yöntem B: Adım Adım Yerel Kurulum

#### 1. Gereksinimler
* Node.js v18 veya üzeri
* npm v9 veya üzeri
* PostgreSQL 15+ kurulu ve çalışır durumda olması

#### 2. Veritabanı Hazırlığı
PostgreSQL sunucunuzda boş bir veritabanı oluşturun (örneğin: `jet_grout_db`).

#### 3. Backend Yapılandırması ve Başlatma
1. `backend` klasörüne geçin ve bağımlılıkları yükleyin:
   ```bash
   cd backend
   npm install
   ```
2. `backend` klasörü içinde `.env` dosyası oluşturun ve bilgileri düzenleyin:
   ```env
   PORT=3001
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=jet_grout_db
   DB_PASSWORD=sifreniz
   DB_PORT=5432
   JWT_SECRET=gizli_jwt_anahtari_2026
   ```
3. Veritabanı migrasyonlarını çalıştırın ve API sunucusunu başlatın:
   ```bash
   npm run dev
   ```
   API sunucusu [http://localhost:3001](http://localhost:3001) adresinde çalışmaya başlayacak ve gerekli tabloları veritabanında otomatik olarak oluşturacaktır (`migrate.js` vasıtasıyla).

#### 4. Frontend Yapılandırması ve Başlatma
1. `frontend` klasörüne geçin ve bağımlılıkları yükleyin:
   ```bash
   cd ../frontend
   npm install
   ```
2. Frontend geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```
3. Arayüze [http://localhost:5173](http://localhost:5173) adresinden erişebilirsiniz.

---

## 📊 Uygulanan Mühendislik Formülleri

### Kolon Geometrisi
| Formül | Açıklama |
| :--- | :--- |
| $A_{jet} = \frac{\pi \cdot D^2}{4}$ | Jet-grout kolon alanı ($m^2$) |
| $a = \frac{A_{jet}}{s^2}$ | Kare yerleşim için alan değiştirme (iyileştirme) oranı |

### Taşıma Kapasitesi (Tekil ve Grup)
| Formül | Açıklama |
| :--- | :--- |
| $Q_s = \alpha \cdot c_u \cdot \pi \cdot D \cdot H$ | Kolon çevre sürtünme taşıma kapasitesi ($kN$) |
| $Q_u = N_c \cdot c_u \cdot A_p$ | Kolon uç direnci kapasitesi ($kN$) |
| $Q_{emn} = \frac{Q_u}{\gamma_{Rsb}} + \frac{Q_s}{\gamma_{Ru}}$ | Taşıma kapasitesi emniyetli değeri ($kN$) |

### Malzeme Tasarım Parametreleri
| Formül | Açıklama |
| :--- | :--- |
| $\sigma_{jet\_tasarım} = \frac{\sigma_{jet}}{FS}$ | Jet-grout tasarımı basınç mukavemeti ($kPa$) |
| $E_{jg} = 300 \cdot \sigma_{jet\_tasarım}$ | Jet-grout kolonu elastisite modülü ($kPa$) |
| $c_{jet} = \sigma_{jet\_tasarım} \cdot 0.4$ | Jet-grout kolonu eşdeğer kohezyonu ($kPa$) |

### İyileştirilmiş Zemin Özellikleri & Oturma
| Formül | Açıklama |
| :--- | :--- |
| $c_{u\_iyileştirilmiş} = a \cdot c_{jet} + (1-a) \cdot c_u$ | Eşdeğer iyileştirilmiş kohezyon dayanımı ($kPa$) |
| $E_{iyileştirilmiş} = E_{jg} \cdot a + E_s \cdot (1-a)$ | Eşdeğer iyileştirilmiş zemin modülü ($kPa$) |
| $\delta = \frac{q_{net} \cdot L}{E_{iyileştirilmiş}}$ | Jet-grout blok bölgesindeki elastik oturma miktarı ($m$) |

---

## 📁 Proje Klasör Yapısı

```text
Jet-Grout/
├── backend/
│   ├── index.js               # Express API sunucusu & endpoint tanımları
│   ├── calculations.js        # Geoteknik, katman ve gerilme hesaplama motoru
│   ├── auth.js                # JWT doğrulama ve kullanıcı yetkilendirme işlemleri
│   ├── projects.js            # Proje oluşturma, okuma, güncelleme ve silme (CRUD)
│   ├── reports.js             # Word (.docx) rapor şablonu oluşturma servisi
│   ├── applications.js        # Belediye proje başvuruları ve onay süreçleri API'si
│   ├── db.js                  # PostgreSQL havuz bağlantısı ve migrasyon yönetimi
│   ├── migrate.js             # DB tabloları ilklendirme scripti
│   ├── Dockerfile             # Backend imaj kurulum dosyası
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Ana React Router ve uygulama iskeleti
│   │   ├── App.css            # Global stiller ve Glassmorphism değişkenleri
│   │   ├── index.css          # Temel sayfa sıfırlamaları
│   │   ├── components/        # Yeniden kullanılabilir UI Bileşenleri
│   │   │   ├── PlanView.jsx            # Canvas tabanlı interaktif yerleşim modülü
│   │   │   ├── SoilSectionPanel.jsx    # Zemin katman editörü ve görsel arayüzü
│   │   │   ├── CrossSectionView.jsx    # Zemin-kolon enkesit çizim paneli
│   │   │   ├── ReportEditorPage.jsx    # Rapor taslak ve içerik düzenleme sayfası
│   │   │   ├── OfficerPortal.jsx       # Belediye personeli başvuru yönetim portalı
│   │   │   ├── AuthPage.jsx            # Giriş / Kayıt sayfası
│   │   │   ├── Dashboard.jsx           # Projeler ve hızlı erişim ana sayfası
│   │   │   └── StressChart.jsx         # Derinliğe bağlı gerilme değişim grafiği
│   │   └── utils/
│   ├── Dockerfile             # Nginx tabanlı frontend sunucu imajı
│   └── package.json
│
├── docker-compose.yml         # Frontend, Backend ve PostgreSQL orkestrasyonu
└── README.md                  # Proje dokümantasyonu (Bu dosya)
```

---

## 📜 Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır. Detaylı bilgi için proje kök dizinindeki `LICENSE` (varsa) dosyasını inceleyebilirsiniz.

## 👨‍💻 Geliştirici

Fatih - 2026

---
⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!

