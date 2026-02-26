# AskasStore (Production Ready Starter)

Web store top up game dengan fitur production baseline:

- Storefront + admin dashboard real-time (Socket.IO).
- Checkout dengan opsi payment manual atau **Midtrans Snap**.
- Persistensi order ke file JSON (`backend/data/orders.json`) jadi data tidak hilang saat restart aplikasi.
- API hardening dasar: `helmet`, `morgan`, dan rate limit.
- Siap dijalankan lokal, Docker Compose, atau dipublish ke VPS.

## 🔥 Langsung Pakai (1 command)

Dari root project:

```bash
./langsung-pakai.sh local
```

Atau langsung via Docker:

```bash
./langsung-pakai.sh docker
```

Optional (tanpa auto buka browser):

```bash
OPEN_BROWSER=false ./langsung-pakai.sh local
```

Script ini akan menunggu service siap, menampilkan URL Store/Admin dengan jelas, dan mencoba membuka browser otomatis.

Jika kamu hanya lihat tulisan di terminal, itu normal. Tinggal klik/copy URL yang muncul.

## 1) Jalankan Local

```bash
./run.sh
```

Atau manual:

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Buka:

- Store: `http://localhost:3000/store`
- Admin: `http://localhost:3000/admin`

## 2) Konfigurasi Payment Midtrans

Isi `.env` di folder `backend/`:

```env
PORT=3000
BASE_URL=http://localhost:3000
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
MIDTRANS_IS_PRODUCTION=false
```

Jika `MIDTRANS_SERVER_KEY` kosong, sistem tetap jalan di mode manual (tanpa redirect payment gateway).

Webhook Midtrans diarahkan ke:

- `POST /api/payments/midtrans/notification`

## 3) Jalankan dengan Docker Compose

```bash
docker compose up --build
```

## 4) Publish ke Public (VPS)

Ringkas langkah production:

1. Deploy aplikasi ke VPS.
2. Jalankan lewat Docker Compose atau PM2.
3. Pasang Nginx reverse proxy ke `localhost:3000`.
4. Pasang SSL (Let's Encrypt).
5. Set `BASE_URL=https://domainkamu.com` agar callback payment valid.
6. Atur URL webhook Midtrans ke `https://domainkamu.com/api/payments/midtrans/notification`.

## API Endpoint

- `GET /api/health`
- `GET /api/games`
- `GET /api/games/:slug`
- `GET /api/orders`
- `GET /api/dashboard`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`
- `POST /api/payments/midtrans/notification`
