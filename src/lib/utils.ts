/**
 * DiazTech — Utility Functions
 */

/**
 * Format a number as Argentine currency
 */
export function formatCurrency(
  amount: number,
  currency: string = "ARS"
): string {
  const symbol = currency === "USD" ? "US$" : "$";
  return `${symbol}${amount.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a date in Argentine format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a relative time (e.g., "Hace 5 minutos")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days} días`;
  return formatDate(d);
}

/**
 * Format a CUIT number (XX-XXXXXXXX-X)
 */
export function formatCUIT(cuit: string): string {
  const cleaned = cuit.replace(/\D/g, "");
  if (cleaned.length !== 11) return cuit;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 10)}-${cleaned.slice(10)}`;
}

/**
 * Validate a CUIT number
 */
export function validateCUIT(cuit: string): boolean {
  const cleaned = cuit.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;

  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * multipliers[i];
  }

  const remainder = sum % 11;
  const verifier = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;

  return verifier === parseInt(cleaned[10]);
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

/**
 * Generate invoice number formatted string
 */
export function formatInvoiceNumber(
  pointOfSale: number,
  number: number
): string {
  return `${String(pointOfSale).padStart(4, "0")}-${String(number).padStart(
    8,
    "0"
  )}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Recursively convert any Decimal values to numbers
 */
export function serializeDecimals<T>(obj: T): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "object" && typeof (obj as any).toNumber === "function") {
    return (obj as any).toNumber();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimals);
  }

  if (typeof obj === "object") {
    if (obj instanceof Date) return obj;
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = serializeDecimals(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}
