export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return "₹" + (Number.isInteger(rupees) ? rupees.toString() : rupees.toFixed(2));
}

export function whatsappLink(number: string, text?: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function offerLabel(o: { discount_type: string; discount_value: number }): string {
  return o.discount_type === "percentage" ? `${o.discount_value}% off` : `${formatPaise(o.discount_value)} off`;
}
