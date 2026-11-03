export type Field = { key: string; label: string; type: "text" | "textarea" | "bool" | "rupees" | "select" | "whatsapp" | "url" | "color"; options?: [string, string][]; help?: string };
export type Section = { id: string; title: string; fields: Field[] };

export const SETTINGS: Section[] = [
  { id: "business", title: "Business", fields: [
    { key: "restaurant_name", label: "Restaurant name", type: "text" }, { key: "tagline", label: "Tagline", type: "text" },
    { key: "description", label: "Description", type: "textarea" }, { key: "contact_phone", label: "Contact number (shown to customers)", type: "text" },
    { key: "whatsapp_number", label: "WhatsApp ordering number", type: "whatsapp", help: "Customers' orders are sent here. 10-digit Indian mobile." },
    { key: "address", label: "Address", type: "textarea" }, { key: "maps_url", label: "Maps link", type: "url" } ] },
  { id: "orders", title: "Orders", fields: [
    { key: "orders_enabled", label: "Accept orders", type: "bool" }, { key: "delivery_enabled", label: "Home delivery", type: "bool" }, { key: "takeaway_enabled", label: "Takeaway", type: "bool" },
    { key: "min_order_paise", label: "Minimum order (₹)", type: "rupees" }, { key: "delivery_fee_paise", label: "Delivery charge (₹)", type: "rupees" },
    { key: "free_delivery_threshold_paise", label: "Free delivery above (₹, empty = never)", type: "rupees" },
    { key: "prep_time", label: "Estimated preparation time", type: "text", help: "For example: 15–20 minutes" },
    { key: "store_override", label: "Open / closed", type: "select", options: [["auto", "Follow opening hours"], ["open", "Force open"], ["closed", "Force closed"]] },
    { key: "closed_message", label: "Message shown when closed", type: "text" } ] },
  { id: "payment", title: "Payment", fields: [
    { key: "pay_cod", label: "Cash on delivery", type: "bool" }, { key: "pay_pickup", label: "Pay at pickup", type: "bool" },
    { key: "payment_instructions", label: "Payment instructions (e.g. UPI details)", type: "textarea", help: "Shown on checkout and receipts. Online payments are not verified by this app." } ] },
  { id: "branding", title: "Branding & homepage", fields: [
    { key: "hero_heading", label: "Homepage heading", type: "text" }, { key: "hero_subtext", label: "Homepage supporting text", type: "text" },
    { key: "accent_color", label: "Accent colour", type: "color", help: "Replaces the lime green. Keep it light enough for dark text." },
    { key: "footer_text", label: "Footer text", type: "text" } ] },
  { id: "seo", title: "SEO", fields: [
    { key: "seo_title", label: "Page title", type: "text" }, { key: "seo_description", label: "Meta description", type: "textarea" } ] },
];
export const FIELD_KEYS = SETTINGS.flatMap((s) => s.fields.map((f) => f.key));
