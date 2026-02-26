const API = "/api"
const statsEl = document.getElementById("stats")
const ordersEl = document.getElementById("orders")

const renderStats = dashboard => {
  statsEl.innerHTML = `
    <article><h3>${dashboard.games}</h3><p>Total Games</p></article>
    <article><h3>${dashboard.totalOrders}</h3><p>Total Orders</p></article>
    <article><h3>${dashboard.pendingOrders}</h3><p>Pending</p></article>
    <article><h3>${dashboard.completedOrders}</h3><p>Completed</p></article>
    <article><h3>${dashboard.revenueLabel}</h3><p>Revenue</p></article>
  `
}

const renderOrders = orders => {
  if (!orders.length) {
    ordersEl.innerHTML = "<p>Belum ada order.</p>"
    return
  }

  ordersEl.innerHTML = orders
    .map(
      order => `
    <div class="order">
      <div>
        <b>${order.id}</b>
        <p>${order.customerName} (${order.email})</p>
        <small>${order.items.map(item => `${item.gameTitle} - ${item.packageName}`).join(", ")}</small>
      </div>
      <div>
        <p><b>${order.totalLabel}</b></p>
        <select onchange="updateStatus('${order.id}', this.value)">
          ${["pending", "waiting_payment", "paid", "processing", "completed", "cancelled"]
            .map(status => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`)
            .join("")}
        </select>
      </div>
    </div>
  `
    )
    .join("")
}

const load = async () => {
  const [dashboardRes, orderRes] = await Promise.all([
    fetch(`${API}/dashboard`),
    fetch(`${API}/orders`)
  ])

  const dashboardData = await dashboardRes.json()
  const ordersData = await orderRes.json()

  renderStats(dashboardData.dashboard)
  renderOrders(ordersData.orders)
}

window.updateStatus = async (id, status) => {
  await fetch(`${API}/orders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  })
  load()
}

const socket = io(window.location.origin)
socket.on("order:new", load)
socket.on("order:updated", load)
socket.on("dashboard:init", load)

load()
