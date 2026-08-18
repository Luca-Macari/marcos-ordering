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

type Tab = "pending" | "inprogress" | "ready";

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [minutes, setMinutes] = useState("25");
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  const loadOrders = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["pending", "accepted", "preparing", "ready"])
      .order("created_at", { ascending: false });

    const { data: itemsData } = await supabase.from("order_items").select("*");

    if (ordersData) setOrders(ordersData);
    if (itemsData) setOrderItems(itemsData);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000); // every 10 seconds
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
      setActiveTab("inprogress");
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

  const markReady = async (orderId: string) => {
    setProcessing(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "ready" })
      .eq("id", orderId);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setSelectedOrder(null);
      setActiveTab("ready");
      await loadOrders();
    }
    setProcessing(false);
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const inProgressOrders = orders.filter((o) => o.status === "accepted" || o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  const displayedOrders =
    activeTab === "pending"
      ? pendingOrders
      : activeTab === "inprogress"
      ? inProgressOrders
      : readyOrders;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui" }}>
        Loading kitchen orders...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#1e3a8a" }}>Kitchen Orders</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
            {pendingOrders.length} pending • {inProgressOrders.length} in progress • {readyOrders.length} ready
          </p>
        </div>
        <button
          onClick={loadOrders}
          style={{ background: "#e2e8f0", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
        >
          Refresh
        </button>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#e2e8f0", borderRadius: 10, padding: 4 }}>
        {[
          { key: "pending", label: `Pending (${pendingOrders.length})`, color: "#dc2626" },
          { key: "inprogress", label: `In Progress (${inProgressOrders.length})`, color: "#16a34a" },
          { key: "ready", label: `Ready (${readyOrders.length})`, color: "#2563eb" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as Tab)}
            style={{
              flex: 1,
              padding: "10px 8px",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              background: activeTab === tab.key ? "#fff" : "transparent",
              color: activeTab === tab.key ? tab.color : "#64748b",
              boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order List */}
      {displayedOrders.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          No orders in this section
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {displayedOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              style={{
                textAlign: "left",
                background: "#fff",
                border:
                  order.status === "pending"
                    ? "2px solid #fca5a5"
                    : order.status === "ready"
                    ? "2px solid #93c5fd"
                    : "1px solid #bbf7d0",
                borderRadius: 12,
                padding: 16,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
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
                {order.estimated_ready_at && order.status !== "pending" && (
                  <> • Ready ~ {new Date(order.estimated_ready_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                )}
              </div>
              {order.status === "pending" && (
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "#dc2626" }}>
                  Action needed
                </div>
              )}
            </button>
          ))}
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

            {/* Action buttons */}
            <div style={{ padding: 16, borderTop: "1px solid #e2e8f0", display: "flex", gap: 12 }}>
              {selectedOrder.status === "pending" && (
                <>
                  <button
                    onClick={declineOrder}
                    disabled={processing}
                    style={{ flex: 1, padding: 16, background: "#ef4444", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: "pointer" }}
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => setShowTimeInput(true)}
                    disabled={processing}
                    style={{ flex: 2, padding: 16, background: "#16a34a", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: "pointer" }}
                  >
                    Accept
                  </button>
                </>
              )}

              {(selectedOrder.status === "accepted" || selectedOrder.status === "preparing") && (
                <button
                  onClick={() => markReady(selectedOrder.id)}
                  disabled={processing}
                  style={{ flex: 1, padding: 16, background: "#2563eb", color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 16, cursor: "pointer" }}
                >
                  Mark as Ready
                </button>
              )}

              {selectedOrder.status === "ready" && (
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ flex: 1, padding: 14, background: "#e2e8f0", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}
                >
                  Close
                </button>
              )}
            </div>
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
              {["10", "15", "20", "45", "60"].map((m) => (
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
                style={{ flex: 1, padding: 14, background: "#e2e8f0", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" }}
              >
                Back
              </button>
              <button
                onClick={acceptOrder}
                disabled={processing}
                style={{ flex: 2, padding: 14, background: "#16a34a", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: "pointer" }}
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