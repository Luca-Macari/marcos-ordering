"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Category = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
  is_available: boolean;
  sort_order: number;
};

type ModifierGroup = {
  id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
};

type Link = {
  menu_item_id: string;
  modifier_group_id: string;
};

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [catRes, itemRes, groupRes, linkRes] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").order("sort_order"),
      supabase.from("modifier_groups").select("*"),
      supabase.from("menu_item_modifier_groups").select("*"),
    ]);

    if (catRes.data) setCategories(catRes.data);
    if (itemRes.data) setMenuItems(itemRes.data);
    if (groupRes.data) setGroups(groupRes.data);
    if (linkRes.data) setLinks(linkRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getGroupsForItem = (itemId: string) => {
    const groupIds = links.filter((l) => l.menu_item_id === itemId).map((l) => l.modifier_group_id);
    return groups.filter((g) => groupIds.includes(g.id));
  };

  const saveItem = async () => {
    if (!editingItem) return;
    setSaving(true);

    const { error } = await supabase
      .from("menu_items")
      .update({
        name: editingItem.name,
        description: editingItem.description,
        base_price: editingItem.base_price,
        is_available: editingItem.is_available,
      })
      .eq("id", editingItem.id);

    if (error) {
      alert("Error saving: " + error.message);
    } else {
      setEditingItem(null);
      await load();
    }
    setSaving(false);
  };

  const toggleAvailability = async (item: MenuItem) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      await load();
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui" }}>
        Loading admin...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#1e3a8a" }}>Admin – Menu Manager</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
            Edit items, prices and availability
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="/kitchen"
            style={{ padding: "8px 14px", background: "#e2e8f0", borderRadius: 8, textDecoration: "none", color: "#1e293b", fontWeight: 600, fontSize: 14 }}
          >
            Kitchen
          </a>
          <a
            href="/"
            target="_blank"
            style={{ padding: "8px 14px", background: "#1e3a8a", color: "white", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 14 }}
          >
            View Live Menu
          </a>
        </div>
      </header>

      {/* Categories & Items */}
      {categories.map((cat) => {
        const items = menuItems.filter((i) => i.category_id === cat.id);
        const isOpen = expanded[cat.id] ?? true;

        return (
          <div key={cat.id} style={{ background: "#fff", borderRadius: 12, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            {/* Category header */}
            <button
              onClick={() => toggleExpand(cat.id)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                background: "#f1f5f9",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{cat.name}</div>
                {cat.description && (
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{cat.description}</div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>{items.length} items</span>
                <span style={{ fontSize: 18 }}>{isOpen ? "▾" : "▸"}</span>
              </div>
            </button>

            {/* Items */}
            {isOpen && (
              <div style={{ padding: "8px 12px 16px" }}>
                {items.map((item) => {
                  const itemGroups = getGroupsForItem(item.id);
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 12px",
                        borderBottom: "1px solid #f1f5f9",
                        opacity: item.is_available ? 1 : 0.6,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                          {!item.is_available && (
                            <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4 }}>
                              OUT OF STOCK
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{item.description}</div>
                        )}
                        {itemGroups.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                            {itemGroups.map((g) => (
                              <span
                                key={g.id}
                                style={{
                                  fontSize: 11,
                                  background: "#e0f2fe",
                                  color: "#0369a1",
                                  padding: "2px 7px",
                                  borderRadius: 4,
                                }}
                              >
                                {g.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 600, minWidth: 60, textAlign: "right" }}>
                          £{Number(item.base_price).toFixed(2)}
                        </span>
                        <button
                          onClick={() => toggleAvailability(item)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "none",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            background: item.is_available ? "#dcfce7" : "#fee2e2",
                            color: item.is_available ? "#166534" : "#b91c1c",
                          }}
                        >
                          {item.is_available ? "Available" : "Out of stock"}
                        </button>
                        <button
                          onClick={() => setEditingItem({ ...item })}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Edit Modal */}
      {editingItem && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "90%", maxWidth: 440 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 20 }}>Edit Item</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Name</label>
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 15 }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Description</label>
              <textarea
                value={editingItem.description || ""}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                rows={2}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 15, resize: "vertical" }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Price (£)</label>
              <input
                type="number"
                step="0.10"
                value={editingItem.base_price}
                onChange={(e) => setEditingItem({ ...editingItem, base_price: parseFloat(e.target.value) || 0 })}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 15 }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={editingItem.is_available}
                  onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                />
                <span style={{ fontWeight: 600 }}>Available (in stock)</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setEditingItem(null)}
                style={{ flex: 1, padding: 12, background: "#e2e8f0", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                disabled={saving}
                style={{ flex: 1, padding: 12, background: "#1e3a8a", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}