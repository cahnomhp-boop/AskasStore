# AskasStore

Web store top up game dengan tampilan modern (mirip referensi), lengkap dengan:

- Landing page store + katalog game + promo.
- Detail game dan paket top up.
- Shopping cart + ubah qty + hapus item + kode promo + checkout.
- Riwayat pesanan real-time (Socket.IO).
- Admin dashboard untuk memantau statistik dan update status order.

## Menjalankan Project (Local)

## Quick Start (Sekali Jalan)

Dari root project, jalankan:

```bash
./run.sh
```

Script ini akan:

- cek Node.js dan npm
- install dependency backend jika belum ada
- menjalankan server di `http://localhost:3000`

```bash
cd backend
npm install
npm start
```

Setelah server hidup:

- Store: `http://localhost:3000/store`
- Admin: `http://localhost:3000/admin`

## Menjalankan dengan Docker Compose

```bash
docker compose up --build
```

## API Endpoint Utama

- `GET /api/health`
- `GET /api/games`
- `GET /api/games/:slug`
- `GET /api/orders`
- `GET /api/dashboard`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`
