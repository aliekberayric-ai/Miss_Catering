import { getSupabaseClient } from './supabase.js';

const ORDERS_KEY = 'miss-catering-orders';

export function readLocalOrders() {
  return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
}

export function saveLocalOrder(order) {
  const orders = readLocalOrders();
  orders.unshift(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export async function saveOrder(order) {
  saveLocalOrder(order);
  const supabase = getSupabaseClient();
  if (!supabase) return { savedRemote: false };

  const payload = {
    customer_name: order.customerName,
    customer_email: order.customerEmail,
    package_slug: order.packageSlug,
    persons: order.persons,
    total_price: order.total,
    payload: order
  };

  const { error } = await supabase.from('orders').insert(payload);
  return { savedRemote: !error, error };
}
