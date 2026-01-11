import { useState } from 'react';
import { SearchIcon, ChevronDownIcon } from '../icons/Icons';
import styles from './FilterBar.module.css';
import {
  GameCategory,
  ProductType,
  Availability,
  categoryLabels,
  productTypeLabels,
  availabilityLabels,
} from '../../utils/filters';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGameCategories: GameCategory[];
  onGameCategoriesChange: (categories: GameCategory[]) => void;
  selectedProductTypes: ProductType[];
  onProductTypesChange: (types: ProductType[]) => void;
  selectedAvailability: Availability[];
  onAvailabilityChange: (availability: Availability[]) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  activeTab: 'Tous' | 'Produits phares' | 'Nouveauté';
  onTabChange: (tab: 'Tous' | 'Produits phares' | 'Nouveauté') => void;
  onResetFilters?: () => void;
}

const gameCategories = Object.values(GameCategory);
const productTypes = [
  ProductType.ETB,
  ProductType.BOOSTER,
  ProductType.DISPLAY,
  ProductType.UPC,
  ProductType.COFFRET,
];

const availabilityOptions = [Availability.IN_STOCK, Availability.OUT_OF_STOCK];

const sortOptions = [
  { label: 'Plus récent', value: 'newest' },
  { label: 'Prix : croissant', value: 'price-asc' },
  { label: 'Prix : décroissant', value: 'price-desc' },
];

// Icône X pour supprimer les chips
const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function FilterBar({
  searchQuery,
  onSearchChange,
  selectedGameCategories,
  onGameCategoriesChange,
  selectedProductTypes,
  onProductTypesChange,
  selectedAvailability,
  onAvailabilityChange,
  sortBy,
  onSortChange,
  activeTab,
  onTabChange,
  onResetFilters,
}: FilterBarProps) {
  const [isGameCategoryOpen, setIsGameCategoryOpen] = useState(false);
  const [isProductTypeOpen, setIsProductTypeOpen] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
  };

  const handleGameCategoryToggle = (category: GameCategory) => {
    if (selectedGameCategories.includes(category)) {
      onGameCategoriesChange(selectedGameCategories.filter((c) => c !== category));
    } else {
      onGameCategoriesChange([...selectedGameCategories, category]);
    }
  };

  const handleProductTypeToggle = (type: ProductType) => {
    if (selectedProductTypes.includes(type)) {
      onProductTypesChange(selectedProductTypes.filter((t) => t !== type));
    } else {
      onProductTypesChange([...selectedProductTypes, type]);
    }
  };

  const handleAvailabilityToggle = (availability: Availability) => {
    if (selectedAvailability.includes(availability)) {
      onAvailabilityChange(selectedAvailability.filter((a) => a !== availability));
    } else {
      onAvailabilityChange([...selectedAvailability, availability]);
    }
  };

  const handleRemoveGameCategory = (category: GameCategory) => {
    onGameCategoriesChange(selectedGameCategories.filter((c) => c !== category));
  };

  const handleRemoveProductType = (type: ProductType) => {
    onProductTypesChange(selectedProductTypes.filter((t) => t !== type));
  };

  const handleRemoveAvailability = (availability: Availability) => {
    onAvailabilityChange(selectedAvailability.filter((a) => a !== availability));
  };

  const handleSortSelect = (sort: string) => {
    onSortChange(sort);
    setIsSortOpen(false);
  };

  const currentSortLabel = sortOptions.find((opt) => opt.value === sortBy)?.label || 'Plus récent';

  const hasActiveFilters =
    selectedGameCategories.length > 0 ||
    selectedProductTypes.length > 0 ||
    selectedAvailability.length > 0 ||
    searchQuery;

  return (
    <div className={styles.filterBar}>
      {/* Barre supérieure */}
      <div className={styles.upperBar}>
        {/* Champ de recherche */}
        <div className={styles.searchContainer}>
          <SearchIcon size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
        </div>

        {/* Menu déroulant Catégories de jeu (multi-select) */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.dropdownButton}
            onClick={() => {
              setIsGameCategoryOpen(!isGameCategoryOpen);
              setIsProductTypeOpen(false);
              setIsSortOpen(false);
            }}
          >
            <span>
              Catégorie{' '}
              {selectedGameCategories.length > 0 ? `(${selectedGameCategories.length})` : ''}
            </span>
            <ChevronDownIcon size={16} className={styles.chevronIcon} />
          </button>
          {isGameCategoryOpen && (
            <>
              <div
                className={styles.dropdownOverlay}
                onClick={() => setIsGameCategoryOpen(false)}
              />
              <div className={styles.dropdownMenu}>
                {gameCategories.map((category) => {
                  const isSelected = selectedGameCategories.includes(category);
                  return (
                    <label key={category} className={styles.dropdownItemCheckbox}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleGameCategoryToggle(category)}
                        className={styles.checkbox}
                      />
                      <span>{categoryLabels[category]}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Menu déroulant Type de produit (multi-select) */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.dropdownButton}
            onClick={() => {
              setIsProductTypeOpen(!isProductTypeOpen);
              setIsGameCategoryOpen(false);
              setIsAvailabilityOpen(false);
              setIsSortOpen(false);
            }}
          >
            <span>
              Type {selectedProductTypes.length > 0 ? `(${selectedProductTypes.length})` : ''}
            </span>
            <ChevronDownIcon size={16} className={styles.chevronIcon} />
          </button>
          {isProductTypeOpen && (
            <>
              <div className={styles.dropdownOverlay} onClick={() => setIsProductTypeOpen(false)} />
              <div className={styles.dropdownMenu}>
                {productTypes.map((type) => {
                  const isSelected = selectedProductTypes.includes(type);
                  return (
                    <label key={type} className={styles.dropdownItemCheckbox}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleProductTypeToggle(type)}
                        className={styles.checkbox}
                      />
                      <span>{productTypeLabels[type]}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Menu déroulant Disponibilité (multi-select) */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.dropdownButton}
            onClick={() => {
              setIsAvailabilityOpen(!isAvailabilityOpen);
              setIsGameCategoryOpen(false);
              setIsProductTypeOpen(false);
              setIsSortOpen(false);
            }}
          >
            <span>
              Disponibilité{' '}
              {selectedAvailability.length > 0 ? `(${selectedAvailability.length})` : ''}
            </span>
            <ChevronDownIcon size={16} className={styles.chevronIcon} />
          </button>
          {isAvailabilityOpen && (
            <>
              <div
                className={styles.dropdownOverlay}
                onClick={() => setIsAvailabilityOpen(false)}
              />
              <div className={styles.dropdownMenu}>
                {availabilityOptions.map((availability) => {
                  const isSelected = selectedAvailability.includes(availability);
                  return (
                    <label key={availability} className={styles.dropdownItemCheckbox}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleAvailabilityToggle(availability)}
                        className={styles.checkbox}
                      />
                      <span>{availabilityLabels[availability]}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Menu déroulant Tri */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.dropdownButton}
            onClick={() => {
              setIsSortOpen(!isSortOpen);
              setIsGameCategoryOpen(false);
              setIsProductTypeOpen(false);
              setIsAvailabilityOpen(false);
            }}
          >
            <span>{currentSortLabel}</span>
            <ChevronDownIcon size={16} className={styles.chevronIcon} />
          </button>
          {isSortOpen && (
            <>
              <div className={styles.dropdownOverlay} onClick={() => setIsSortOpen(false)} />
              <div className={styles.dropdownMenu}>
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.dropdownItem} ${sortBy === option.value ? styles.active : ''}`}
                    onClick={() => handleSortSelect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Zone des chips de filtres actifs et bouton réinitialiser */}
      {(hasActiveFilters || onResetFilters) && (
        <div className={styles.activeFiltersBar}>
          <div className={styles.activeFiltersChips}>
            {selectedGameCategories.map((category) => (
              <div key={category} className={styles.filterChip}>
                <span className={styles.chipLabel}>{categoryLabels[category]}</span>
                <button
                  className={styles.chipRemove}
                  onClick={() => handleRemoveGameCategory(category)}
                  aria-label={`Retirer ${categoryLabels[category]}`}
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
            {selectedProductTypes.map((type) => (
              <div key={type} className={styles.filterChip}>
                <span className={styles.chipLabel}>{productTypeLabels[type]}</span>
                <button
                  className={styles.chipRemove}
                  onClick={() => handleRemoveProductType(type)}
                  aria-label={`Retirer ${productTypeLabels[type]}`}
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
            {selectedAvailability.map((availability) => (
              <div key={availability} className={styles.filterChip}>
                <span className={styles.chipLabel}>{availabilityLabels[availability]}</span>
                <button
                  className={styles.chipRemove}
                  onClick={() => handleRemoveAvailability(availability)}
                  aria-label={`Retirer ${availabilityLabels[availability]}`}
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
            {searchQuery && (
              <div className={styles.filterChip}>
                <span className={styles.chipLabel}>"{searchQuery}"</span>
                <button
                  className={styles.chipRemove}
                  onClick={() => onSearchChange('')}
                  aria-label="Retirer la recherche"
                >
                  <CloseIcon />
                </button>
              </div>
            )}
          </div>
          {hasActiveFilters && onResetFilters && (
            <button className={styles.resetButton} onClick={onResetFilters}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Barre inférieure avec onglets */}
      <div className={styles.tabsBar}>
        <button
          className={`${styles.tab} ${activeTab === 'Tous' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('Tous')}
        >
          Tous
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'Produits phares' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('Produits phares')}
        >
          Produits phares
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'Nouveauté' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('Nouveauté')}
        >
          Nouveauté
        </button>
      </div>
    </div>
  );
}
