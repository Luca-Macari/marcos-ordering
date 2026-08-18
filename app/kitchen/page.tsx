"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  order_type: "pickup" | "delivery";
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string | null;
  notes: string | null;
  estimated_ready_at: string | null;
  accepted_at: string | null;
  created_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  selected_options: string[] | null;
  notes: string | null;
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [minutes, setMinutes] = useState("25");
  const [processing, setProcessing] = useState(false);

  const loadOrders = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["pending", "accepted", "preparing"])
      .order("created_at", { ascending: false });

    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*");

    if (ordersData) setOrders(ordersData);
    if (itemsData) setOrderItems(itemsData);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    // Refresh every 15 seconds
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const getItemsForOrder = (orderId: string) =>
    orderItems.filter((i) => i.order_id === orderId);

  const acceptOrder = async () => {
    if (!selectedOrder || processing) return;
    setProcessing(true);

    const mins = parseInt(minutes) || 25;
    const readyAt = new Date(Date.now() + mins * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("orders")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        estimated_ready_at: readyAt,
      })
      .eq("id", selectedOrder.id);

    if (error) {
      alert("Error accepting order: " + error.message);
    } else {
      setShowTimeInput(false);
      setSelectedOrder(null);
      await loadOrders();
    }
    setProcessing(false);
  };

  const declineOrder = async () => {
    if (!selectedOrder || processing) return;
    if (!confirm("Are you sure you want to decline this order?")) return;

    setProcessing(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "declined" })
      .eq("id", selectedOrder.id);

    if (error) {
      alert("Error declining order: " + error.message);
    } else {
      setSelectedOrder(null);
      await loadOrders();
    }
    setProcessing(false);
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const acceptedOrders = orders.filter((o) => o.status === "accepted" || o.status === "preparing");

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui" }}>
        Loading kitchen orders...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#1e3a8a" }}>Kitchen Orders</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
            {pendingOrders.length} pending • {acceptedOrders.length} in progress
          </p>
        </div>
        <button
          onClick={loadOrders}
          style={{
            background: "#e2e8f0",
            border: "none",
            padding: "8px 14px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </header>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, color: "#dc2626", marginBottom: 10 }}>New Orders – Action Needed</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {pendingOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                style={{
                  textAlign: "left",
                  background: "#fff",
                  border: "2px solid #fca5a5",
                  borderRadius: 12,
                  padding: 16,
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 17 }}>{order.order_number}</span>
                  <span style={{ fontWeight: 700, fontSize: 17 }}>£{Number(order.total).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 14, color: "#334155" }}>
                  {order.customer_name} • {order.order_type === "delivery" ? "Delivery" : "Pickup"}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Accepted / In Progress */}
      {acceptedOrders.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, color: "#16a34a", marginBottom: 10 }}>Accepted / In Progress</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {acceptedOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                style={{
                  textAlign: "left",
                  background: "#fff",
                  border: "1px solid #bbf7d0",
                  borderRadius: 12,
                  padding: 16,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700 }}>{order.order_number}</span>
                  <span style={{ color: "#16a34a", fontWeight: 600, fontSize: 13 }}>Accepted</span>
                </div>
                <div style={{ fontSize: 14 }}>{order.customer_name}</div>
                {order.estimated_ready_at && (
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                    Ready around {new Date(order.estimated_ready_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {orders.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          No active orders at the moment
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && !showTimeInput && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 500, maxHeight: "90vh", borderRadius: "16px 16px 0 0", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedOrder.order_number}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {selectedOrder.order_type === "delivery" ? "DELIVERY" : "PICKUP"} • £{Number(selectedOrder.total).toFixed(2)}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>{selectedOrder.customer_name}</div>
                <div style={{ fontSize: 14, color: "#334155" }}>{selectedOrder.customer_phone}</div>
                {selectedOrder.customer_email && (
                  <div style={{ fontSize: 13, color: "#64748b" }}>{selectedOrder.customer_email}</div>
                )}
              </div>

              {selectedOrder.delivery_address && (
                <div style={{ marginBottom: 16, padding: 12, background: "#f1f5f9", borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Delivery Address</div>
                  <div style={{ fontSize: 14 }}>{selectedOrder.delivery_address}</div>
                </div>
              )}

              {selectedOrder.notes && (
                <div style={{ marginBottom: 16, padding: 12, background: "#fef3c7", borderRadius: 8, color: "#92400e" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Notes</div>
                  <div style={{ fontSize: 14 }}>{selectedOrder.notes}</div>
                </div>
              )}

              <div style={{ marginBottom: 8, fontWeight: 600 }}>Order Items</div>
              {getItemsForOrder(selectedOrder.id).map((item) => (
                <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600 }}>{item.quantity}× {item.item_name}</span>
                    <span>£{Number(item.unit_price).toFixed(2)}</span>
                  </div>
                  {item.selected_options && item.selected_options.length > 0 && (
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                      {item.selected_options.join(" • ")}
                    </div>
                  )}
                </div>
              ))}

              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18 }}>
                <span>Total</span>
                <span>£{Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>

            {selectedOrder.status === "pending" && (
              <div style={{ padding: 16, borderTop: "1px solid #e2e8f0", display: "flex", gap: 12 }}>
                <button
                  onClick={declineOrder}
                  disabled={processing}
                  style={{
                    flex: 1,
                    padding: 16,
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  Decline
                </button>
                <button
                  onClick={() => setShowTimeInput(true)}
                  disabled={processing}
                  style={{
                    flex: 2,
                    padding: 16,
                    background: "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  Accept
                </button>
              </div>
            )}

            {selectedOrder.status !== "pending" && (
              <div style={{ padding: 16, borderTop: "1px solid #e2e8f0" }}>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    width: "100%",
                    padding: 14,
                    background: "#e2e8f0",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Input Modal */}
      {showTimeInput && selectedOrder && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "90%", maxWidth: 360, textAlign: "center" }}>
            <h3 style={{ margin: "0 0 8px" }}>How long will it take?</h3>
            <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14 }}>
              Enter preparation / delivery time in minutes
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
              {["15", "20", "25", "30", "40"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    border: minutes === m ? "2px solid #16a34a" : "1px solid #cbd5e1",
                    background: minutes === m ? "#dcfce7" : "#fff",
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                style={{
                  width: 100,
                  padding: "12px",
                  fontSize: 24,
                  fontWeight: 700,
                  textAlign: "center",
                  border: "2px solid #cbd5e1",
                  borderRadius: 10,
                }}
              />
              <span style={{ marginLeft: 8, fontSize: 18 }}>min</span>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowTimeInput(false)}
                style={{
                  flex: 1,
                  padding: 14,
                  background: "#e2e8f0",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={acceptOrder}
                disabled={processing}
                style={{
                  flex: 2,
                  padding: 14,
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                {processing ? "Saving..." : `Accept (${minutes} min)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}