import { useCallback, useEffect, useRef, useState } from 'react';
import { searchParcelPoints, type ParcelPoint } from '../api';
import styles from './ParcelPointSelector.module.css';

type ParcelPointSelectorProps = {
  // Préremplissage depuis l'adresse de livraison saisie
  defaultPostalCode?: string;
  defaultCity?: string;
  selected: ParcelPoint | null;
  onSelect: (point: ParcelPoint | null) => void;
};

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mer',
  THURSDAY: 'Jeu',
  FRIDAY: 'Ven',
  SATURDAY: 'Sam',
  SUNDAY: 'Dim',
};

function formatDistance(meters?: number) {
  if (typeof meters !== 'number') return null;
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatAddress(point: ParcelPoint) {
  const line = [point.address.number, point.address.street].filter(Boolean).join(' ');
  const cityLine = [point.address.postalCode, point.address.city].filter(Boolean).join(' ');
  return [line, cityLine].filter(Boolean).join(', ');
}

export function ParcelPointSelector({
  defaultPostalCode,
  defaultCity,
  selected,
  onSelect,
}: ParcelPointSelectorProps) {
  const [postalCode, setPostalCode] = useState(defaultPostalCode || '');
  const [city, setCity] = useState(defaultCity || '');
  const [points, setPoints] = useState<ParcelPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const autoSearchRanRef = useRef(false);

  const runSearch = useCallback(async (searchPostalCode: string, searchCity: string) => {
    const trimmedPostalCode = searchPostalCode.trim();
    if (trimmedPostalCode.length < 2) {
      setError('Veuillez renseigner un code postal.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const results = await searchParcelPoints({
        postalCode: trimmedPostalCode,
        city: searchCity.trim() || undefined,
      });
      setPoints(results);
      setSearched(true);
      if (results.length === 0) {
        setError('Aucun point relais trouvé autour de cette adresse.');
      }
    } catch {
      setError('La recherche de points relais a échoué. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Recherche automatique à l'affichage si le code postal est déjà connu
  useEffect(() => {
    if (autoSearchRanRef.current) return;
    if (!defaultPostalCode || defaultPostalCode.trim().length < 4) return;
    autoSearchRanRef.current = true;
    runSearch(defaultPostalCode, defaultCity || '');
  }, [defaultPostalCode, defaultCity, runSearch]);

  return (
    <div className={styles.selector}>
      <p className={styles.title}>Choisissez votre point relais</p>

      {selected && (
        <div className={styles.selectedBox}>
          <div>
            <div className={styles.selectedName}>{selected.name}</div>
            <div className={styles.selectedAddress}>{formatAddress(selected)}</div>
          </div>
          <button type="button" className={styles.changeButton} onClick={() => onSelect(null)}>
            Changer
          </button>
        </div>
      )}

      {!selected && (
        <>
          <div className={styles.searchRow}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Code postal"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className={styles.searchInput}
              aria-label="Code postal du point relais"
            />
            <input
              type="text"
              placeholder="Ville (optionnel)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={styles.searchInput}
              aria-label="Ville du point relais"
            />
            <button
              type="button"
              className={styles.searchButton}
              disabled={loading}
              onClick={() => runSearch(postalCode, city)}
            >
              {loading ? 'Recherche…' : 'Rechercher'}
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {points.length > 0 && (
            <ul className={styles.pointList}>
              {points.map((point) => {
                const distance = formatDistance(point.distanceMeters);
                return (
                  <li key={point.code}>
                    <button
                      type="button"
                      className={styles.pointItem}
                      onClick={() => onSelect(point)}
                    >
                      <span className={styles.pointHeader}>
                        <span className={styles.pointName}>{point.name}</span>
                        {distance && <span className={styles.pointDistance}>{distance}</span>}
                      </span>
                      <span className={styles.pointAddress}>{formatAddress(point)}</span>
                      {point.openingDays && (
                        <span className={styles.pointHours}>
                          {Object.entries(point.openingDays)
                            .filter(([, periods]) => periods.length > 0)
                            .slice(0, 7)
                            .map(
                              ([day, periods]) =>
                                `${DAY_LABELS[day] || day} ${periods
                                  .map((p) => `${p.open}–${p.close}`)
                                  .join(', ')}`
                            )
                            .join(' · ')}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!searched && !loading && !error && (
            <p className={styles.hint}>
              Renseignez votre code postal pour afficher les points relais proches de chez vous.
            </p>
          )}
        </>
      )}
    </div>
  );
}
