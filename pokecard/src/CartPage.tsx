import { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from './cartContext';
import { useAuth } from './authContext';
import { CartIcon } from './components/icons/Icons';
import styles from './CartPage.module.css';
import {
  createCheckoutSession,
  getVariantsStock,
  type VariantStockInfo,
  validatePromoCode,
  getImageUrl,
  checkoutHold,
} from './api';
import { getEnabledShippingMethods, findShippingMethod } from './shippingMethods';

export function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, getTotalCents } =
    useContext(CartContext);

  // Handler pour retirer un article du panier (purement local, pas de réservation)
  // STRATÉGIE: HOLD au checkout uniquement, pas au panier
  const handleRemoveFromCart = (variantId: string) => {
    removeFromCart(variantId);
  };

  // Handler pour mettre à jour la quantité (purement local, pas de réservation)
  // STRATÉGIE: HOLD au checkout uniquement, pas au panier
  const handleUpdateQuantity = (variantId: string, newQuantity: number) => {
    updateQuantity(variantId, newQuantity);
  };

  // Handler pour vider le panier (purement local, pas de réservation)
  // STRATÉGIE: HOLD au checkout uniquement, pas au panier
  const handleClearCart = () => {
    clearCart();
  };
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const totalCents = getTotalCents();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [refreshingStock, setRefreshingStock] = useState(false);
  // State séparé pour les infos stock/prix par variantId (mis à jour uniquement lors du refresh)
  // variantKey déclenche le refresh uniquement quand la liste des variantIds change (ajout/suppression)
  const [variantInfo, setVariantInfo] = useState<Record<string, VariantStockInfo>>({});
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

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const selectedShippingMethod =
    findShippingMethod(shippingMethodCode) || enabledShippingMethods[0] || null;
  const shippingCostCents = selectedShippingMethod?.priceCents ?? 0;
  const totalAfterDiscount = Math.max(0, totalCents - promoDiscount);
  const totalWithShipping = totalAfterDiscount + shippingCostCents;

  // Clé stable basée uniquement sur les variantIds présents dans le panier (triés)
  // Utilisée pour déclencher le refresh stock uniquement quand la liste des items change
  // (ajout/suppression), pas lors des changements de quantités (+/-)
  const variantKey = useMemo(() => {
    return cart
      .map((item) => item.variantId)
      .sort()
      .join('|');
  }, [cart]);

  // Rafraîchir le stock des articles du panier
  // IMPORTANT: On dépend uniquement de variantKey (liste des variantIds) et non de cart complet
  // pour éviter de déclencher un refetch lors des changements de quantités (+/-)
  // Le stock n'est rafraîchi que quand la liste des items change (ajout/suppression)
  useEffect(() => {
    async function refreshStock() {
      if (cart.length === 0) {
        setVariantInfo({});
        return;
      }

      setRefreshingStock(true);
      try {
        const variantIds = cart.map((item) => item.variantId);
        const stockMap = await getVariantsStock(variantIds);
        setVariantInfo(stockMap);
      } catch (error) {
        console.error('Erreur lors du rafraîchissement du stock:', error);
        // En cas d'erreur, garder les infos précédentes
      } finally {
        setRefreshingStock(false);
      }
    }

    // Debounce: attendre 300ms avant de rafraîchir le stock
    // Cela évite de déclencher un refresh à chaque petit changement
    const timeoutId = setTimeout(() => {
      refreshStock();
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantKey]); // Seulement variantKey : le refresh ne se déclenche que quand la liste des items change

  // Recréer cartItemsWithStock à partir de cart (source de vérité pour les quantités) + variantInfo
  // available = stock disponible globalement (totalStock - réservations globales)
  // maxAllowed = available + reservedByMe (quantité max autorisée pour cet utilisateur)
  const cartItemsWithStock = useMemo(() => {
    return cart.map((item) => {
      const info = variantInfo[item.variantId];
      const available = info?.available ?? 0;
      const reservedByMe = info?.reservedByMe ?? 0;
      const maxAllowed = info?.maxAllowed ?? available + reservedByMe;
      return {
        ...item,
        available, // Stock disponible globalement
        reservedByMe, // Réservations de cet utilisateur
        maxAllowed, // Quantité max autorisée (available + ses réservations)
        priceCents: info?.priceCents ?? item.priceCents,
      };
    });
  }, [cart, variantInfo]);

  // STRATÉGIE: HOLD au checkout uniquement, pas au panier
  // Stock estimé informatif seulement (pas d'erreurs bloquantes au panier)
  // La vérification réelle se fait au moment du HOLD (/checkout/hold)
  // On garde juste un warning doux si le stock est faible (informatif)
  const stockWarnings = useMemo(() => {
    const warnings: Record<string, string> = {};
    cartItemsWithStock.forEach((item) => {
      const info = variantInfo[item.variantId];
      if (!info) {
        // Si on n'a pas encore les infos de stock, pas de warning
        return;
      }

      // Warning informatif seulement (pas bloquant)
      if (info.available <= 0) {
        warnings[item.variantId] = 'Stock faible, vérification au paiement';
      } else if (info.available < 5) {
        warnings[item.variantId] = 'Stock faible, vérification au paiement';
      }
    });
    return warnings;
  }, [cartItemsWithStock, variantInfo]);

  function validateShipping() {
    if (!shipping.fullName.trim()) return 'Veuillez renseigner le nom complet.';
    if (!shipping.addressLine1.trim()) return 'Veuillez renseigner l’adresse.';
    if (!shipping.postalCode.trim()) return 'Veuillez renseigner le code postal.';
    if (!shipping.city.trim()) return 'Veuillez renseigner la ville.';
    if (!shipping.country.trim()) return 'Veuillez renseigner le pays.';
    return '';
  }

  async function handleCheckout() {
    // AJUSTEMENT A: Anti double-clic (guard inFlight)
    if (loading) {
      return; // Déjà en cours, ignorer
    }

    // Vérifier l'authentification uniquement au moment du clic sur "Commander"
    if (!isAuthenticated) {
      // Stocker l'intention de checkout et le panier invité avant redirection
      sessionStorage.setItem('checkoutIntent', 'true');
      sessionStorage.setItem('guestCart', JSON.stringify(cart));
      navigate('/login?returnTo=/panier', { replace: true });
      return;
    }

    if (cart.length === 0) return;

    // STRATÉGIE: HOLD au checkout uniquement
    // Ne pas bloquer au panier (stock estimé informatif seulement)
    // La vérification réelle se fait au moment du HOLD (/checkout/hold)

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
    try {
      const items = cart.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      if (items.length === 0) {
        setEmailError('Aucun article disponible dans votre panier.');
        setLoading(false);
        return;
      }

      // STRATÉGIE: HOLD au checkout uniquement (TTL 10 minutes)
      // Créer un HOLD pour tout le panier avant de créer la session Stripe
      try {
        await checkoutHold(items, 10); // TTL 10 minutes pour le paiement
      } catch (holdError: any) {
        console.error('Erreur lors du HOLD:', holdError);
        if (holdError?.status === 409) {
          // Stock insuffisant au moment du HOLD
          const errorData = holdError?.response?.data;
          if (errorData?.code === 'OUT_OF_STOCK' && errorData?.details) {
            const details = errorData.details;
            const messages = details.map(
              (d: any) => `${d.variantId}: ${d.requested} demandé, ${d.available} disponible`
            );
            setEmailError(
              `Stock insuffisant pour certains articles. ${messages.join('; ')}. Veuillez ajuster votre panier.`
            );
          } else {
            setEmailError(
              'Stock insuffisant pour certains articles. Veuillez vérifier votre panier et réessayer.'
            );
          }
        } else {
          setEmailError('Erreur lors de la réservation du stock. Veuillez réessayer.');
        }
        setLoading(false);
        return;
      }

      // Si HOLD réussi, créer la session Stripe
      const { url } = await createCheckoutSession(
        items,
        email || undefined,
        appliedPromo || undefined,
        {
          fullName: shipping.fullName,
          addressLine1: shipping.addressLine1,
          addressLine2: shipping.addressLine2 || undefined,
          postalCode: shipping.postalCode,
          city: shipping.city,
          country: shipping.country,
          phone: shipping.phone || undefined,
        },
        shippingMethodCode
      );

      if (url) {
        window.location.href = url;
      } else {
        setEmailError('Session de paiement créée, mais aucune URL retournée.');
        setLoading(false);
      }
    } catch (e: Error) {
      console.error('Erreur checkout:', e);
      let errorMsg = 'Erreur lors de la création du paiement';

      if (e?.status === 409 || e?.message?.includes('Stock insuffisant')) {
        errorMsg = 'Stock insuffisant pour certains articles. Veuillez vérifier votre panier.';
      } else {
        errorMsg = e?.response?.data?.error || e?.message || errorMsg;
      }

      setEmailError(errorMsg);
      setLoading(false);
    }
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
            <button onClick={() => navigate('/produits')} className={styles.emptyButton}>
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

        {refreshingStock && (
          <div className={styles.refreshingStock}>
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
        )}

        <div className={styles.content}>
          {/* Liste des articles - toujours accessible en invité */}
          <div className={styles.itemsList}>
            {cartItemsWithStock.map((item) => {
              const stockWarning = stockWarnings[item.variantId];
              const available = item.available;

              return (
                <div key={item.variantId} className={styles.cartItem}>
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
                        onClick={() => handleRemoveFromCart(item.variantId)}
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
                          onClick={() => handleUpdateQuantity(item.variantId, item.quantity - 1)}
                          className={styles.quantityButton}
                          disabled={item.quantity <= 1}
                          aria-label="Diminuer la quantité"
                        >
                          −
                        </button>
                        <span className={styles.quantityValue}>{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.variantId, item.quantity + 1)}
                          className={styles.quantityButton}
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

                    {/* Stock info - Informatif seulement (pas bloquant) */}
                    <div className={styles.stockRow}>
                      <span
                        className={`${styles.stockInfo} ${available <= 0 ? styles.outOfStock : available < 5 ? styles.lowStock : ''}`}
                      >
                        Stock estimé :{' '}
                        {available > 0
                          ? `${available} disponible${available > 1 ? 's' : ''}`
                          : 'Rupture'}
                      </span>
                      {stockWarning && (
                        <div className={styles.stockError} style={{ opacity: 0.8 }}>
                          ⚠️ {stockWarning}
                        </div>
                      )}
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
                        } catch (err: Error) {
                          setPromoError(err.message || 'Code promo invalide');
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
                className={styles.checkoutButton}
                onClick={handleCheckout}
                disabled={loading || cart.length === 0}
              >
                {loading ? '⏳ Redirection...' : 'Passer la commande'}
                <span className={styles.arrow}>→</span>
              </button>

              <button className={styles.continueButton} onClick={() => navigate('/produits')}>
                Continuer les achats
              </button>

              <button className={styles.clearButton} onClick={handleClearCart}>
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
