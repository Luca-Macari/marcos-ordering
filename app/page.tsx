"use client";

const ORDERING_ENABLED = false;   // ← set to true when you want to go live

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Category = { id: string; name: string; sort_order: number };
type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
};
type ModifierGroup = {
  id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
};
type Modifier = {
  id: string;
  group_id: string;
  name: string;
  price: number;
};
type Link = { menu_item_id: string; modifier_group_id: string };

type CartItem = {
  id: string;
  name: string;
  details: string[];
  price: number;
  menu_item_id?: string;
};

type CheckoutData = {
  name: string;
  phone: string;
  email: string;
  orderType: "pickup" | "delivery";
  address: string;
  notes: string;
};

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  const [checkout, setCheckout] = useState<CheckoutData>({
    name: "",
    phone: "",
    email: "",
    orderType: "pickup",
    address: "",
    notes: "",
  });

  useEffect(() => {
    async function load() {
      const [catRes, itemRes, groupRes, modRes, linkRes] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("menu_items").select("*").order("sort_order"),
        supabase.from("modifier_groups").select("*"),
        supabase.from("modifiers").select("*").order("sort_order"),
        supabase.from("menu_item_modifier_groups").select("*"),
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (itemRes.data) setMenuItems(itemRes.data);
      if (groupRes.data) setGroups(groupRes.data);
      if (modRes.data) setModifiers(modRes.data);
      if (linkRes.data) setLinks(linkRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const openItem = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedOptions({});
  };

  const closeItem = () => {
    setSelectedItem(null);
    setSelectedOptions({});
  };

  const getGroupsForItem = (itemId: string) => {
    const groupIds = links.filter((l) => l.menu_item_id === itemId).map((l) => l.modifier_group_id);
    return groups.filter((g) => groupIds.includes(g.id));
  };

  const toggleOption = (group: ModifierGroup, optionId: string) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id] || [];
      let next: string[];

      if (group.max_selections === 1) {
        next = current.includes(optionId) ? [] : [optionId];
      } else {
        if (current.includes(optionId)) {
          next = current.filter((id) => id !== optionId);
        } else {
          if (current.length >= group.max_selections) return prev;
          next = [...current, optionId];
        }
      }
      return { ...prev, [group.id]: next };
    });
  };

  const currentTotal = () => {
    if (!selectedItem) return 0;
    let total = Number(selectedItem.base_price);
    const itemGroups = getGroupsForItem(selectedItem.id);

    itemGroups.forEach((group) => {
      const chosen = selectedOptions[group.id] || [];
      chosen.forEach((optId) => {
        const mod = modifiers.find((m) => m.id === optId);
        if (mod) total += Number(mod.price);
      });
    });
    return total;
  };

  const canAdd = () => {
    if (!selectedItem) return false;
    const itemGroups = getGroupsForItem(selectedItem.id);
    for (const group of itemGroups) {
      if (group.is_required) {
        const count = (selectedOptions[group.id] || []).length;
        if (count < group.min_selections) return false;
      }
    }
    return true;
  };

  const addToCart = () => {
    if (!selectedItem || !canAdd()) return;

    const details: string[] = [];
    const itemGroups = getGroupsForItem(selectedItem.id);

    itemGroups.forEach((group) => {
      (selectedOptions[group.id] || []).forEach((optId) => {
        const mod = modifiers.find((m) => m.id === optId);
        if (mod) {
          details.push(mod.name + (mod.price > 0 ? ` (+£${Number(mod.price).toFixed(2)})` : ""));
        }
      });
    });

    setCart((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: selectedItem.name,
        details,
        price: currentTotal(),
        menu_item_id: selectedItem.id,
      },
    ]);
    closeItem();
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price, 0);

  const canPlaceOrder = () => {
    if (!checkout.name.trim() || !checkout.phone.trim()) return false;
    if (checkout.orderType === "delivery" && !checkout.address.trim()) return false;
    return cart.length > 0;
  };

  const placeOrder = async () => {
    if (!canPlaceOrder() || placingOrder) return;
    setPlacingOrder(true);

    try {
      // Generate a simple order number
      const orderNum = "M" + Date.now().toString().slice(-6);
      setOrderNumber(orderNum);

      // Insert the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNum,
          customer_name: checkout.name.trim(),
          customer_phone: checkout.phone.trim(),
          customer_email: checkout.email.trim() || null,
          order_type: checkout.orderType,
          status: "pending",
          subtotal: cartTotal,
          delivery_fee: 0,
          total: cartTotal,
          delivery_address: checkout.orderType === "delivery" ? checkout.address.trim() : null,
          notes: checkout.notes.trim() || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id || null,
        item_name: item.name,
        quantity: 1,
        unit_price: item.price,
        selected_options: item.details,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Success
      setCart([]);
      setIsCheckoutOpen(false);
      setIsConfirmationOpen(true);
    } catch (err: any) {
      alert("Sorry, there was a problem placing your order. Please try again.\n\n" + (err.message || ""));
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui" }}>
        Loading menu...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 100px", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ color: "#1e3a8a", margin: 0, fontSize: 24 }}>Marco&apos;s On The Shore</h1>
          <p style={{ color: "#6b7280", margin: "2px 0 0", fontSize: 13 }}>
            Family run fish &amp; chip shop • Est. 1997
          </p>
        </div>
        <button
          onClick={() => setIsCartOpen(true)}
          style={{
            background: "#1e3a8a",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cart {cart.length > 0 && `(${cart.length})`}
        </button>
      </header>

	{!ORDERING_ENABLED && (
  <div style={{
    background: "#fef3c7",
    color: "#92400e",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: 600,
  }}>
    Online ordering is temporarily unavailable. Please call the shop to place an order.
  </div>
)}

      {/* Menu */}
      {categories.map((cat) => (
        <section key={cat.id} style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, margin: "0 0 6px" }}>{cat.name}</h2>
          <div style={{ height: 3, width: 48, background: "#f97316", borderRadius: 2, marginBottom: 14 }} />

          <div style={{ display: "grid", gap: 10 }}>
            {menuItems
              .filter((item) => item.category_id === cat.id)
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => openItem(item)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {item.description && (
                      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{item.description}</div>
                    )}
                  </div>
                  <div style={{ fontWeight: 600 }}>£{Number(item.base_price).toFixed(2)}</div>
                </button>
              ))}
          </div>
        </section>
      ))}

      {/* Options Panel */}
      {selectedItem && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={closeItem} />
          <div style={{ position: "relative", width: "100%", maxWidth: 420, background: "#fff", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>{selectedItem.name}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b7280" }}>
                  Base £{Number(selectedItem.base_price).toFixed(2)}
                </p>
              </div>
              <button onClick={closeItem} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#9ca3af" }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {getGroupsForItem(selectedItem.id).map((group) => (
                <div key={group.id} style={{ marginBottom: 24 }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 15 }}>
                    {group.name}{" "}
                    {group.is_required && (
                      <span style={{ color: "#ef4444", fontSize: 13 }}>
                        (Required – choose {group.min_selections}
                        {group.max_selections > group.min_selections ? ` to ${group.max_selections}` : ""})
                      </span>
                    )}
                  </h4>
                  <div style={{ display: "grid", gap: 8 }}>
                    {modifiers
                      .filter((m) => m.group_id === group.id)
                      .map((opt) => {
                        const isSelected = (selectedOptions[group.id] || []).includes(opt.id);
                        return (
                          <label
                            key={opt.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "12px 14px",
                              border: isSelected ? "2px solid #f97316" : "1px solid #e5e7eb",
                              borderRadius: 8,
                              background: isSelected ? "#fff7ed" : "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <input
                                type={group.max_selections === 1 ? "radio" : "checkbox"}
                                checked={isSelected}
                                onChange={() => toggleOption(group, opt.id)}
                              />
                              <span>{opt.name}</span>
                            </div>
                            {opt.price > 0 && <span style={{ fontSize: 14, color: "#6b7280" }}>+£{Number(opt.price).toFixed(2)}</span>}
                          </label>
                        );
                      })}
                  </div>
                </div>
              ))}
              {getGroupsForItem(selectedItem.id).length === 0 && (
                <p style={{ color: "#6b7280", fontSize: 14 }}>No additional options for this item.</p>
              )}
            </div>

            <div style={{ padding: "16px 20px", borderTop: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ color: "#6b7280" }}>Item total</span>
                <span style={{ fontSize: 20, fontWeight: 700 }}>£{currentTotal().toFixed(2)}</span>
              </div>
              <button
  		onClick={addToCart}
  		disabled={!canAdd() || !ORDERING_ENABLED}
  		style={{
   		 width: "100%",
   		 padding: "14px",
   		 background: canAdd() && ORDERING_ENABLED ? "#f97316" : "#d1d5db",
    		 color: "white",
    		 border: "none",
    		 borderRadius: 10,
   		 fontWeight: 600,
  		 fontSize: 16,
    		 cursor: canAdd() && ORDERING_ENABLED ? "pointer" : "not-allowed",
   		}}
	       >
  		{!ORDERING_ENABLED
   		 ? "Ordering temporarily unavailable"
    		 : canAdd()
   		 ? "Add to cart"
    		 : "Please select required options"}
		</button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setIsCartOpen(false)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 400, background: "#fff", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>Your Cart</h3>
              <button onClick={() => setIsCartOpen(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {cart.length === 0 ? (
                <p style={{ color: "#6b7280", textAlign: "center", marginTop: 40 }}>Your cart is empty</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {item.details.map((d, i) => (
                      <div key={i} style={{ fontSize: 13, color: "#6b7280" }}>{d}</div>
                    ))}
                    <div style={{ fontWeight: 600, marginTop: 4 }}>£{item.price.toFixed(2)}</div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: 20, borderTop: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
                  <span>Total</span>
                  <span>£{cartTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  style={{ width: "100%", padding: 14, background: "#1e3a8a", color: "white", border: "none", borderRadius: 10, fontWeight: 600 }}
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Panel */}
      {isCheckoutOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setIsCheckoutOpen(false)} />
          <div style={{ position: "relative", width: "100%", maxWidth: 440, background: "#fff", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>Checkout</h3>
              <button onClick={() => setIsCheckoutOpen(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Full Name *</label>
                <input
                  type="text"
                  value={checkout.name}
                  onChange={(e) => setCheckout({ ...checkout, name: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15 }}
                  placeholder="Your name"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Phone Number *</label>
                <input
                  type="tel"
                  value={checkout.phone}
                  onChange={(e) => setCheckout({ ...checkout, phone: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15 }}
                  placeholder="07xxx xxxxxx"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Email (optional)</label>
                <input
                  type="email"
                  value={checkout.email}
                  onChange={(e) => setCheckout({ ...checkout, email: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15 }}
                  placeholder="you@example.com"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Order Type *</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setCheckout({ ...checkout, orderType: "pickup" })}
                    style={{
                      flex: 1,
                      padding: "12px",
                      border: checkout.orderType === "pickup" ? "2px solid #f97316" : "1px solid #d1d5db",
                      borderRadius: 8,
                      background: checkout.orderType === "pickup" ? "#fff7ed" : "#fff",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Pickup
                  </button>
                  <button
                    onClick={() => setCheckout({ ...checkout, orderType: "delivery" })}
                    style={{
                      flex: 1,
                      padding: "12px",
                      border: checkout.orderType === "delivery" ? "2px solid #f97316" : "1px solid #d1d5db",
                      borderRadius: 8,
                      background: checkout.orderType === "delivery" ? "#fff7ed" : "#fff",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Delivery
                  </button>
                </div>
              </div>

              {checkout.orderType === "delivery" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Delivery Address *</label>
                  <textarea
                    value={checkout.address}
                    onChange={(e) => setCheckout({ ...checkout, address: e.target.value })}
                    rows={3}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, resize: "vertical" }}
                    placeholder="Full delivery address"
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Notes / Special requests</label>
                <textarea
                  value={checkout.notes}
                  onChange={(e) => setCheckout({ ...checkout, notes: e.target.value })}
                  rows={2}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, resize: "vertical" }}
                  placeholder="Any special instructions..."
                />
              </div>

              <div style={{ background: "#f9fafb", borderRadius: 8, padding: 14, marginTop: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Order Summary</div>
                {cart.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                    <span>{item.name}</span>
                    <span>£{item.price.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span>Total</span>
                  <span>£{cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: 20, borderTop: "1px solid #e5e7eb" }}>
              <button
                onClick={placeOrder}
                disabled={!canPlaceOrder() || placingOrder}
                style={{
                  width: "100%",
                  padding: 14,
                  background: canPlaceOrder() && !placingOrder ? "#f97316" : "#d1d5db",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: canPlaceOrder() && !placingOrder ? "pointer" : "not-allowed",
                }}
              >
                {placingOrder ? "Placing order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation */}
      {isConfirmationOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 400, width: "90%", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <h2 style={{ margin: "0 0 8px", color: "#1e3a8a" }}>Thank you!</h2>
            <p style={{ color: "#6b7280", marginBottom: 16 }}>
              Your order has been received.
            </p>
            <p style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
              Order number: {orderNumber}
            </p>
            <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
              We will confirm your order shortly.
            </p>
            <button
              onClick={() => {
                setIsConfirmationOpen(false);
                setCheckout({
                  name: "",
                  phone: "",
                  email: "",
                  orderType: "pickup",
                  address: "",
                  notes: "",
                });
              }}
              style={{
                background: "#1e3a8a",
                color: "white",
                border: "none",
                padding: "12px 28px",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}