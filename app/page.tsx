import { supabase } from "../lib/supabase";

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
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ marginBottom: "30px" }}>
        <h1 style={{ color: "#1e3a8a", margin: "0 0 4px 0", fontSize: "28px" }}>
          Marco&apos;s On The Shore
        </h1>
        <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>
          Family run fish &amp; chip shop • Est. 1997
        </p>
      </header>

      {categories?.map((cat) => (
        <section key={cat.id} style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "22px", marginBottom: "8px", color: "#111" }}>
            {cat.name}
          </h2>
          <div style={{ height: "3px", width: "50px", background: "#f97316", marginBottom: "16px", borderRadius: "2px" }} />

          <div style={{ display: "grid", gap: "10px" }}>
            {menuItems
              ?.filter((item) => item.category_id === cat.id)
              .map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "16px" }}>{item.name}</div>
                    {item.description && (
                      <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "16px", whiteSpace: "nowrap" }}>
                    £{Number(item.base_price).toFixed(2)}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}