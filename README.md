# MedAgent SaaS — Production-Ready Tibbiy Navbat va AI Ekotizimi

MedAgent SaaS — ko'p klinikalarni (Multi-tenant) qo'llab-quvvatlovchi, sun'iy intellekt (AI Function Calling) yordamida bemorlarni qabulga yozish, Telegram Bot, Telegram Mini App (TMA), markaziy Backend API va Web Admin Dashboard'dan iborat to'liq integratsiyalashgan B2B tibbiy platforma.

---

## 🏗 Loyiha Arxitekturasi

```
                        +---------------------------------------+
                        |        BEMORLAR (Telegram)            |
                        +---------------------------------------+
                                    |              |
                       Telegram Bot |              | Telegram Mini App (TMA)
                       (Voice/Text) |              | (Web View)
                                    v              v
+-----------------------------------------------------------------------------------+
|                            CENTRAL BACKEND API (FastAPI)                          |
|                                                                                   |
|  +---------------------+  +----------------------+  +--------------------------+  |
|  | Webhook Router      |  | Multi-Tenant Context |  | AI Engine                |  |
|  | (Maps Token -> ID)  |  | Middleware           |  | (Function Calling LLM)   |  |
|  +---------------------+  +----------------------+  +--------------------------+  |
+-----------------------------------------------------------------------------------+
       |                                   |                                  |
       v                                   v                                  v
+-----------------------+       +---------------------+       +---------------------+
| PostgreSQL (Prisma)   |       | Redis (BullMQ Queue)|       | Web Admin Dashboard |
| - Multi-tenant Data   |       | - Locks (Anti-overlap)|     | (React / Tailwind)  |
| - Encrypted PDP       |       | - Rate-Limit / TG   |       | - Clinic Admin      |
+-----------------------+       +---------------------+       +---------------------+
```

---

## 🛡 5 Ta Asosiy Muammoning Texnik Yechimi (Preemptive Engineering)

1. **Race Condition & Double Booking (Slotlar ustma-ust tushishi):**
   - Bemor slot tanlagan ondayoq Redis Distributed Lock (`hold`) ishga tushadi va slot **180 soniyaga** band qilinadi.
   - DB tranzaksiyasi atomik bajariladi. 3 daqiqada tasdiqlanmasa, slot avtomatik bo'shaydi.
2. **AI Gallusinatsiyasi va Tibbiy Xatolar:**
   - LLM ga erkin matnda tashxis qo'yish qat'iyan taqiqlangan (`Strict Function Calling` va Guardrail filtrlari).
   - Bot faqat `get_doctors`, `get_available_slots`, `book_appointment` orqali real ma'lumot beradi.
3. **Telegram Rate Limits (30 msg/sec):**
   - Ommaviy bildirishnomalar va eslatmalar Redis BullMQ navbati orqali sekundiga maksimum 25 tadan taqsimlanadi.
4. **Data Isolation (Ko'p Mijozli Tizim):**
   - Har bir so'rovda va bot webhookida `clinicId` ajratiladi va izolyatsiya qilinadi.
5. **No-Show Rate Kamaytirish (Kelmay qolish):**
   - 24 soat va 2 soat oldin avtomatik tasdiqlash eslatmalari yuboriladi. Bekor qilingan slotlar Waiting List (Kutish ro'yxati) dagi bemorlarga taklif qilinadi.

---

## 📁 Kataloglar Tuzilishi

```
medagent-saas/
├── backend/                # FastAPI markaziy backend API
│   ├── app/
│   │   ├── core/           # Konfiguratsiya, xavfsizlik va JWT
│   │   ├── routes/         # auth, doctors, appointments, telegram_webhook, admin
│   │   ├── schemas/        # Pydantic validatsiya modellari
│   │   └── services/       # AI, Redis, Telegram xizmatlari
│   ├── main.py             # FastAPI ilova nuqtasi
│   ├── schema.prisma       # Prisma ORM ma'lumotlar bazasi sxemasi
│   └── requirements.txt
│
├── mini-app/               # Telegram Mini App (TMA bemorlar ko'rinishi)
│   ├── src/
│   │   ├── components/     # DoctorCard, SlotPicker, HoldTimer, Checkout, MyAppointments
│   │   ├── services/       # Telegram WebApp SDK, HapticFeedback, API
│   │   ├── data/           # Realistik tibbiy ma'lumotlar
│   │   └── App.tsx
│   └── package.json
│
├── frontend-dashboard/     # Web Admin Dashboard (Klinika qabulxonasi va shifokorlar)
│   ├── src/
│   │   ├── components/     # LiveQueueKanban, ScheduleManager, AISettings, ChatTakeover, EmergencyBlock
│   │   └── App.tsx
│   └── package.json
│
├── docker-compose.yml      # PostgreSQL, Redis, Backend, Dashboard, Mini-App
└── package.json            # Monorepo boshqaruv skriptlari
```

---

## 🚀 Ishga Tushirish Qo'llanmasi

### 1. Docker Compose orqali barchasini bir martada ishga tushirish (Tavsiya etiladi):
```bash
docker-compose up --build
```
- **Admin Dashboard:** `http://localhost:3000`
- **Telegram Mini App:** `http://localhost:3001`
- **Backend Swagger API:** `http://localhost:8000/api/docs`

---

### 2. Har bir modulni alohida ishga tushirish:

#### A) Frontend Dashboard (Admin Panel)
```bash
cd frontend-dashboard
npm install
npm run dev
# Dashboard http://localhost:3000 da ishga tushadi
```

#### B) Telegram Mini App (Bemorlar ko'rinishi)
```bash
cd mini-app
npm install
npm run dev
# Mini App http://localhost:3001 da ishga tushadi
```

#### C) Backend (FastAPI API)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 📱 Modullar Imkoniyatlari

### 1. Telegram Mini App (Bemorlar uchun):
- **Shifokorlar ro'yxati:** Qidiruv, mutaxassislik filtri (Kardiolog, Pediatr, Nevropatolog...), tajriba va narxlar.
- **Interaktiv Kalendar & Slot Tanlash:** 
  - 🟢 **Yashil:** Bo'sh vaqt (tanlansa 180 soniyali Redis hold boshlanadi).
  - ⚪ **Kulrang:** Band vaqt.
  - 🟡 **Sariq:** Kutish ro'yxati ("Bo'shasa xabar ber" bildirishnomasi).
- **Checkout & Tasdiqlash:** Telegram kontakt orqali 1-klikda avto-to'ldirish, qabul QR-kodi va klinika geolokatsiyasi.
- **Mening Navbatlarim:** Faol navbatlarni ko'rish va bekor qilish.
- **Tezkor Yordam:** Klinika call-markazi va reanimatsiyasiga zudlik bilan qo'ng'iroq qilish tugmasi.

### 2. Web Admin Dashboard:
- **Live Queue Kanban Doskasi:** 4 ta real-vaqt ustuni: *Kutilmoqda*, *Shifokor Qabulida*, *Bajarildi*, *Kelmadi (No-Show)*.
- **Tugmalar:**
  - `[Qabulni Boshlash]`: Statusni `IN_PROGRESS` ga o'zgartiradi va qabulxona monitoriga e'lon chiqaradi.
  - `[Kelmadi (No-Show)]`: Avtomatik ravishda bemorga AI orqali sababini so'rab taklif yuboradi.
  - `[Chatni Qo'lga Olish (Takeover Chat)]`: AI agentni to'xtatib, xodimga Telegram orqali bemor bilan to'g'ridan-to'g'ri yozishish oynasini ochadi.
- **Haftalik Shifokorlar Grafigi:** Dushanba - Yakshanba kunlari ish soatlari va tushlik tanaffusini sozlash.
- **Favqulodda Bloklash (Emergency Block):** Shifokor kasal bo'lganda bir klik bilan barcha navbatlarni bekor qilib, bemorlarga qayta yozilish xabarini tarqatish.
- **AI Sozlamalari & Sandbox Playground:** System prompt, Welcome message, qat'iy tibbiy filtrlar va jonli sinov darchasi.
