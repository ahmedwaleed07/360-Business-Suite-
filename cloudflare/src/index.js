// ASAS Business Suite — public-only Cloudflare Worker scaffold.
// NO protected business or user API is implemented until real authentication
// and tenant authorization are independently verified.
const HOUSE_AD = Object.freeze({
  id: "asas-house",
  advertiser_name: "ASAS 360°",
  headline: "Your Business. Our Vision.",
  subtitle: "CRM • ERP • Integrated Business Solutions",
  format: "motion",
  destination_url: "https://asas360.com",
  duration_seconds: 15,
  house_ad: true,
});
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", "x-content-type-options":"nosniff" },
});
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ service:"asas-business-suite-api", status:"scaffold", production_ready:false });
    if (request.method === "GET" && url.pathname === "/public/ads") {
      if (!env?.DB) return json({ advertisements:[HOUSE_AD], fallback:true });
      try {
        const now = new Date().toISOString();
        const {results} = await env.DB.prepare(
          "SELECT id, advertiser_name, headline, subtitle, format, destination_url FROM ad_campaigns WHERE status = 'active' AND starts_at <= ? AND ends_at > ? ORDER BY created_at ASC LIMIT 5"
        ).bind(now,now).all();
        const advertisements = Array.isArray(results) && results.length ? results.map(x=>({
          id:x.id, advertiser_name:x.advertiser_name, headline:x.headline,
          subtitle:x.subtitle, format:x.format, destination_url:x.destination_url,
          house_ad:false
        })) : [HOUSE_AD];
        return json({ advertisements, fallback:advertisements[0].house_ad === true });
      } catch(err) {
        console.error("ASAS public ad query failed", err instanceof Error ? err.message : "unknown");
        return json({ advertisements:[HOUSE_AD], fallback:true });
      }
    }
    if (url.pathname.startsWith("/api/")) return json({ error:"protected_api_not_available", message:"Authentication and tenant authorization are not yet deployed." },503);
    return json({ error:"not_found" },404);
  }
};
