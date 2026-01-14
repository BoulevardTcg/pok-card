import { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CartContext } from './cartContext';
import { useAuth } from './authContext';
import { CartIcon } from './components/icons/Icons';
import styles from './CartPage.module.css';
import {
  createCheckoutSession,
  getVariantsStock,
  validatePromoCode,
  getImageUrl,
  safeParse,
} from './api';
import { getEnabledShippingMethods, findShippingMethod } from './shippingMethods';
import type { CartItem } from './cartContext';

// Types pour le draft de checkout
type CheckoutDraft = {
  email: string;
  promoCode: string | null;
  shipping: {
    fullName: string;
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    city: string;
    country: string;
    phone: string;
  };
  shippingMethodCode: string;
  createdAt: number;
};

const CHECKOUT_DRAFT_TTL = 30 * 60 * 1000; // 30 minutes

export function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, getTotalCents } =
    useContext(CartContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const totalCents = getTotalCents();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [stockErrors, setStockErrors] = useState<Record<string, string>>({});
  const [refreshingStock, setRefreshingStock] = useState(false);
  const [cartItemsWithStock, setCartItemsWithStock] = useState<CartItem[]>(cart);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [shipping, setShipping] = useState({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    city: '',
    country: 'France',
    phone: '',
  });
  const [shippingError, setShippingError] = useState('');
  const enabledShippingMethods = getEnabledShippingMethods();
  const [shippingMethodCode, setShippingMethodCode] = useState(
    enabledShippingMethods[0]?.code ?? 'MONDIAL_RELAY'
  );

  // Refs pour l'auto-checkout (une seule exécution)
  const autoCheckoutRanRef = useRef(false);
  const inFlightRef = useRef(false);
  const refreshStockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const selectedShippingMethod =
    findShippingMethod(shippingMethodCode) || enabledShippingMethods[0] || null;
  const shippingCostCents = selectedShippingMethod?.priceCents ?? 0;
  const totalAfterDiscount = Math.max(0, totalCents - promoDiscount);
  const totalWithShipping = totalAfterDiscount + shippingCostCents;

  // Fusionner cart (quantités à jour) avec cartItemsWithStock (stock/prix à jour)
  // pour éviter les décalages visuels lors des changements de quantité
  const displayItems = useMemo(() => {
    if (cart.length === 0) return [];

    // Créer un Map pour un accès rapide aux données de stock
    const stockMap = new Map(cartItemsWithStock.map((item) => [item.variantId, item]));

    return cart.map((cartItem) => {
      const stockItem = stockMap.get(cartItem.variantId);
      // Utiliser la quantité de cart (mise à jour instantanément) et le stock/prix de cartItemsWithStock
      return stockItem ? { ...stockItem, quantity: cartItem.quantity } : cartItem;
    });
  }, [cart, cartItemsWithStock]);

  // Restaurer le draft de checkout au mount
  useEffect(() => {
    const draftStr = sessionStorage.getItem('checkoutDraft');
    if (!draftStr) return;

    const draft = safeParse<CheckoutDraft | null>(draftStr, null);
    if (!draft) return;

    // Vérifier TTL (30 minutes)
    const now = Date.now();
    if (now - draft.createdAt > CHECKOUT_DRAFT_TTL) {
      sessionStorage.removeItem('checkoutDraft');
      sessionStorage.removeItem('idempotencyKeyCheckout');
      return;
    }

    // Restaurer les champs
    setEmail(draft.email);
    if (draft.promoCode) {
      setPromoCode(draft.promoCode);
      setAppliedPromo(draft.promoCode);
    }
    setShipping(draft.shipping);
    setShippingMethodCode(draft.shippingMethodCode);
  }, []);

  // Rafraîchir le stock des articles du panier
  useEffect(() => {
    async function refreshStock() {
      if (cart.length === 0) {
        setCartItemsWithStock([]);
        setStockErrors({});
        return;
      }

      setRefreshingStock(true);
      try {
        const variantIds = cart.map((item) => item.variantId);
        const stockMap = await getVariantsStock(variantIds);
        const errors: Record<string, string> = {};
        const updatedCart: CartItem[] = [];

        cart.forEach((item) => {
          const currentStock = stockMap[item.variantId];

          if (!currentStock) {
            errors[item.variantId] = "Ce produit n'est plus disponible";
            return;
          }

          if (currentStock.stock <= 0) {
            errors[item.variantId] = 'Rupture de stock';
          } else if (currentStock.stock < item.quantity) {
            errors[item.variantId] =
              `Stock insuffisant (${currentStock.stock} disponible${currentStock.stock > 1 ? 's' : ''})`;
          }

          const updatedItem: CartItem = {
            ...item,
            stock: currentStock.stock,
            priceCents: currentStock.priceCents,
          };

          updatedCart.push(updatedItem);
        });

        setCartItemsWithStock(updatedCart);
        setStockErrors(errors);
      } catch {
        setCartItemsWithStock(cart);
      } finally {
        setRefreshingStock(false);
      }
    }

    // Debounce: nettoyer le timeout précédent si cart change rapidement
    if (refreshStockTimeoutRef.current) {
      clearTimeout(refreshStockTimeoutRef.current);
    }

    // Délai de 300ms avant de rafraîchir le stock pour éviter les appels multiples
    refreshStockTimeoutRef.current = setTimeout(() => {
      refreshStock();
    }, 300);

    // Cleanup: nettoyer le timeout si le composant est démonté ou si cart change
    return () => {
      if (refreshStockTimeoutRef.current) {
        clearTimeout(refreshStockTimeoutRef.current);
      }
    };
  }, [cart]);

  function validateShipping() {
    if (!shipping.fullName.trim()) return 'Veuillez renseigner le nom complet.';
    if (!shipping.addressLine1.trim()) return 'Veuillez renseigner l’adresse.';
    if (!shipping.postalCode.trim()) return 'Veuillez renseigner le code postal.';
    if (!shipping.city.trim()) return 'Veuillez renseigner la ville.';
    if (!shipping.country.trim()) return 'Veuillez renseigner le pays.';
    return '';
  }

  // Helpers pour l'idempotence basée sur la signature du payload
  type CheckoutSignatureArgs = {
    items: { variantId: string; quantity: number }[];
    promoCode?: string;
    shippingMethodCode?: string;
    shipping?: {
      fullName: string;
      addressLine1: string;
      addressLine2?: string;
      postalCode: string;
      city: string;
      country: string;
      phone?: string;
    };
  };

  function buildCheckoutSignature(args: CheckoutSignatureArgs) {
    const itemsSorted = [...args.items].sort((a, b) => a.variantId.localeCompare(b.variantId));
    return JSON.stringify({
      items: itemsSorted,
      promoCode: args.promoCode || null,
      shippingMethodCode: args.shippingMethodCode || null,
      shipping: args.shipping || null,
    });
  }

  function getOrCreateIdempotencyKey(signature: string) {
    const sigKey = 'idempotencyKeyCheckoutSignature';
    const keyKey = 'idempotencyKeyCheckout';

    const storedSig = sessionStorage.getItem(sigKey);
    const storedKey = sessionStorage.getItem(keyKey);

    if (storedSig === signature && storedKey) return storedKey;

    const newKey = `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(sigKey, signature);
    sessionStorage.setItem(keyKey, newKey);
    return newKey;
  }

  // Fonction pour démarrer le checkout Stripe
  async function startStripeCheckout() {
    if (inFlightRef.current) return; // Déjà en cours
    if (cart.length === 0) return;

    // Validations
    if (Object.keys(stockErrors).length > 0) {
      const hasRupture = Object.values(stockErrors).some((msg) => msg.includes('Rupture'));
      if (hasRupture) {
        setEmailError(
          'Impossible de procéder au paiement : certains articles sont en rupture de stock.'
        );
        return;
      }
    }

    const shippingValidation = validateShipping();
    if (shippingValidation) {
      setShippingError(shippingValidation);
      return;
    }

    if (!email || !email.includes('@')) {
      setEmailError('Veuillez entrer une adresse email valide');
      return;
    }

    if (!selectedShippingMethod) {
      setShippingError('Mode de livraison indisponible');
      return;
    }

    setEmailError('');
    setShippingError('');
    setLoading(true);
    inFlightRef.current = true;

    try {
      const items = cartItemsWithStock
        .map((item) => ({
          variantId: item.variantId,
          quantity: Math.min(item.quantity, item.stock),
        }))
        .filter((item) => item.quantity > 0);

      if (items.length === 0) {
        setEmailError('Aucun article disponible dans votre panier.');
        setLoading(false);
        inFlightRef.current = false;
        return;
      }

      const shippingMapped = {
        fullName: shipping.fullName,
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2 || undefined,
        postalCode: shipping.postalCode,
        city: shipping.city,
        country: shipping.country,
        phone: shipping.phone || undefined,
      };

      // ✅ Idempotence stable seulement si le payload est identique
      // Assurer que shippingMethodCode est une string stable (pas undefined)
      const stableShippingMethodCode = shippingMethodCode || enabledShippingMethods[0]?.code || '';
      // Assurer que promoCode est undefined quand vide (pas '')
      const stablePromoCode = appliedPromo && appliedPromo.trim() ? appliedPromo : undefined;

      const signature = buildCheckoutSignature({
        items,
        promoCode: stablePromoCode,
        shippingMethodCode: stableShippingMethodCode,
        shipping: shippingMapped,
      });
      const idempotencyKey = getOrCreateIdempotencyKey(signature);

      const { url } = await createCheckoutSession(
        items,
        email || undefined,
        stablePromoCode,
        shippingMapped,
        stableShippingMethodCode,
        idempotencyKey
      );

      if (url) {
        // ✅ IMPORTANT: ne pas nettoyer checkoutDraft/idempotency ici
        // (sinon si l'utilisateur annule sur Stripe, il perd ses champs)
        window.location.assign(url);
        return;
      }

      setEmailError('Session de paiement créée, mais aucune URL retournée.');
      setLoading(false);
      inFlightRef.current = false;
    } catch (e: unknown) {
      let errorMsg = 'Erreur lors de la création du paiement';
      const err = e as {
        status?: number;
        message?: string;
        response?: { data?: { error?: string } };
        isNetworkError?: boolean;
      };

      // Erreur réseau (CORS, timeout, connexion refusée, etc.)
      if (err?.isNetworkError || err?.status === 0) {
        errorMsg =
          err?.message || 'Erreur de connexion au serveur. Vérifiez votre connexion internet.';
      } else if (err?.status === 409 || err?.message?.includes('Stock insuffisant')) {
        errorMsg = 'Stock insuffisant pour certains articles. Veuillez vérifier votre panier.';
      } else if (err?.status === 401) {
        // Forcer login si 401
        // ✅ Reset des états avant navigation pour éviter blocage si l'utilisateur revient
        setLoading(false);
        inFlightRef.current = false;

        const draft: CheckoutDraft = {
          email,
          promoCode: appliedPromo,
          shipping,
          shippingMethodCode,
          createdAt: Date.now(),
        };

        sessionStorage.setItem('checkoutIntent', JSON.stringify({ v: 1, createdAt: Date.now() }));
        sessionStorage.setItem('guestCart', JSON.stringify(cart));
        sessionStorage.setItem('checkoutDraft', JSON.stringify(draft));

        navigate('/login?returnTo=/panier?autocheckout=1', { replace: true });
        return;
      } else {
        errorMsg = err?.response?.data?.error || err?.message || errorMsg;
      }

      setEmailError(errorMsg);
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  // Auto-checkout si autocheckout=1 dans l'URL
  useEffect(() => {
    const shouldAuto = searchParams.get('autocheckout') === '1';
    if (!shouldAuto) return;
    if (!isAuthenticated) return;
    if (autoCheckoutRanRef.current) return;
    if (loading || inFlightRef.current) return;

    autoCheckoutRanRef.current = true;

    // ✅ Enlever le param pour éviter que ça relance au refresh
    navigate('/panier', { replace: true });

    // Lancer le checkout après un court délai pour laisser le temps aux states de se mettre à jour
    setTimeout(() => {
      startStripeCheckout();
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated]);

  async function handleCheckout() {
    // Protection anti double-clic
    if (loading || inFlightRef.current) return;

    // Vérifier l'authentification uniquement au moment du clic sur "Commander"
    if (!isAuthenticated) {
      // Sauvegarder le draft de checkout
      const draft: CheckoutDraft = {
        email,
        promoCode: appliedPromo,
        shipping,
        shippingMethodCode,
        createdAt: Date.now(),
      };
      sessionStorage.setItem('checkoutIntent', JSON.stringify({ v: 1, createdAt: Date.now() }));
      sessionStorage.setItem('guestCart', JSON.stringify(cart));
      sessionStorage.setItem('checkoutDraft', JSON.stringify(draft));
      navigate('/login?returnTo=/panier?autocheckout=1', { replace: true });
      return;
    }

    // Si authentifié, lancer directement le checkout
    await startStripeCheckout();
  }

  if (cart.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <CartIcon size={64} />
            </div>
            <h2 className={styles.emptyTitle}>Votre panier est vide</h2>
            <p className={styles.emptyText}>Découvrez nos collections premium</p>
            <button
              type="button"
              onClick={() => navigate('/produits')}
              className={styles.emptyButton}
            >
              Explorer le catalogue
              <span className={styles.arrow}>→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Panier</h1>

        <div
          className={styles.refreshingStock}
          style={{
            opacity: refreshingStock ? 1 : 0,
            visibility: refreshingStock ? 'visible' : 'hidden',
          }}
        >
          <svg
            className={styles.refreshIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          Vérification du stock en cours...
        </div>

        <div className={styles.content}>
          {/* Liste des articles - toujours accessible en invité */}
          <div className={styles.itemsList}>
            {displayItems.map((item) => {
              const stockError = stockErrors[item.variantId];
              const isOutOfStock = item.stock <= 0;
              const hasInsufficientStock = item.stock < item.quantity;

              return (
                <div
                  key={item.variantId}
                  className={`${styles.cartItem} ${stockError ? styles.hasError : ''}`}
                >
                  {/* Image */}
                  <div className={styles.imageContainer}>
                    {item.imageUrl ? (
                      <img
                        src={getImageUrl(item.imageUrl)}
                        alt={item.productName}
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.placeholderImage}>Pas d'image</div>
                    )}
                  </div>

                  {/* Détails */}
                  <div className={styles.details}>
                    <div className={styles.headerRow}>
                      <div>
                        <h3 className={styles.productName}>{item.productName}</h3>
                        {item.variantName !== 'Standard' && (
                          <p className={styles.variantName}>Variante : {item.variantName}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.variantId)}
                        className={styles.removeButton}
                        aria-label="Retirer du panier"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Quantité et prix */}
                    <div className={styles.quantityRow}>
                      <div className={styles.quantityControls}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className={styles.quantityButton}
                          disabled={item.quantity <= 1}
                          aria-label="Diminuer la quantité"
                        >
                          −
                        </button>
                        <span className={styles.quantityValue}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className={styles.quantityButton}
                          disabled={item.stock <= item.quantity}
                          aria-label="Augmenter la quantité"
                        >
                          +
                        </button>
                      </div>
                      <div className={styles.priceRow}>
                        <p className={styles.itemPrice}>
                          {formatPrice(item.priceCents * item.quantity)}€
                        </p>
                        {item.quantity > 1 && (
                          <p className={styles.unitPrice}>
                            {formatPrice(item.priceCents)}€ l'unité
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stock info */}
                    <div className={styles.stockRow}>
                      <span
                        className={`${styles.stockInfo} ${isOutOfStock ? styles.outOfStock : hasInsufficientStock ? styles.lowStock : ''}`}
                      >
                        Stock :{' '}
                        {item.stock > 0
                          ? `${item.stock} disponible${item.stock > 1 ? 's' : ''}`
                          : 'Rupture'}
                      </span>
                      {stockError && <div className={styles.stockError}>⚠️ {stockError}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Résumé de commande - toujours affiché, accessible en invité */}
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <h2 className={styles.summaryTitle}>Résumé</h2>

              <div className={styles.shippingBlock}>
                <div className={styles.shippingBlockHeader}>
                  <span>Mode de livraison</span>
                </div>
                <div className={styles.shippingOptions}>
                  {enabledShippingMethods.map((method) => (
                    <label key={method.code} className={styles.shippingOption}>
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={method.code}
                        checked={shippingMethodCode === method.code}
                        onChange={() => setShippingMethodCode(method.code)}
                      />
                      <div className={styles.shippingOptionContent}>
                        <div className={styles.shippingOptionTop}>
                          <span className={styles.shippingLabel}>{method.label}</span>
                          <span className={styles.shippingPrice}>
                            {formatPrice(method.priceCents)}€
                          </span>
                        </div>
                        {method.description && (
                          <div className={styles.shippingDescription}>{method.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.summaryDetails}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Sous-total</span>
                  <span className={styles.summaryValue}>{formatPrice(totalCents)}€</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Livraison</span>
                  <span className={styles.summaryValue}>
                    {selectedShippingMethod ? `${formatPrice(shippingCostCents)}€` : '—'}
                  </span>
                </div>
                {promoDiscount > 0 && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Réduction</span>
                    <span className={styles.summaryValue} style={{ color: '#10b981' }}>
                      -{formatPrice(promoDiscount)}€
                    </span>
                  </div>
                )}
                <div className={styles.summaryTotal}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>{formatPrice(totalWithShipping)}€</span>
                </div>
              </div>

              {/* Code promo */}
              <div className={styles.promoSection}>
                {appliedPromo ? (
                  <div className={styles.promoApplied}>
                    <span>
                      Code appliqué: <strong>{appliedPromo}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedPromo(null);
                        setPromoDiscount(0);
                        setPromoCode('');
                      }}
                      className={styles.removePromoButton}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className={styles.promoInputGroup}>
                    <input
                      type="text"
                      placeholder="Code promo"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoError('');
                      }}
                      className={`${styles.promoInput} ${promoError ? styles.hasError : ''}`}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!promoCode.trim()) {
                          setPromoError('Veuillez entrer un code promo');
                          return;
                        }
                        try {
                          const result = await validatePromoCode(promoCode, totalCents);
                          if (result.valid) {
                            setPromoDiscount(result.discountCents);
                            setAppliedPromo(promoCode);
                            setPromoError('');
                            // Note: le compteur d'utilisation est incrémenté côté backend lors du checkout
                          } else {
                            setPromoError('Code promo invalide');
                          }
                        } catch (err: unknown) {
                          const error = err as { message?: string };
                          setPromoError(error.message || 'Code promo invalide');
                        }
                      }}
                      className={styles.applyPromoButton}
                    >
                      Appliquer
                    </button>
                  </div>
                )}
                {promoError && <div className={styles.promoError}>{promoError}</div>}
              </div>

              <div className={styles.emailSection}>
                <input
                  type="email"
                  placeholder="Email (pour la confirmation)"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  className={`${styles.emailInput} ${emailError ? styles.hasError : ''}`}
                />
                {emailError && <div className={styles.emailError}>{emailError}</div>}
              </div>

              <div className={styles.shippingSection}>
                <input
                  type="text"
                  placeholder="Nom complet"
                  value={shipping.fullName}
                  onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                  className={`${styles.emailInput} ${shippingError ? styles.hasError : ''}`}
                />
                <input
                  type="text"
                  placeholder="Adresse"
                  value={shipping.addressLine1}
                  onChange={(e) => setShipping({ ...shipping, addressLine1: e.target.value })}
                  className={`${styles.emailInput} ${shippingError ? styles.hasError : ''}`}
                />
                <input
                  type="text"
                  placeholder="Complément d'adresse (optionnel)"
                  value={shipping.addressLine2}
                  onChange={(e) => setShipping({ ...shipping, addressLine2: e.target.value })}
                  className={styles.emailInput}
                />
                <div className={styles.shippingRow}>
                  <input
                    type="text"
                    placeholder="Code postal"
                    value={shipping.postalCode}
                    onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                    className={`${styles.emailInput} ${shippingError ? styles.hasError : ''}`}
                  />
                  <input
                    type="text"
                    placeholder="Ville"
                    value={shipping.city}
                    onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    className={`${styles.emailInput} ${shippingError ? styles.hasError : ''}`}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Pays"
                  value={shipping.country}
                  onChange={(e) => setShipping({ ...shipping, country: e.target.value })}
                  className={`${styles.emailInput} ${shippingError ? styles.hasError : ''}`}
                />
                <input
                  type="tel"
                  placeholder="Téléphone (optionnel)"
                  value={shipping.phone}
                  onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                  className={styles.emailInput}
                />
                {shippingError && <div className={styles.emailError}>{shippingError}</div>}
              </div>

              <button
                type="button"
                className={styles.checkoutButton}
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
              >
                {loading ? '⏳ Redirection...' : 'Passer la commande'}
                <span className={styles.arrow}>→</span>
              </button>

              <button
                type="button"
                className={styles.continueButton}
                onClick={() => navigate('/produits')}
              >
                Continuer les achats
              </button>

              <button type="button" className={styles.clearButton} onClick={clearCart}>
                Vider le panier
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * CHECKLIST DE VALIDATION - Scénarios de test manuels :
 *
 * ✅ Scénario 1 : Utilisateur invité ajoute des produits au panier
 *    - Ajouter des produits au panier sans être connecté
 *    - Vérifier que le panier s'affiche correctement
 *    - Vérifier que les quantités peuvent être modifiées
 *    - Vérifier que le panier persiste après refresh (localStorage)
 *
 * ✅ Scénario 2 : Utilisateur invité clique sur "Commander"
 *    - Sans être connecté, cliquer sur "Passer la commande"
 *    - Vérifier la redirection vers /login?returnTo=/panier
 *    - Vérifier que le panier est toujours présent après redirection
 *
 * ✅ Scénario 3 : Connexion depuis le panier
 *    - Après redirection vers /login, se connecter
 *    - Vérifier la redirection automatique vers /panier
 *    - Vérifier que le panier invité est fusionné avec le panier utilisateur
 *    - Vérifier que toutes les données du panier sont intactes
 *
 * ✅ Scénario 4 : Utilisateur connecté passe commande
 *    - Se connecter d'abord
 *    - Ajouter des produits au panier
 *    - Cliquer sur "Passer la commande"
 *    - Vérifier que le checkout se lance directement sans redirection
 *
 * ✅ Scénario 5 : Navigation et persistance
 *    - Ajouter des produits en invité
 *    - Naviguer vers d'autres pages
 *    - Revenir au panier
 *    - Vérifier que le panier est toujours présent
 *    - Vérifier que le panier persiste après refresh navigateur
 *
 * ✅ Scénario 6 : Retour navigateur après connexion
 *    - Être invité, cliquer sur "Commander"
 *    - Se connecter
 *    - Utiliser le bouton retour du navigateur
 *    - Vérifier que le panier est toujours accessible
 *
 * ✅ Scénario 7 : Panier vide
 *    - Accéder au panier vide en invité
 *    - Vérifier l'affichage du message "Votre panier est vide"
 *    - Vérifier qu'aucun bloc d'authentification n'apparaît
 */
