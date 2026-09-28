# 🏗️ ZEMSIS — Zemin Sistemleri Tasarım, Analiz ve Denetim Platformu

> **🌐 Canlı Web Sitesi:** [zemsis.com.tr](https://zemsis.com.tr) &mdash; ZEMSIS artık web üzerinde canlıda ve kullanıma hazırdır!

ZEMSIS, modern geoteknik mühendisliği hesaplamaları, çoklu zemin iyileştirme yöntemleri, CAD tabanlı etkileşimli çizim modülü, zemin profil analizi, kriptografik doğrulamalı dinamik rapor hazırlama editörü ve belediye onay/başvuru portalını tek bir çatı altında birleştiren, React 19 ve Node.js/PostgreSQL mimarisi üzerine kurulu tam donanımlı bir mühendislik ve denetim platformudur.

![Website](https://img.shields.io/badge/website-zemsis.com.tr-blue?style=flat&logo=googlechrome&logoColor=white)
![Status](https://img.shields.io/badge/status-canlıda%20(live)-success)
![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-v18%2B-brightgreen)
![React](https://img.shields.io/badge/react-v19-61dafb?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/postgresql-15%2B-4169e1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker&logoColor=white)

---

## 🌟 Canlı Erişim ve Dağıtım

Platform bulut ortamında yayına alınmış olup doğrudan web tarayıcısı üzerinden kullanılabilir:

* 🔗 **Web Sitesi:** [https://zemsis.com.tr](https://zemsis.com.tr)
* ☁️ **Frontend Barındırma:** Vercel SPA altyapısı (otomatik yönlendirme ve CDN önbellekleme)
* 🛡️ **Backend & DB:** Bulut SSL destekli PostgreSQL bağlantı havuzu ve güvenli REST API

---

## 📋 Öne Çıkan Özellikler

### 1. 🧬 Çoklu Zemin İyileştirme Yöntemleri
ZEMSIS artık yalnızca Jet Grout değil, geoteknik mühendisliğinde yaygın olarak kullanılan 4 farklı iyileştirme yöntemini destekler:
* 💉 **Jet Grout (Jet Grouting):** Yüksek basınçlı enjeksiyon kolon geometrisi, alan değiştirme oranı, tekil ve grup taşıma gücü, oturma analizleri.
* 🪨 **Taş Kolon (Stone Column):** Kohezyonlu ve gevşek zeminlerde drenaj hızlandırma, sıvılaşma önleme ve taşıma kapasitesi artırımı.
* 🏗️ **Kazık (Pile):** Derin temel ve kazıklı zemin güçlendirme tasarımları ve yük dağılım hesapları.
* 🧱 **DSM (Deep Soil Mixing - Derin Zemin Karıştırma):** Zemin ile çimento harcının yerinde mekanik olarak karıştırılmasıyla oluşturulan kolon analizleri.

### 2. 📊 Geoteknik Hesaplama & Gerilme Analizleri
* **Kolon Geometrisi & Alan Dağılımı**: Kolon çapı ($D$), yerleşim aralığı ($s$) ve zemin iyileştirme derinliğine ($H$) bağlı kolon alanı ($A_{kolon}$) ve alan değiştirme oranları ($a$).
* **Taşıma Kapasitesi & Oturma Analizi**: Tekil ve grup bazında taşıma kapasitesi, uç dirençleri ve çevre sürtünmeleri ($Q_s$, $Q_u$, $Q_{emn}$). Mohr-Coulomb parametreleri ile eşdeğer zemin modülü ($E_{iyileştirilmiş}$) ve tabaka oturma ($\delta$) analizleri.
* **Derinliğe Göre Gerilme Grafiği**: Zemin katmanları boyunca derinlikle değişen net gerilme ve taşıma kapasitesi sınırlarını gösteren interaktif grafikler (`StressChart`).

### 3. ✏️ Etkileşimli Çizim Modülü (`PlanView`)
* **Tasarım Paneli**: Zoom, pan, dinamik ızgara (grid), hassas koordinat takibi ve kolon yerleşim araçları.
* **Undo/Redo Sistemi**: Çizimler üzerinde tam denetim sağlayan geri alma (`Ctrl+Z`) ve ileri alma (`Ctrl+Y`) mekanizması.
* **Kesit Hattı Belirleme**: Zemin profil kesitini anlık çıkarmak için çizim alanı üzerinde etkileşimli kesit çizgisi oluşturma.

### 4. 📐 Çok Katmanlı Zemin & Kesit Görünümü (`SoilSectionPanel` & `CrossSectionView`)
* **Katman Yönetimi**: Kum, kil, silt ve kaya tabakalarının kalınlık, birim hacim ağırlık ($\gamma$), içsel sürtünme açısı ($\phi$), kohezyon ($c$), elastisite modülü ($E_s$) ve Poisson oranı ($\nu$) parametreleriyle eklenip yönetilmesi.
* **Yeraltı Suyu Seviyesi (YASS)**: Yeraltı su seviyesinin derinliğe bağlı olarak belirlenmesi ve efektif gerilme hesaplarının otomatik güncellenmesi.
* **Dinamik Kesit Çizimi**: Belirlenen hat boyunca zemin tabakalarını ve iyileştirme kolonlarını ölçekli görselleştiren interaktif enkesit görünümü.

### 5. 📂 CAD Desteği (`DxfParser`)
* **AutoCAD DXF Import**: Gerçek dünya CAD projelerinden (`.dxf` formatında) poligon, çember ve noktaları parse ederek aplikasyon koordinatlarını doğrudan ZEMSIS platformuna aktarma.

### 6. ✍️ Modüler Rapor Editörü & DOCX Üretici (`backend/reports/`)
* **12 Bölümlü Kapsamlı Rapor Taslağı**: Giriş, Mevcut Zemin Araştırmaları, Depremsellik (TBDY-2018 ve AFAD verileri uyumlu), Hesaplama Sonuçları ve Önerilen İyileştirme Sistemi gibi standart mühendislik rapor şablonu.
* **Görsel Yükleme & Yönetimi (`report_images`)**: Rapor bölümlerine özel saha fotoğrafları, laboratuvar deney föyleri ve çizim görselleri ekleme, veritabanında güvenli saklama.
* **Resmi Doğrulama Kodu (`ZMS-YYYY-XXXX-XXXX`)**: Her üretilen rapora kriptografik güvenlikle benzersiz bir doğrulama kodu atanır (`report_verifications`).
* **Kurumsal Word (.docx) Çıktısı**: Tüm hesaplamaları, zemin parametrelerini, şekilleri ve tabloları antetli ve imzaya hazır formatta dışa aktarma.

### 7. 🏛️ Belediye Başvuru & Onay Portalı (`OfficerPortal` & `applications.js`)
* **Dijital Ruhsat Başvurusu**: Mühendislerin hazırladıkları projeleri doğrudan ilgili belediyeye (örn. Bursa Büyükşehir, Osmangazi, Nilüfer, Kestel vb.) dijital ortamda onaya gönderebilmesi.
* **Yetkili Denetim Paneli**: Belediye teknik personelleri (`municipal_officer` rolü) için kilitli/salt-okunur proje inceleme ve onay/ret/açıklama süreci.
* **Belediye Rapor Çıktısı**: Onaylanan veya inceleme aşamasındaki projelerin resmi hesap raporunu belediye panelinden anında indirebilme.

### 8. 🔐 Güvenlik, Kimlik Doğrulama & Veri Bütünlüğü
* **Google OAuth & JWT**: Google ile tek tıkla giriş/kayıt ve geleneksel e-posta/şifre (bcrypt) kimlik doğrulama.
* **Tip Güvenli Veri Doğrulama (Zod)**: Backend API isteklerinde şema doğrulaması (`schemas.js`) ile hatalı veri girişlerinin engellenmesi.
* **Güvenlik Katmanları**: Rate limiting (`express-rate-limit`), HTTP güvenlik başlıkları (`helmet`) ve CORS koruması.

---

## 🛠️ Teknolojik Altyapı

| Alan | Teknolojiler |
| :--- | :--- |
| **Frontend** | React 19, Vite, Zustand, Canvas API, Quill (Rich Text), Poppins & Inter fontları |
| **Backend** | Node.js, Express.js 5, Zod, Helmet, Express-Rate-Limit, Google Auth Library |
| **Veritabanı** | PostgreSQL (Bağlantı havuzu `pg` pool, Cloud SSL desteği, otomatik migrasyonlar) |
| **Belge Motoru** | `docx` kütüphanesi (Word belgesi, özel tablolar, gömülü grafikler ve antet) |
| **Dağıtım & DevOps** | Canlı Alan Adı (`zemsis.com.tr`), Vercel SPA, Docker & Docker Compose |

---

## 🚀 Kurulum ve Çalıştırma

Platformu bulut ortamında kullanabileceğiniz gibi ([zemsis.com.tr](https://zemsis.com.tr)), yerel geliştirme ortamınızda da çalıştırabilirsiniz.

### Yöntem A: Docker Compose ile Hızlı Başlangıç

Sisteminizde Docker ve Docker Compose yüklü ise:

1. Proje kök dizininde komutu çalıştırın:
   ```bash
   docker-compose up --build
   ```
2. Servisler ayağa kalktıktan sonra erişin:
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:3001](http://localhost:3001)
   - **PostgreSQL:** Local port `5433`

---

### Yöntem B: Adım Adım Yerel Kurulum

#### 1. Gereksinimler
* Node.js v18 veya üzeri
* npm v9 veya üzeri
* PostgreSQL 15+

#### 2. Backend Kurulumu ve Başlatma
1. `backend` klasörüne gidin ve bağımlılıkları yükleyin:
   ```bash
   cd backend
   npm install
   ```
2. `.env` dosyasını oluşturun:
   ```env
   PORT=3001
   DATABASE_URL=postgresql://postgres:sifreniz@localhost:5432/jet_grout_db
   JWT_SECRET=gizli_jwt_anahtari_2026
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://zemsis.com.tr
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   ```
3. API sunucusunu başlatın (tablolar otomatik olarak oluşturulacaktır):
   ```bash
   npm run dev
   ```
   *(Opsiyonel olarak birim testlerini çalıştırmak için: `npm test`)*

#### 3. Frontend Kurulumu ve Başlatma
1. `frontend` klasörüne geçin ve bağımlılıkları yükleyin:
   ```bash
   cd ../frontend
   npm install
   ```
2. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```
3. Tarayıcınızdan [http://localhost:5173](http://localhost:5173) adresini açın.

---

## 📊 Örnek Geoteknik Formüller

### Kolon Geometrisi & Alan Oranı
| Formül | Açıklama |
| :--- | :--- |
| $A_{kolon} = \frac{\pi \cdot D^2}{4}$ | İyileştirme kolonu kesit alanı ($m^2$) |
| $a = \frac{A_{kolon}}{s^2}$ | Kare yerleşim düzeninde alan değiştirme (iyileştirme) oranı |
| $a = \frac{A_{kolon}}{\frac{\sqrt{3}}{2} \cdot s^2}$ | Üçgen yerleşim düzeninde alan değiştirme oranı |

### Taşıma Kapasitesi (Jet Grout Örneği)
| Formül | Açıklama |
| :--- | :--- |
| $Q_s = \alpha \cdot c_u \cdot \pi \cdot D \cdot H$ | Kolon çevre sürtünme taşıma kapasitesi ($kN$) |
| $Q_u = N_c \cdot c_u \cdot A_p$ | Kolon uç direnci taşıma kapasitesi ($kN$) |
| $Q_{emn} = \frac{Q_u}{\gamma_{Rsb}} + \frac{Q_s}{\gamma_{Ru}}$ | Emniyetli kolon taşıma gücü ($kN$) |

### Eşdeğer Zemin Modülü & Blok Oturma
| Formül | Açıklama |
| :--- | :--- |
| $c_{u\_iyileştirilmiş} = a \cdot c_{kolon} + (1-a) \cdot c_u$ | İyileştirilmiş eşdeğer kohezyon ($kPa$) |
| $E_{iyileştirilmiş} = E_{kolon} \cdot a + E_s \cdot (1-a)$ | İyileştirilmiş kompozit zemin modülü ($kPa$) |
| $\delta = \frac{q_{net} \cdot L}{E_{iyileştirilmiş}}$ | İyileştirilmiş blok bölgesindeki elastik oturma ($m$) |

---

## 📁 Proje Klasör Yapısı

```text
Jet-Grout/
├── backend/
│   ├── index.js               # Express API sunucusu, güvenlik ve CORS ayarları
│   ├── calculations.js        # Geoteknik, katman ve gerilme hesaplama motoru
│   ├── calculations.test.js   # Hesaplama motoru birim testleri
│   ├── schemas.js             # Zod ile veri doğrulama şemaları
│   ├── schemas.test.js        # Şema doğrulama testleri
│   ├── errorHandler.js        # Merkezi hata yakalama ve formatlama ara yazılımı
│   ├── auth.js                # JWT & Google OAuth kimlik doğrulama işlemleri
│   ├── projects.js            # Proje yönetimi (CRUD) ve iyileştirme yöntemleri
│   ├── applications.js        # Belediye onay süreçleri ve başvuru takibi
│   ├── db.js                  # PostgreSQL havuz bağlantısı ve otomatik migrasyonlar
│   ├── migrate.js             # DB şema ilklendirme scripti
│   ├── reports/               # Modüler raporlama altyapısı
│   │   ├── router.js          # Rapor oluşturma ve taslak API rotaları
│   │   ├── docxBuilder.js     # Kurumsal Word (.docx) rapor derleme motoru
│   │   ├── draft.js           # Rapor taslakları ve görsel (BYTEA) yönetimi
│   │   └── verifyCode.js      # Kriptografik rapor doğrulama kodu üretici
│   ├── Dockerfile             # Backend imaj tanımları
│   └── package.json
│
├── frontend/
│   ├── vercel.json            # Vercel SPA routing yapılandırması
│   ├── src/
│   │   ├── App.jsx            # Ana uygulama bileşeni ve sekmeli çalışma alanı
│   │   ├── App.css            # Global UI stilleri & Glassmorphism teması
│   │   ├── store/             # Zustand global state yönetimi
│   │   │   └── useWorkspaceStore.js
│   │   ├── constants/         # Sabitler ve çoklu yöntem tanımları
│   │   │   ├── improvementMethods.js  # Jet Grout, Taş Kolon, Kazık, DSM
│   │   │   └── translations.js        # Çoklu dil (TR/EN) terim haritaları
│   │   ├── components/        # Modüler kullanıcı arayüzü bileşenleri
│   │   │   ├── PlanView.jsx            # Canvas tabanlı interaktif çizim modülü
│   │   │   ├── SoilSectionPanel.jsx    # Zemin katmanları ve YASS editörü
│   │   │   ├── CrossSectionView.jsx    # Zemin-kolon enkesit çizim görünümü
│   │   │   ├── ReportEditorPage.jsx    # Blok bazlı rapor düzenleme ve görsel ekleme
│   │   │   ├── OfficerPortal.jsx       # Belediye yetkilisi başvuru denetim portalı
│   │   │   ├── OfficerWorkspaceView.jsx# Belediye için salt-okunur inceleme ekranı
│   │   │   ├── AuthPage.jsx            # JWT & Google OAuth giriş/kayıt ekranı
│   │   │   ├── ProjectsPage.jsx        # Kayıtlı projeler listesi ve yönetim ekranı
│   │   │   ├── StressChart.jsx         # Derinliğe bağlı gerilme değişim grafiği
│   │   │   ├── MobileWarning.jsx       # Mobil cihaz bilgilendirme uyarısı
│   │   │   └── layout/
│   │   │       ├── MethodSelectModal.jsx # Zemin iyileştirme yöntemi seçim diyaloğu
│   │   │       └── TopBar.jsx            # Üst gezinme çubuğu ve proje bilgileri
│   │   └── hooks/             # Özel React kancaları (useCalculation, useWorkspace vb.)
│   ├── Dockerfile             # Frontend Nginx imaj dosyası
│   └── package.json
│
├── docker-compose.yml         # Konteyner orkestrasyonu
└── README.md                  # Proje dokümantasyonu
```

---

## 📜 Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır.

## 👨‍💻 Geliştirici & İletişim

* **Geliştirici:** Fatih Parmaksız
* **Web:** [zemsis.com.tr](https://zemsis.com.tr)
* **Yıl:** 2026

---
⭐ Projeyi beğendiyseniz GitHub üzerinde yıldız vermeyi unutmayın!
