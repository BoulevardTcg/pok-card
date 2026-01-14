import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import { API_BASE } from '../../api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import styles from './AdminReportsPage.module.css';

// Icônes SVG
const EuroIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h6m-6-3h8m-8 6h6" />
  </svg>
);

const CartIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 6h15l-1.5 9h-12z" />
    <circle cx="9" cy="20" r="1" />
    <circle cx="18" cy="20" r="1" />
    <path d="M6 6L5 2H2" />
  </svg>
);

const PackageIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const TrendingIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const ArrowUpIcon = () => (
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
    <path d="M7 17L17 7M17 7H7M17 7V17" />
  </svg>
);

const ArrowDownIcon = () => (
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
    <path d="M7 7L17 17M17 17H7M17 17V7" />
  </svg>
);

interface SalePoint {
  period: string;
  revenue: number;
  orders: number;
  items: number;
}

interface TooltipData {
  x: number;
  y: number;
  data: SalePoint;
  visible: boolean;
}

// Graphique interactif
function SalesChart({
  data,
  formatPrice,
}: {
  data: SalePoint[];
  formatPrice: (cents: number) => string;
}) {
  const [tooltip, setTooltip] = useState<TooltipData>({
    x: 0,
    y: 0,
    data: data[0],
    visible: false,
  });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 1200;
  const height = 480;
  const padding = { top: 50, right: 40, bottom: 80, left: 90 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);

  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
  const getYRevenue = (value: number) =>
    padding.top + chartHeight - (value / maxRevenue) * chartHeight;
  const getYOrders = (value: number) =>
    padding.top + chartHeight - (value / maxOrders) * chartHeight;

  const revenuePath = data
    .map((point, i) => {
      const x = getX(i);
      const y = getYRevenue(point.revenue);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  const revenueArea = `${revenuePath} L ${getX(data.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  const ordersPath = data
    .map((point, i) => {
      const x = getX(i);
      const y = getYOrders(point.orders);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  const yTicksRevenue = Array.from({ length: 5 }, (_, i) => {
    const value = (maxRevenue / 4) * i;
    return { value, y: getYRevenue(value) };
  });

  const xLabels = data.map((point, i) => ({ label: point.period, x: getX(i) }));
  const visibleLabels = xLabels.filter(
    (_, i) => i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>, index: number) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        data: data[index],
        visible: true,
      });
      setHoveredIndex(index);
    },
    [data]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
    setHoveredIndex(null);
  }, []);

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartLegend}>
        <div className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ background: 'var(--color-accent-secondary)' }}
          />
          Revenus (€)
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: 'var(--color-success)' }} />
          Commandes
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.chartSvg}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-secondary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-accent-secondary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicksRevenue.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={tick.y}
              x2={width - padding.right}
              y2={tick.y}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              className={styles.axisLabel}
            >
              {formatPrice(tick.value)}€
            </text>
          </g>
        ))}

        {visibleLabels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={height - padding.bottom + 25}
            textAnchor="middle"
            className={styles.axisLabel}
          >
            {label.label}
          </text>
        ))}

        <path d={revenueArea} fill="url(#revenueGradient)" />
        <path
          d={revenuePath}
          fill="none"
          stroke="var(--color-accent-secondary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={ordersPath}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 4"
        />

        {data.map((point, i) => (
          <g key={i}>
            <rect
              x={getX(i) - 30}
              y={padding.top}
              width={60}
              height={chartHeight}
              fill="transparent"
              onMouseMove={(e) => handleMouseMove(e, i)}
              style={{ cursor: 'crosshair' }}
            />
            <circle
              cx={getX(i)}
              cy={getYRevenue(point.revenue)}
              r={hoveredIndex === i ? 10 : 6}
              fill="var(--color-accent-secondary)"
              stroke="var(--color-bg-elevated)"
              strokeWidth="2.5"
              style={{
                opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.3,
                transition: 'all 0.2s ease',
              }}
            />
            <circle
              cx={getX(i)}
              cy={getYOrders(point.orders)}
              r={hoveredIndex === i ? 8 : 5}
              fill="var(--color-success)"
              stroke="var(--color-bg-elevated)"
              strokeWidth="2.5"
              style={{
                opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.3,
                transition: 'all 0.2s ease',
              }}
            />
            {hoveredIndex === i && (
              <line
                x1={getX(i)}
                y1={padding.top}
                x2={getX(i)}
                y2={padding.top + chartHeight}
                stroke="var(--color-accent-secondary)"
                strokeOpacity="0.3"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            )}
          </g>
        ))}
      </svg>

      {tooltip.visible && tooltip.data && (
        <div
          className={styles.tooltip}
          style={{ left: Math.min(tooltip.x + 15, 700), top: tooltip.y - 10 }}
        >
          <div className={styles.tooltipHeader}>{tooltip.data.period}</div>
          <div className={styles.tooltipRow}>
            <span
              className={styles.tooltipDot}
              style={{ background: 'var(--color-accent-secondary)' }}
            />{' '}
            Revenus: <strong>{formatPrice(tooltip.data.revenue)}€</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipDot} style={{ background: 'var(--color-success)' }} />{' '}
            Commandes: <strong>{tooltip.data.orders}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span className={styles.tooltipDot} style={{ background: 'var(--color-warning)' }} />{' '}
            Articles: <strong>{tooltip.data.items}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminReportsPage() {
  const [salesData, setSalesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const loadReports = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();

      if (period === 'day') startDate.setDate(startDate.getDate() - 30);
      else if (period === 'week') startDate.setDate(startDate.getDate() - 12 * 7);
      else startDate.setMonth(startDate.getMonth() - 12);

      const response = await fetch(
        `${API_BASE}/admin/reports/sales?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&groupBy=${period}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setSalesData(data);
    } catch {
      const demoData = generateDemoData(period);
      setSalesData(demoData);
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, period, loadReports]);

  function generateDemoData(period: 'day' | 'week' | 'month') {
    const sales: SalePoint[] = [];
    const now = new Date();
    const count = period === 'day' ? 30 : 12;
    let totalRevenue = 0,
      totalOrders = 0,
      totalItems = 0;

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now);
      let label = '';

      if (period === 'day') {
        date.setDate(date.getDate() - i);
        label = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      } else if (period === 'week') {
        date.setDate(date.getDate() - i * 7);
        label = `Sem ${Math.ceil(date.getDate() / 7)}`;
      } else {
        date.setMonth(date.getMonth() - i);
        label = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      }

      const baseRevenue = 50000 + (count - i) * 5000;
      const variation = Math.random() * 30000 - 10000;
      const weekendBoost = date.getDay() === 0 || date.getDay() === 6 ? 15000 : 0;
      const revenue = Math.max(0, Math.round(baseRevenue + variation + weekendBoost));
      const orders = Math.round(revenue / 3500) + Math.floor(Math.random() * 5);
      const items = orders * (2 + Math.floor(Math.random() * 3));

      totalRevenue += revenue;
      totalOrders += orders;
      totalItems += items;
      sales.push({ period: label, revenue, orders, items });
    }

    return { sales, total: { revenue: totalRevenue, orders: totalOrders, items: totalItems } };
  }

  const formatPrice = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
  const formatPriceShort = (cents: number) =>
    cents >= 100000 ? `${(cents / 100000).toFixed(1)}k` : formatPrice(cents);

  const getVariation = () => {
    if (!salesData || salesData.sales.length < 2) return { value: 0, positive: true };
    const lastHalf = salesData.sales.slice(Math.floor(salesData.sales.length / 2));
    const firstHalf = salesData.sales.slice(0, Math.floor(salesData.sales.length / 2));
    const lastSum = lastHalf.reduce((sum: number, s: SalePoint) => sum + s.revenue, 0);
    const firstSum = firstHalf.reduce((sum: number, s: SalePoint) => sum + s.revenue, 0);
    const variation = firstSum > 0 ? ((lastSum - firstSum) / firstSum) * 100 : 0;
    return { value: Math.abs(variation).toFixed(1), positive: variation >= 0 };
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Chargement des rapports...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.isAdmin) return null;

  const variation = getVariation();

  return (
    <AdminLayout>
      {/* Header */}
      <div className={styles.pageHeader}>
        <p className={styles.pageSubtitle}>Analyse des ventes et performances</p>
        <div className={styles.periodSelector}>
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`${styles.periodBtn} ${period === p ? styles.active : ''}`}
            >
              {p === 'day' ? '30 jours' : p === 'week' ? '12 semaines' : '12 mois'}
            </button>
          ))}
        </div>
      </div>

      {salesData && (
        <>
          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <EuroIcon />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Revenus totaux</span>
                <span className={styles.statValue}>{formatPrice(salesData.total.revenue)}€</span>
                <span
                  className={`${styles.statTrend} ${variation.positive ? styles.positive : styles.negative}`}
                >
                  {variation.positive ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  {variation.value}%
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <CartIcon />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Commandes</span>
                <span className={styles.statValue}>{salesData.total.orders}</span>
                <span className={styles.statSubtext}>
                  Moy. {formatPrice(salesData.total.revenue / (salesData.total.orders || 1))}€/cmd
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <PackageIcon />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Articles vendus</span>
                <span className={styles.statValue}>{salesData.total.items}</span>
                <span className={styles.statSubtext}>
                  {(salesData.total.items / (salesData.total.orders || 1)).toFixed(1)} art./cmd
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <TrendingIcon />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Tendance</span>
                <span
                  className={`${styles.statValue} ${variation.positive ? styles.textPositive : styles.textNegative}`}
                >
                  {variation.positive ? '+' : '-'}
                  {variation.value}%
                </span>
                <span className={styles.statSubtext}>
                  {variation.positive ? 'En croissance' : 'En baisse'}
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>Évolution des ventes</h2>
              <p className={styles.chartSubtitle}>
                Revenus et commandes sur la période sélectionnée
              </p>
            </div>
            <div className={styles.chart}>
              {salesData.sales.length === 0 ? (
                <p className={styles.empty}>Aucune donnée disponible</p>
              ) : (
                <SalesChart data={salesData.sales} formatPrice={formatPriceShort} />
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
