import React from 'react';
import styles from './AddToCartButton.module.css';

interface AddToCartButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export function AddToCartButton({
  children = 'Ajouter au panier',
  onClick,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: AddToCartButtonProps) {
  return (
    <button
      className={`${styles.addToCartButton} ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
    >
      {children}
    </button>
  );
}
