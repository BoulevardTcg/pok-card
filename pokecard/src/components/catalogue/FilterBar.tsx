import { useState } from 'react';
import { SearchIcon, ChevronDownIcon } from '../icons/Icons';
import styles from './FilterBar.module.css';
import { GameCategory, ProductType, categoryLabels, productTypeLabels } from '../../utils/filters';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedGameCategories: GameCategory[];
  onGameCategoriesChange: (categories: GameCategory[]) => void;
  selectedProductTypes: ProductType[];
  onProductTypesChange: (types: ProductType[]) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  activeTab: 'Tous' | 'Produits phares' | 'Nouveauté';
  onTabChange: (tab: 'Tous' | 'Produits phares' | 'Nouveauté') => void;
  viewMode?: 'grid-2x2' | 'grid-3col' | 'list' | 'list-compact';
  onViewModeChange?: (mode: 'grid-2x2' | 'grid-3col' | 'list' | 'list-compact') => void;
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

const sortOptions = [
  { label: 'Populaires', value: 'popular' },
  { label: 'Plus récent', value: 'newest' },
  { label: 'Prix : croissant', value: 'price-asc' },
  { label: 'Prix : décroissant', value: 'price-desc' },
];

// Icônes pour les modes d'affichage
const Grid2x2Icon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const Grid3ColIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="5" height="18" rx="1" />
    <rect x="9.5" y="3" width="5" height="18" rx="1" />
    <rect x="16" y="3" width="5" height="18" rx="1" />
  </svg>
);

const ListIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const ListCompactIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="5" x2="21" y2="5" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="13" x2="21" y2="13" />
    <line x1="3" y1="17" x2="21" y2="17" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
);

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
  sortBy,
  onSortChange,
  activeTab,
  onTabChange,
  viewMode = 'grid-2x2',
  onViewModeChange,
  onResetFilters,
}: FilterBarProps) {
  const [isGameCategoryOpen, setIsGameCategoryOpen] = useState(false);
  const [isProductTypeOpen, setIsProductTypeOpen] = useState(false);
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

  const handleRemoveGameCategory = (category: GameCategory) => {
    onGameCategoriesChange(selectedGameCategories.filter((c) => c !== category));
  };

  const handleRemoveProductType = (type: ProductType) => {
    onProductTypesChange(selectedProductTypes.filter((t) => t !== type));
  };

  const handleSortSelect = (sort: string) => {
    onSortChange(sort);
    setIsSortOpen(false);
  };

  const currentSortLabel = sortOptions.find((opt) => opt.value === sortBy)?.label || 'Populaires';

  const hasActiveFilters =
    selectedGameCategories.length > 0 || selectedProductTypes.length > 0 || searchQuery;

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

        {/* Menu déroulant Tri */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.dropdownButton}
            onClick={() => {
              setIsSortOpen(!isSortOpen);
              setIsGameCategoryOpen(false);
              setIsProductTypeOpen(false);
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

        {/* Sélecteur de mode d'affichage */}
        {onViewModeChange && (
          <div className={styles.viewModeContainer}>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'grid-2x2' ? styles.active : ''}`}
              onClick={() => onViewModeChange('grid-2x2')}
              title="Grille 2x2"
            >
              <Grid2x2Icon />
            </button>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'grid-3col' ? styles.active : ''}`}
              onClick={() => onViewModeChange('grid-3col')}
              title="Grille 3 colonnes"
            >
              <Grid3ColIcon />
            </button>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => onViewModeChange('list')}
              title="Liste"
            >
              <ListIcon />
            </button>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'list-compact' ? styles.active : ''}`}
              onClick={() => onViewModeChange('list-compact')}
              title="Liste compacte"
            >
              <ListCompactIcon />
            </button>
          </div>
        )}
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
