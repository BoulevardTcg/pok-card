import styles from './CategoryPage.module.css';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { listProducts } from './api';

type P = { id: string; name: string; price: number; image: string }

export function CategoryPage({ category }: { category: 'pokemon' | 'onepiece' }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<P[]>([])

  useEffect(() => {
    listProducts({ category }).then(setItems).catch(() => setItems([]))
  }, [category])

  return (
    <div className={styles.wrapper}>
      {/* Affichage des cartes désactivé temporairement */}
    </div>
  );
}