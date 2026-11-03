
import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters"),
  sku: z.string().min(3, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  price: z.number().positive("Selling price must be a positive number"),
  description: z.string().optional().default(''),
  
  // Compatibility & Specs
  compatibility: z.array(z.string()).optional().default([]), // e.g. ["Toyota Vitz", "Subaru Forester"]
  oemNumbers: z.array(z.string()).optional().default([]),
  
  // Media
  imageUrl: z.string().url("Invalid Image URL").optional().or(z.literal('')),
  images: z.array(z.string()).optional().default([]),
  videoUrl: z.string().optional(),

  // Stock & Pricing Details
  quantity: z.number().int().min(0).optional().default(0), // Determines Stock Status
  costPrice: z.number().min(0).optional().default(0),
  wholesalePrice: z.number().min(0).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
