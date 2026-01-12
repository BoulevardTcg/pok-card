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
  mergeCart: (itemsToMerge: CartItem[]) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getTotalCents: () => 0,
  mergeCart: () => {},
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

  // Fusionner le panier invité avec le panier utilisateur
  // Les quantités sont additionnées pour les variantes identiques
  function mergeCart(itemsToMerge: CartItem[]) {
    setCart((prev) => {
      const merged = [...prev];

      itemsToMerge.forEach((itemToMerge) => {
        const existingIndex = merged.findIndex((item) => item.variantId === itemToMerge.variantId);

        if (existingIndex >= 0) {
          // Si la variante existe déjà, additionner les quantités (sans dépasser le stock)
          const existing = merged[existingIndex];
          const maxQuantity = Math.min(existing.stock, existing.quantity + itemToMerge.quantity);
          merged[existingIndex] = {
            ...existing,
            quantity: maxQuantity,
          };
        } else {
          // Si la variante n'existe pas, l'ajouter
          merged.push(itemToMerge);
        }
      });

      return merged;
    });
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalCents,
        mergeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// Export explicite des types pour compatibilité
export type { Product, ProductVariant, CartItem };
