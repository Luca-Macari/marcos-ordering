import { supabase } from "@/lib/supabase";

export default async function HomePage() {
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .order("sort_order");

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ color: "#1e3a8a" }}>Marco&apos;s On The Shore</h1>
      <p style={{ color: "#6b7280" }}>Family run fish &amp; chip shop • Est. 1997</p>
      <hr />

      {categories?.map((cat) => (
        <div key={cat.id} style={{ marginBottom: "40px" }}>
          <h2>{cat.name}</h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {menuItems
              ?.filter((item) => item.category_id === cat.id)
              .map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                >
                  <div>
                    <strong>{item.name}</strong>
                    {item.description && (
                      <div style={{ fontSize: "14px", color: "#6b7280" }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div>£{Number(item.base_price).toFixed(2)}</div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}