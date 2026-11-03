export function generateSlug(name: string, sku: string): string {
  return `${name} ${sku}`.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
