import { useParams, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { CartContext } from './cartContext';
import styles from './ProductDetail.module.css';
import { getProduct } from './api';

type P = { id: string; name: string; price: number; image: string; description: string; stock: number }

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const [product, setProduct] = useState<P | null>(null)

  useEffect(() => {
    if (!id) return
    getProduct(id).then(setProduct).catch(() => setProduct(null))
  }, [id])

  if (!product) return <div style={{ padding: 40 }}>Produit introuvable.</div>;

  return (
    <div className={styles.detailWrapper}>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>&larr; Retour</button>
      <div className={styles.detailCard}>
        <img src={product.image} alt={product.name} />
        <div className={styles.info}>
          <h1>{product.name}</h1>
          <div className={styles.price}>{product.price}€</div>
          <div className={styles.desc}>{product.description}</div>
          <div className={styles.stock}>Stock : {product.stock}</div>
          <button className={styles.addBtn} onClick={() => addToCart(product)} disabled={product.stock === 0}>
            {product.stock === 0 ? 'Rupture de stock' : 'Ajouter au panier'}
          </button>
        </div>
      </div>
    </div>
  );
} 