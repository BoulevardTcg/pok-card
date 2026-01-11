import { useState, useEffect } from 'react';
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
  selectedPriceRange: { min: number | null; max: number | null };
  onPriceRangeChange: (range: { min: number | null; max: number | null }) => void;
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
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

const pricePresets = [
  { label: 'Tous les prix', value: 'all' },
  { label: '0€ - 20€', value: '0-20' },
  { label: '20€ - 50€', value: '20-50' },
  { label: '50€ - 100€', value: '50-100' },
  { label: '100€ et plus', value: '100+' },
];

const languageOptions = [
  { label: 'Français', value: 'fr', flag: '🇫🇷' },
  { label: 'Anglais', value: 'en', flag: '🇬🇧' },
  { label: 'Japonais', value: 'jp', flag: '🇯🇵' },
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
  selectedPriceRange,
  onPriceRangeChange,
  selectedLanguages,
  onLanguagesChange,
  activeTab,
  onTabChange,
  onResetFilters,
}: FilterBarProps) {
  const [isGameCategoryOpen, setIsGameCategoryOpen] = useState(false);
  const [isProductTypeOpen, setIsProductTypeOpen] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  
  // État local pour le slider de prix (en euros)
  const [customPriceRange, setCustomPriceRange] = useState<[number, number]>(() => {
    // Initialiser depuis selectedPriceRange si présent
    if (selectedPriceRange.min !== null || selectedPriceRange.max !== null) {
      const min = selectedPriceRange.min !== null ? Math.floor(selectedPriceRange.min / 100) : 0;
      const max = selectedPriceRange.max !== null ? Math.floor(selectedPriceRange.max / 100) : 500;
      return [min, max];
    }
    return [0, 500];
  });
  
  const [selectedPricePreset, setSelectedPricePreset] = useState<string>(() => {
    // Déterminer le preset actif depuis selectedPriceRange
    if (selectedPriceRange.min === null && selectedPriceRange.max === null) return 'all';
    const min = selectedPriceRange.min !== null ? selectedPriceRange.min : 0;
    const max = selectedPriceRange.max !== null ? selectedPriceRange.max : 50000;
    
    if (min === 0 && max === 2000) return '0-20';
    if (min === 2000 && max === 5000) return '20-50';
    if (min === 5000 && max === 10000) return '50-100';
    if (min === 10000 && max === null) return '100+';
    return 'custom';
  });
  
  // Synchroniser customPriceRange avec selectedPriceRange quand il change depuis l'extérieur
  useEffect(() => {
    if (selectedPriceRange.min === null && selectedPriceRange.max === null) {
      // Pas de filtre actif
      setSelectedPricePreset('all');
      setCustomPriceRange([0, 500]);
      return;
    }
    
    const minEuros = selectedPriceRange.min !== null ? Math.floor(selectedPriceRange.min / 100) : 0;
    const maxEuros = selectedPriceRange.max !== null ? Math.floor(selectedPriceRange.max / 100) : 500;
    
    // Vérifier si cela correspond à un preset
    if (selectedPriceRange.min === 0 && selectedPriceRange.max === 2000) {
      setSelectedPricePreset('0-20');
      setCustomPriceRange([0, 20]);
    } else if (selectedPriceRange.min === 2000 && selectedPriceRange.max === 5000) {
      setSelectedPricePreset('20-50');
      setCustomPriceRange([20, 50]);
    } else if (selectedPriceRange.min === 5000 && selectedPriceRange.max === 10000) {
      setSelectedPricePreset('50-100');
      setCustomPriceRange([50, 100]);
    } else if (selectedPriceRange.min === 10000 && selectedPriceRange.max === null) {
      setSelectedPricePreset('100+');
      setCustomPriceRange([100, 500]);
    } else {
      // Plage personnalisée
      setSelectedPricePreset('custom');
      setCustomPriceRange([minEuros, maxEuros]);
    }
     
  }, [selectedPriceRange.min, selectedPriceRange.max]);

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

  // Handlers pour le filtre Prix
  const handlePricePresetChange = (preset: string) => {
    setSelectedPricePreset(preset);
    
    if (preset === 'all') {
      onPriceRangeChange({ min: null, max: null });
      setCustomPriceRange([0, 500]);
    } else if (preset === '0-20') {
      onPriceRangeChange({ min: 0, max: 2000 }); // 20€ en centimes
      setCustomPriceRange([0, 20]);
    } else if (preset === '20-50') {
      onPriceRangeChange({ min: 2000, max: 5000 }); // 20-50€ en centimes
      setCustomPriceRange([20, 50]);
    } else if (preset === '50-100') {
      onPriceRangeChange({ min: 5000, max: 10000 }); // 50-100€ en centimes
      setCustomPriceRange([50, 100]);
    } else if (preset === '100+') {
      onPriceRangeChange({ min: 10000, max: null }); // 100€+ en centimes
      setCustomPriceRange([100, 500]);
    }
  };

  const handleMinPriceChange = (value: string | number) => {
    const newMin = Math.min(Number(value), customPriceRange[1] - 5);
    setCustomPriceRange([newMin, customPriceRange[1]]);
    setSelectedPricePreset('custom');
  };

  const handleMaxPriceChange = (value: string | number) => {
    const newMax = Math.max(Number(value), customPriceRange[0] + 5);
    setCustomPriceRange([customPriceRange[0], newMax]);
    setSelectedPricePreset('custom');
  };

  const applyCustomPrice = () => {
    onPriceRangeChange({
      min: customPriceRange[0] * 100, // Convertir en centimes
      max: customPriceRange[1] * 100,
    });
    setIsPriceOpen(false);
  };

  // Handlers pour le filtre Langue
  const handleLanguageToggle = (language: string) => {
    if (selectedLanguages.includes(language)) {
      onLanguagesChange(selectedLanguages.filter((l) => l !== language));
    } else {
      onLanguagesChange([...selectedLanguages, language]);
    }
  };

  const handleRemoveLanguage = (language: string) => {
    onLanguagesChange(selectedLanguages.filter((l) => l !== language));
  };

  const handleRemovePriceFilter = () => {
    onPriceRangeChange({ min: null, max: null });
    setSelectedPricePreset('all');
    setCustomPriceRange([0, 500]);
  };


  const hasActiveFilters =
    selectedGameCategories.length > 0 ||
    selectedProductTypes.length > 0 ||
    selectedAvailability.length > 0 ||
    selectedLanguages.length > 0 ||
    (selectedPriceRange.min !== null || selectedPriceRange.max !== null) ||
    searchQuery;

  // Calculer le pourcentage pour le slider
  const minPercent = (customPriceRange[0] / 500) * 100;
  const maxPercent = (customPriceRange[1] / 500) * 100;

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
              setIsAvailabilityOpen(false);
              setIsPriceOpen(false);
              setIsLanguageOpen(false);
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
              setIsPriceOpen(false);
              setIsLanguageOpen(false);
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
              setIsPriceOpen(false);
              setIsLanguageOpen(false);
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

        {/* Menu déroulant Prix */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.dropdownButton}
            onClick={() => {
              setIsPriceOpen(!isPriceOpen);
              setIsGameCategoryOpen(false);
              setIsProductTypeOpen(false);
              setIsAvailabilityOpen(false);
              setIsLanguageOpen(false);
            }}
          >
            <span>
              Prix{' '}
              {selectedPriceRange.min !== null || selectedPriceRange.max !== null ? '(1)' : ''}
            </span>
            <ChevronDownIcon size={16} className={styles.chevronIcon} />
          </button>
          {isPriceOpen && (
            <>
              <div className={styles.dropdownOverlay} onClick={() => setIsPriceOpen(false)} />
              <div className={styles.dropdownMenu} style={{ minWidth: '280px', padding: '12px' }}>
                {/* Presets */}
                <div className={styles.pricePresets}>
                  {pricePresets.map((preset) => (
                    <label key={preset.value} className={styles.pricePresetOption}>
                      <input
                        type="radio"
                        name="pricePreset"
                        value={preset.value}
                        checked={selectedPricePreset === preset.value}
                        onChange={() => handlePricePresetChange(preset.value)}
                      />
                      <span>{preset.label}</span>
                    </label>
                  ))}
                </div>

                {/* Divider */}
                <div className={styles.divider} />

                {/* Custom Price Section */}
                <div className={styles.customPriceSection}>
                  <div className={styles.sectionTitle}>Prix personnalisé</div>

                  {/* Slider */}
                  <div className={styles.priceRangeSlider}>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="5"
                      value={customPriceRange[0]}
                      onChange={(e) => handleMinPriceChange(e.target.value)}
                      className={styles.sliderMin}
                    />
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="5"
                      value={customPriceRange[1]}
                      onChange={(e) => handleMaxPriceChange(e.target.value)}
                      className={styles.sliderMax}
                    />
                    <div className={styles.sliderTrack}>
                      <div
                        className={styles.sliderRange}
                        style={{
                          left: `${minPercent}%`,
                          right: `${100 - maxPercent}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Price Inputs */}
                  <div className={styles.priceLabels}>
                    <div className={styles.priceInput}>
                      <label>Min</label>
                      <div className={styles.priceInputWrapper}>
                        <input
                          type="number"
                          min="0"
                          max={customPriceRange[1]}
                          value={customPriceRange[0]}
                          onChange={(e) => handleMinPriceChange(e.target.value)}
                        />
                        <span>€</span>
                      </div>
                    </div>

                    <span className={styles.separator}>-</span>

                    <div className={styles.priceInput}>
                      <label>Max</label>
                      <div className={styles.priceInputWrapper}>
                        <input
                          type="number"
                          min={customPriceRange[0]}
                          max="500"
                          value={customPriceRange[1]}
                          onChange={(e) => handleMaxPriceChange(e.target.value)}
                        />
                        <span>€</span>
                      </div>
                    </div>
                  </div>

                  <button className={styles.applyButton} onClick={applyCustomPrice}>
                    Appliquer
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Menu déroulant Langue */}
        <div className={styles.dropdownContainer}>
          <button
            className={styles.dropdownButton}
            onClick={() => {
              setIsLanguageOpen(!isLanguageOpen);
              setIsGameCategoryOpen(false);
              setIsProductTypeOpen(false);
              setIsAvailabilityOpen(false);
              setIsPriceOpen(false);
            }}
          >
            <span>
              Langue{' '}
              {selectedLanguages.length > 0 ? `(${selectedLanguages.length})` : ''}
            </span>
            <ChevronDownIcon size={16} className={styles.chevronIcon} />
          </button>
          {isLanguageOpen && (
            <>
              <div className={styles.dropdownOverlay} onClick={() => setIsLanguageOpen(false)} />
              <div className={styles.dropdownMenu}>
                {languageOptions.map((lang) => {
                  const isSelected = selectedLanguages.includes(lang.value);
                  return (
                    <label key={lang.value} className={styles.dropdownItemCheckbox}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleLanguageToggle(lang.value)}
                        className={styles.checkbox}
                      />
                      <span className={styles.languageLabel}>
                        <span className={styles.flag}>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </span>
                    </label>
                  );
                })}
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
            {(selectedPriceRange.min !== null || selectedPriceRange.max !== null) && (
              <div className={styles.filterChip}>
                <span className={styles.chipLabel}>
                  Prix:{' '}
                  {selectedPriceRange.min !== null
                    ? `${Math.floor(selectedPriceRange.min / 100)}€`
                    : '0€'}
                  {' - '}
                  {selectedPriceRange.max !== null
                    ? `${Math.floor(selectedPriceRange.max / 100)}€`
                    : '500€'}
                </span>
                <button
                  className={styles.chipRemove}
                  onClick={handleRemovePriceFilter}
                  aria-label="Retirer le filtre prix"
                >
                  <CloseIcon />
                </button>
              </div>
            )}
            {selectedLanguages.map((lang) => {
              const langOption = languageOptions.find((l) => l.value === lang);
              if (!langOption) return null;
              return (
                <div key={lang} className={styles.filterChip}>
                  <span className={styles.chipLabel}>
                    {langOption.flag} {langOption.label}
                  </span>
                  <button
                    className={styles.chipRemove}
                    onClick={() => handleRemoveLanguage(lang)}
                    aria-label={`Retirer ${langOption.label}`}
                  >
                    <CloseIcon />
                  </button>
                </div>
              );
            })}
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
