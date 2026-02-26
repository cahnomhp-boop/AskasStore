const API = "http://localhost:3000/api"
const state = {
  games: [],
  promos: [],
  cart: [],
  orders: [],
  activePromo: null
}

const idr = amount =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)

const gameCount = document.getElementById("game-count")
const gamesGrid = document.getElementById("games-grid")
const promoList = document.getElementById("promo-list")
const cartItems = document.getElementById("cart-items")
const subtotalEl = document.getElementById("subtotal")
const discountEl = document.getElementById("discount")
const totalEl = document.getElementById("total")
const orderList = document.getElementById("order-list")
const checkoutMsg = document.getElementById("checkout-msg")

const loadData = async () => {
  const res = await fetch(`${API}/games`)
  const data = await res.json()
  state.games = data.games
  state.promos = data.promos
  renderGames()
  renderPromos()
  renderCart()
  await loadOrders()
}

const renderGames = () => {
  gameCount.textContent = `${state.games.length} games`
  gamesGrid.innerHTML = state.games
    .map(
      game => `
      <article class="card">
        <img src="${game.image}" alt="${game.title}" />
        <div class="card-body">
          <h4>${game.title}</h4>
          <p>${game.genre} • ⭐ ${game.rating}</p>
          <p>Mulai ${idr(game.priceFrom)}</p>
          <div class="actions">
            <button onclick="showDetail('${game.slug}')">Detail</button>
            <button onclick="quickAdd('${game.id}')">Top Up</button>
          </div>
        </div>
      </article>
    `
    )
    .join("")
}

const renderPromos = () => {
  promoList.innerHTML = state.promos
    .map(promo => `<div class="promo"> <b>${promo.code}</b><span>${promo.label}</span></div>`)
    .join("")
}

const calculateSummary = () => {
  const subtotal = state.cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const discount = state.activePromo ? Math.round((subtotal * state.activePromo.percentage) / 100) : 0
  return { subtotal, discount, total: subtotal - discount }
}

const renderCart = () => {
  if (!state.cart.length) {
    cartItems.innerHTML = '<p class="muted">Belum ada item di keranjang.</p>'
  } else {
    cartItems.innerHTML = state.cart
      .map(
        item => `
      <div class="cart-item">
        <div>
          <strong>${item.gameTitle}</strong>
          <p>${item.packageName}</p>
        </div>
        <div>
          <p>${item.quantity}x</p>
          <b>${idr(item.price * item.quantity)}</b>
        </div>
      </div>
      `
      )
      .join("")
  }

  const summary = calculateSummary()
  subtotalEl.textContent = idr(summary.subtotal)
  discountEl.textContent = `- ${idr(summary.discount)}`
  totalEl.textContent = idr(summary.total)
}

const renderOrders = () => {
  if (!state.orders.length) {
    orderList.innerHTML = '<p class="muted">Belum ada order.</p>'
    return
  }

  orderList.innerHTML = state.orders
    .map(
      order => `
      <div class="order-item">
        <div>
          <b>${order.id}</b>
          <p>${new Date(order.createdAt).toLocaleString("id-ID")}</p>
        </div>
        <div>
          <span class="status ${order.status}">${order.status}</span>
          <b>${order.totalLabel}</b>
        </div>
      </div>
    `
    )
    .join("")
}

const loadOrders = async () => {
  const res = await fetch(`${API}/orders`)
  const data = await res.json()
  state.orders = data.orders
  renderOrders()
}

window.quickAdd = gameId => {
  const game = state.games.find(item => item.id === gameId)
  const pkg = game.packages[0]

  state.cart.push({
    gameId: game.id,
    gameTitle: game.title,
    packageId: pkg.id,
    packageName: pkg.name,
    price: pkg.price,
    quantity: 1
  })
  renderCart()
}

window.showDetail = slug => {
  const game = state.games.find(item => item.slug === slug)
  const dialog = document.getElementById("detail-dialog")
  const content = document.getElementById("detail-content")

  content.innerHTML = `
    <img src="${game.image}" alt="${game.title}" />
    <h3>${game.title}</h3>
    <p>${game.description}</p>
    <div class="detail-packages">
      ${game.packages
        .map(
          pkg =>
            `<button onclick="addPackage('${game.id}','${pkg.id}')">${pkg.name} • ${idr(pkg.price)}</button>`
        )
        .join("")}
    </div>
  `
  dialog.showModal()
}

window.addPackage = (gameId, packageId) => {
  const game = state.games.find(item => item.id === gameId)
  const pkg = game.packages.find(item => item.id === packageId)
  state.cart.push({
    gameId,
    gameTitle: game.title,
    packageId,
    packageName: pkg.name,
    price: pkg.price,
    quantity: 1
  })
  renderCart()
  document.getElementById("detail-dialog").close()
}

document.getElementById("close-detail").addEventListener("click", () => {
  document.getElementById("detail-dialog").close()
})

document.getElementById("apply-promo").addEventListener("click", () => {
  const code = document.getElementById("promo-code").value.trim().toUpperCase()
  state.activePromo = state.promos.find(item => item.code === code) || null
  renderCart()
})

document.getElementById("checkout-form").addEventListener("submit", async event => {
  event.preventDefault()
  if (!state.cart.length) {
    checkoutMsg.textContent = "Keranjang masih kosong"
    return
  }

  const payload = {
    customerName: document.getElementById("customer-name").value,
    email: document.getElementById("customer-email").value,
    paymentMethod: document.getElementById("payment-method").value,
    promoCode: state.activePromo?.code,
    items: state.cart
  }

  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })

  const data = await res.json()
  checkoutMsg.textContent = data.message

  if (res.ok) {
    state.cart = []
    state.activePromo = null
    document.getElementById("promo-code").value = ""
    event.target.reset()
    renderCart()
    await loadOrders()
  }
})

document.getElementById("scroll-games").addEventListener("click", () => {
  document.getElementById("games").scrollIntoView({ behavior: "smooth" })
})

const socket = io("http://localhost:3000")
socket.on("order:new", loadOrders)
socket.on("order:updated", loadOrders)

loadData()
