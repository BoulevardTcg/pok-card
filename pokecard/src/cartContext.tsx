import { createContext, useState, type ReactNode, useEffect } from 'react';

export interface ProductVariant {
  id: string;
  name: string;
  language: string | null;
  edition: string | null;
  priceCents: number;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  image: { url: string; altText: string | null } | null;
  images: Array<{ id: string; url: string; altText: string | null; position: number }>;
  variants: ProductVariant[];
  minPriceCents: number | null;
  outOfStock: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  priceCents: number;
  stock: number;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (variant: ProductVariant, product: Product) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalCents: () => number;
}

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getTotalCents: () => 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  function addToCart(variant: ProductVariant, product: Product) {
    if (variant.stock <= 0) return;

    setCart((prev) => {
      const found = prev.find((item) => item.variantId === variant.id);
      if (found) {
        if (found.quantity >= variant.stock) return prev;
        return prev.map((item) =>
          item.variantId === variant.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          variantName: variant.name,
          imageUrl: product.image?.url ?? null,
          priceCents: variant.priceCents,
          stock: variant.stock,
          quantity: 1,
        },
      ];
    });
  }

  function removeFromCart(variantId: string) {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  }

  function updateQuantity(variantId: string, quantity: number) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          const maxQty = Math.min(item.stock, quantity);
          return { ...item, quantity: Math.max(1, maxQty) };
        }
        return item;
      })
    );
  }

  function clearCart() {
    setCart([]);
  }

  function getTotalCents() {
    return cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  }

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotalCents }}
    >
      {children}
    </CartContext.Provider>
  );
}

// Export explicite des types pour compatibilité
export type { Product, ProductVariant, CartItem };
