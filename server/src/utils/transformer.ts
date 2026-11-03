
export class ColumnNumericTransformer {
  to(data: number | null | undefined): number | null {
    // Convert NaN or null/undefined to database NULL
    if (data === null || data === undefined || (typeof data === 'number' && isNaN(data))) {
      return null;
    }
    return data;
  }

  from(data: string | null | undefined): number | null {
    // Handle database NULLs gracefully
    if (data === null || data === undefined) {
      return null;
    }
    const float = parseFloat(data);
    // Ensure we don't return NaN to the application layer
    return isNaN(float) ? null : float;
  }
}
