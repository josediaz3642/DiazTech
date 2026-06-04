/**
 * DiazTech — WhatsApp Helper
 * Generates pre-built wa.me links for sending messages via WhatsApp
 */

interface WhatsAppMessageOptions {
  phone: string;
  message: string;
}

/**
 * Formats a phone number for wa.me links
 * Removes spaces, dashes, parentheses and ensures country code
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, "");

  // If starts with 0, remove it and add Argentina code
  if (cleaned.startsWith("0")) {
    cleaned = "54" + cleaned.substring(1);
  }

  // If doesn't start with country code, add Argentina
  if (!cleaned.startsWith("54")) {
    cleaned = "54" + cleaned;
  }

  // Ensure 9 is added after country code for mobile
  if (cleaned.startsWith("54") && !cleaned.startsWith("549")) {
    cleaned = "549" + cleaned.substring(2);
  }

  return cleaned;
}

/**
 * Generates a wa.me URL with pre-filled message
 */
export function generateWhatsAppLink({
  phone,
  message,
}: WhatsAppMessageOptions): string {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Generate a budget/quote message link
 */
export function generateBudgetLink(
  phone: string,
  clientName: string,
  budgetNumber: number,
  total: number,
  viewUrl?: string
): string {
  let message = `Hola ${clientName}, te envío el presupuesto N°${budgetNumber} por $${total.toLocaleString("es-AR")}.`;
  if (viewUrl) {
    message += ` Podés verlo acá: ${viewUrl}`;
  }
  message += "\n\n¿Tenés alguna consulta? Estamos a disposición. — DiazTech";

  return generateWhatsAppLink({ phone, message });
}

/**
 * Generate an account balance reminder link
 */
export function generateBalanceReminderLink(
  phone: string,
  clientName: string,
  balance: number,
  currency: string = "ARS"
): string {
  const symbol = currency === "USD" ? "US$" : "$";
  const message = `Hola ${clientName}, te recordamos que tenés un saldo pendiente de ${symbol}${balance.toLocaleString("es-AR")}.\n\nPodés consultarnos cualquier detalle. — DiazTech`;

  return generateWhatsAppLink({ phone, message });
}

/**
 * Generate an invoice link
 */
export function generateInvoiceLink(
  phone: string,
  clientName: string,
  invoiceType: string,
  invoiceNumber: string,
  total: number,
  viewUrl?: string
): string {
  let message = `Hola ${clientName}, te enviamos la Factura ${invoiceType} N°${invoiceNumber} por $${total.toLocaleString("es-AR")}.`;
  if (viewUrl) {
    message += ` Podés descargarla acá: ${viewUrl}`;
  }
  message += "\n\nGracias por tu confianza. — DiazTech";

  return generateWhatsAppLink({ phone, message });
}

/**
 * Generate a payment confirmation link
 */
export function generatePaymentConfirmationLink(
  phone: string,
  clientName: string,
  amount: number,
  receiptNumber: string
): string {
  const message = `Hola ${clientName}, confirmamos tu pago de $${amount.toLocaleString("es-AR")}. Recibo N°${receiptNumber}.\n\nGracias. — DiazTech`;

  return generateWhatsAppLink({ phone, message });
}

/**
 * Generate a delivery notification link
 */
export function generateDeliveryLink(
  phone: string,
  clientName: string,
  remitoNumber: number
): string {
  const message = `Hola ${clientName}, tu pedido está en camino. Remito N°${remitoNumber}.\n\n¿Alguna consulta? Estamos a disposición. — DiazTech`;

  return generateWhatsAppLink({ phone, message });
}
