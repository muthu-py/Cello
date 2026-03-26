import axios from 'axios';

/**
 * In development, leave env vars unset to use Vite proxy (same-origin /api/*).
 * In production, set absolute URLs, e.g. https://api.example.com
 */
const devDefault = import.meta.env.DEV ? '' : 'http://localhost:3000';
const financeDevDefault = import.meta.env.DEV ? '' : 'http://localhost:5002';

export const INVENTORY_API =
  import.meta.env.VITE_INVENTORY_API !== undefined &&
  import.meta.env.VITE_INVENTORY_API !== null
    ? import.meta.env.VITE_INVENTORY_API
    : devDefault;

export const FINANCE_API =
  import.meta.env.VITE_FINANCE_API !== undefined &&
  import.meta.env.VITE_FINANCE_API !== null
    ? import.meta.env.VITE_FINANCE_API
    : financeDevDefault;

export const inventoryApi = axios.create({
  baseURL: INVENTORY_API,
  timeout: 60_000,
});

export const financeApi = axios.create({
  baseURL: FINANCE_API,
  timeout: 30_000,
});
