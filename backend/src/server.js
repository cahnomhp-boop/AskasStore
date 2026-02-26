require("dotenv").config()
const express = require("express")
const http = require("http")
const path = require("path")
const fs = require("fs")
const crypto = require("crypto")
const cors = require("cors")
const helmet = require("helmet")
const morgan = require("morgan")
const rateLimit = require("express-rate-limit")
const midtransClient = require("midtrans-client")
const { Server } = require("socket.io")

const app = express()
app.use(helmet())
app.use(cors())
app.use(morgan("dev"))
app.use(express.json({ limit: "1mb" }))
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
)

const PORT = Number(process.env.PORT || 3000)
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`
const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || ""
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || ""
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true"

const dataDir = path.join(__dirname, "../data")
const ordersFile = path.join(dataDir, "orders.json")
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(ordersFile)) fs.writeFileSync(ordersFile, "[]")

const readOrders = () => {
  try {
    return JSON.parse(fs.readFileSync(ordersFile, "utf8"))
  } catch {
    return []
  }
}

const writeOrders = orders => {
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2))
}

const catalog = [
  {
    id: "valo",
    slug: "valorant",
    title: "Valorant",
    genre: "Tactical Shooter",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    priceFrom: 15000,
    discount: 20,
    rating: 4.8,
    sold: 3450,
    description:
      "Top up VP instan untuk skin bundle, battle pass, dan event terbatas Valorant.",
    packages: [
      { id: "vp-300", name: "300 VP", price: 45000 },
      { id: "vp-625", name: "625 VP", price: 90000 },
      { id: "vp-1650", name: "1.650 VP", price: 225000 }
    ]
  },
  {
    id: "pubgm",
    slug: "pubg-mobile",
    title: "PUBG Mobile",
    genre: "Battle Royale",
    image:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    priceFrom: 12000,
    discount: 15,
    rating: 4.9,
    sold: 5220,
    description:
      "UC PUBG Mobile murah, proses otomatis dan cocok untuk top up cepat.",
    packages: [
      { id: "uc-60", name: "60 UC", price: 14000 },
      { id: "uc-325", name: "325 UC", price: 71000 },
      { id: "uc-660", name: "660 UC", price: 141000 }
    ]
  },
  {
    id: "mlbb",
    slug: "mobile-legends",
    title: "Mobile Legends",
    genre: "MOBA",
    image:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    priceFrom: 8000,
    discount: 30,
    rating: 4.7,
    sold: 10440,
    description:
      "Diamond MLBB resmi, cocok buat draw skin, starlight, dan event mingguan.",
    packages: [
      { id: "dm-86", name: "86 Diamond", price: 18000 },
      { id: "dm-172", name: "172 Diamond", price: 36000 },
      { id: "dm-706", name: "706 Diamond", price: 145000 }
    ]
  },
  {
    id: "ff",
    slug: "free-fire",
    title: "Free Fire",
    genre: "Battle Royale",
    image:
      "https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=1200&q=80",
    priceFrom: 5000,
    discount: 10,
    rating: 4.6,
    sold: 7830,
    description:
      "Diamond Free Fire instant dengan banyak pilihan nominal favorit.",
    packages: [
      { id: "ff-70", name: "70 Diamond", price: 9500 },
      { id: "ff-355", name: "355 Diamond", price: 45000 },
      { id: "ff-720", name: "720 Diamond", price: 90000 }
    ]
  }
]

const promos = [
  { code: "WELCOME10", label: "Diskon 10% pembelian pertama", percentage: 10 },
  { code: "GAMENIGHT15", label: "Diskon 15% jam 20:00-23:00", percentage: 15 }
]

const toCurrency = amount =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount)

const computeDashboard = () => {
  const orders = readOrders()
  const revenue = orders
    .filter(order => ["paid", "processing", "completed"].includes(order.status))
    .reduce((total, order) => total + order.total, 0)

  return {
    games: catalog.length,
    totalOrders: orders.length,
    pendingOrders: orders.filter(order => ["pending", "waiting_payment"].includes(order.status)).length,
    completedOrders: orders.filter(order => order.status === "completed").length,
    revenue,
    revenueLabel: toCurrency(revenue)
  }
}

const mapMidtransToStatus = txStatus => {
  if (["settlement", "capture"].includes(txStatus)) return "paid"
  if (["pending"].includes(txStatus)) return "waiting_payment"
  if (["expire", "cancel", "deny"].includes(txStatus)) return "cancelled"
  return "pending"
}

const createMidtransTransaction = async order => {
  if (!MIDTRANS_SERVER_KEY) return null

  const snap = new midtransClient.Snap({
    isProduction: MIDTRANS_IS_PRODUCTION,
    serverKey: MIDTRANS_SERVER_KEY,
    clientKey: MIDTRANS_CLIENT_KEY
  })

  const parameter = {
    transaction_details: {
      order_id: order.id,
      gross_amount: order.total
    },
    customer_details: {
      first_name: order.customerName,
      email: order.email
    },
    callbacks: {
      finish: `${BASE_URL}/store`
    }
  }

  return snap.createTransaction(parameter)
}

app.use("/store", express.static(path.join(__dirname, "../../frontend")))
app.use("/admin", express.static(path.join(__dirname, "../../admin")))
app.get("/", (_, res) => res.redirect("/store"))

app.get("/api/health", (_, res) => {
  res.json({
    status: "OK",
    service: "AskasStore API",
    paymentGateway: MIDTRANS_SERVER_KEY ? "midtrans-configured" : "manual-mode"
  })
})

app.get("/api/games", (_, res) => res.json({ games: catalog, promos }))
app.get("/api/games/:slug", (req, res) => {
  const game = catalog.find(item => item.slug === req.params.slug)
  if (!game) return res.status(404).json({ message: "Game tidak ditemukan" })
  return res.json({ game })
})

app.get("/api/orders", (_, res) => {
  res.json({ orders: [...readOrders()].reverse() })
})

app.get("/api/dashboard", (_, res) => {
  res.json({ dashboard: computeDashboard() })
})

app.post("/api/orders", async (req, res) => {
  const { customerName, email, paymentMethod, items, promoCode } = req.body
  if (!customerName || !email || !paymentMethod || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: "Data pesanan belum lengkap" })
  }

  const normalizedItems = items
    .map(item => {
      const game = catalog.find(entry => entry.id === item.gameId)
      if (!game) return null
      const pkg = game.packages.find(entry => entry.id === item.packageId)
      if (!pkg) return null
      const quantity = Math.max(1, Number(item.quantity) || 1)
      return {
        gameId: game.id,
        gameTitle: game.title,
        packageId: pkg.id,
        packageName: pkg.name,
        price: pkg.price,
        quantity,
        subtotal: pkg.price * quantity
      }
    })
    .filter(Boolean)

  if (!normalizedItems.length) return res.status(400).json({ message: "Item pesanan tidak valid" })

  const subtotal = normalizedItems.reduce((total, item) => total + item.subtotal, 0)
  const promo = promos.find(item => item.code === promoCode)
  const discount = promo ? Math.round((subtotal * promo.percentage) / 100) : 0

  const order = {
    id: `ORD-${Date.now()}`,
    customerName,
    email,
    paymentMethod,
    promoCode: promo?.code || null,
    discount,
    subtotal,
    total: subtotal - discount,
    totalLabel: toCurrency(subtotal - discount),
    items: normalizedItems,
    status: paymentMethod === "Midtrans Snap" ? "waiting_payment" : "pending",
    payment: null,
    createdAt: new Date().toISOString()
  }

  if (paymentMethod === "Midtrans Snap") {
    if (!MIDTRANS_SERVER_KEY) {
      return res.status(400).json({ message: "Payment Midtrans belum dikonfigurasi di server" })
    }

    try {
      const transaction = await createMidtransTransaction(order)
      order.payment = {
        gateway: "midtrans",
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
        transactionStatus: "pending"
      }
    } catch (error) {
      return res.status(502).json({ message: `Gagal membuat transaksi payment gateway: ${error.message}` })
    }
  }

  const orders = readOrders()
  orders.push(order)
  writeOrders(orders)
  io.emit("order:new", order)

  return res.status(201).json({
    message: "Pesanan berhasil dibuat",
    order,
    paymentUrl: order.payment?.redirectUrl || null
  })
})

app.patch("/api/orders/:id/status", (req, res) => {
  const { status } = req.body
  const allowed = ["pending", "waiting_payment", "paid", "processing", "completed", "cancelled"]
  if (!allowed.includes(status)) return res.status(400).json({ message: "Status tidak valid" })

  const orders = readOrders()
  const order = orders.find(entry => entry.id === req.params.id)
  if (!order) return res.status(404).json({ message: "Order tidak ditemukan" })

  order.status = status
  writeOrders(orders)
  io.emit("order:updated", order)
  return res.json({ message: "Status order diperbarui", order })
})

app.post("/api/payments/midtrans/notification", (req, res) => {
  const payload = req.body
  const signatureKey = payload.signature_key
  const expected = crypto
    .createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${MIDTRANS_SERVER_KEY}`)
    .digest("hex")

  if (!signatureKey || signatureKey !== expected) {
    return res.status(401).json({ message: "Signature tidak valid" })
  }

  const orders = readOrders()
  const order = orders.find(entry => entry.id === payload.order_id)
  if (!order) return res.status(404).json({ message: "Order tidak ditemukan" })

  order.status = mapMidtransToStatus(payload.transaction_status)
  order.payment = {
    ...(order.payment || {}),
    gateway: "midtrans",
    transactionStatus: payload.transaction_status,
    fraudStatus: payload.fraud_status || null,
    paidAt: ["settlement", "capture"].includes(payload.transaction_status) ? new Date().toISOString() : null
  }

  writeOrders(orders)
  io.emit("order:updated", order)
  return res.json({ received: true })
})

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: "*" } })
io.on("connection", socket => socket.emit("dashboard:init", computeDashboard()))

server.listen(PORT, () => {
  console.log(`API running on ${PORT}`)
})
