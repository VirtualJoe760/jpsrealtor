/** Queues are bounded server snapshots; pagination never changes membership/order. */
export function paginateQueue<T>(items: T[], requestedPage: number, pageSize = 10) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new Error('Invalid queue page size');
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.max(0, Math.min(pages - 1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 0));
  const offset = page * pageSize;
  return { page, pages, total: items.length, start: items.length ? offset + 1 : 0,
    end: Math.min(offset + pageSize, items.length), items: items.slice(offset, offset + pageSize) };
}
