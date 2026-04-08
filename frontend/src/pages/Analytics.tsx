import { useEffect, useState } from 'react'
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import { TrendingUp, TrendingDown, Package, DollarSign, Clock, Users } from 'lucide-react'
import { dashboardApi } from '../services/api'

// ── Colour palettes ────────────────────────────────────────────────
const BLUE   = '#248FCE'
const ORANGE = '#E25D2D'
const GREEN  = '#4CAF50'
const RED    = '#F44336'
const YELLOW = '#FFC107'
const PURPLE = '#9C27B0'
const TEAL   = '#009688'

const STATUS_COLORS: Record<string, string> = {
  created:          BLUE,
  on_sea:           '#1E7BB3',
  arrived_mombasa:  ORANGE,
  discharged:       YELLOW,
  documents_ready:  TEAL,
  payment_pending:  '#E25D2D',
  payment_received: GREEN,
  cleared:          '#4CAF50',
  in_transit:       '#6BBCE4',
  at_warehouse:     PURPLE,
  delivered:        '#00BCD4',
  completed:        '#388E3C',
}

const STATUS_LABELS: Record<string, string> = {
  created: 'Created', on_sea: 'On Sea', arrived_mombasa: 'Arrived',
  discharged: 'Discharged', documents_ready: 'Docs Ready',
  payment_pending: 'Payment Due', payment_received: 'Paid',
  cleared: 'Cleared', in_transit: 'In Transit',
  at_warehouse: 'Warehouse', delivered: 'Delivered', completed: 'Completed',
}

const INVOICE_COLORS: Record<string, string> = {
  paid: GREEN, issued: BLUE, pending: YELLOW, overdue: RED, cancelled: '#9E9E9E', draft: '#BDBDBD',
}

// ── Format helpers ─────────────────────────────────────────────────
const fmtMonth = (ym: string) => {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return new Date(+y, +m - 1).toLocaleString('default', { month: 'short', year: '2-digit' })
}

const fmtUSD = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000   ? `$${(v / 1_000).toFixed(1)}K`
  : `$${v}`

// ── Reusable card ──────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5">
    <div className="mb-4">
      <h3 className="font-bold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
)

// ── KPI card ───────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon: Icon, trend, color }: {
  label: string; value: string | number; sub: string;
  icon: any; trend?: 'up' | 'down' | 'neutral'; color: string
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <div className="flex items-center mt-1.5 space-x-1">
          {trend === 'up'   && <TrendingUp   className="w-3 h-3 text-green-500 flex-shrink-0" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500 flex-shrink-0" />}
          <p className="text-xs text-gray-400 truncate">{sub}</p>
        </div>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3" style={{ backgroundColor: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
    </div>
  </div>
)

// ── Custom tooltip ─────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{fmtMonth(label) || label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            <span className="text-gray-500">{p.name}</span>
          </span>
          <span className="font-semibold text-gray-900">
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────
const Analytics = () => {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    dashboardApi.getAnalytics()
      .then(res => setData(res.data.data))
      .catch(() => setError('Failed to load analytics data.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-72 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">{error}</p>
      </div>
    )
  }

  // ── Derived KPIs ─────────────────────────────────────────────────
  const totalShipments = data.statusDistribution.reduce((s: number, x: any) => s + x.count, 0)
  const completed = data.statusDistribution.find((x: any) => x._id === 'completed')?.count ?? 0
  const completionRate = totalShipments > 0 ? Math.round((completed / totalShipments) * 100) : 0

  const invoiceMap: Record<string, { count: number; total: number }> = {}
  data.invoiceHealth.forEach((x: any) => { invoiceMap[x._id] = { count: x.count, total: x.total } })
  const totalRevenue = invoiceMap['paid']?.total ?? 0
  const overdueAmount = invoiceMap['overdue']?.total ?? 0
  const overdueCount = invoiceMap['overdue']?.count ?? 0

  const lastTwoMonths = data.shipmentTrend.slice(-2)
  const shipmentGrowth = lastTwoMonths.length === 2 && lastTwoMonths[0].created > 0
    ? Math.round(((lastTwoMonths[1].created - lastTwoMonths[0].created) / lastTwoMonths[0].created) * 100)
    : 0

  const kpis = [
    {
      label: 'Total Shipments',
      value: totalShipments,
      sub: `${completionRate}% completion rate`,
      icon: Package,
      trend: 'neutral' as const,
      color: BLUE,
    },
    {
      label: 'Total Revenue',
      value: fmtUSD(totalRevenue),
      sub: 'From paid invoices',
      icon: DollarSign,
      trend: 'up' as const,
      color: GREEN,
    },
    {
      label: 'Overdue Invoices',
      value: overdueCount,
      sub: `${fmtUSD(overdueAmount)} outstanding`,
      icon: DollarSign,
      trend: overdueCount > 0 ? 'down' as const : 'neutral' as const,
      color: overdueCount > 0 ? RED : GREEN,
    },
    {
      label: 'Monthly Growth',
      value: `${shipmentGrowth > 0 ? '+' : ''}${shipmentGrowth}%`,
      sub: 'Shipments vs prior month',
      icon: TrendingUp,
      trend: shipmentGrowth >= 0 ? 'up' as const : 'down' as const,
      color: shipmentGrowth >= 0 ? GREEN : RED,
    },
  ]

  // ── Enrich status distribution for pie ───────────────────────────
  const statusPieData = data.statusDistribution.map((x: any) => ({
    name: STATUS_LABELS[x._id] || x._id,
    value: x.count,
    color: STATUS_COLORS[x._id] || '#9E9E9E',
  }))

  // ── Invoice health pie ────────────────────────────────────────────
  const invoicePieData = data.invoiceHealth.map((x: any) => ({
    name: x._id.charAt(0).toUpperCase() + x._id.slice(1),
    value: x.total,
    count: x.count,
    color: INVOICE_COLORS[x._id] || '#9E9E9E',
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-400 text-sm mt-0.5">Company performance & growth insights</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Row 2: Shipment Volume + Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <ChartCard title="Shipment Volume" subtitle="New vs completed shipments — last 12 months">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.shipmentTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={BLUE}   stopOpacity={0.2} />
                  <stop offset="95%" stopColor={BLUE}   stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GREEN}  stopOpacity={0.2} />
                  <stop offset="95%" stopColor={GREEN}  stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="created"   name="Created"   stroke={BLUE}  fill="url(#gradCreated)"   strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke={GREEN} fill="url(#gradCompleted)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue vs Overdue" subtitle="Monthly paid revenue and overdue invoice value">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.revenueTrend} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => fmtUSD(v)} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip formatter={(v: number) => fmtUSD(v)} />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue"  fill={GREEN}  radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="overdue" name="Overdue"  fill={RED}    radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Status Distribution + Invoice Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <ChartCard title="Shipment Status Distribution" subtitle="Current pipeline breakdown">
          <div className="flex items-center">
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  dataKey="value" paddingAngle={2}>
                  {statusPieData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 text-xs min-w-0">
              {statusPieData.map((entry: any) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-gray-500 truncate">{entry.name}</span>
                  </span>
                  <span className="font-semibold text-gray-800 ml-2">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Invoice Health" subtitle="Revenue breakdown by invoice status">
          <div className="flex items-center">
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie data={invoicePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  dataKey="value" paddingAngle={2}>
                  {invoicePieData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [fmtUSD(v as number), n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 text-xs min-w-0">
              {invoicePieData.map((entry: any) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-gray-500 truncate">{entry.name}</span>
                  </span>
                  <span className="font-semibold text-gray-800 ml-2">{fmtUSD(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Row 4: Top Clients + Transit Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <ChartCard title="Top Clients by Volume" subtitle="Shipments per client — all time">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data.topClients.map((c: any) => ({ name: c.name, shipments: c.count }))}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="shipments" name="Shipments" fill={BLUE} radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg Transit Time" subtitle="Average days from ETD to arrival — completed shipments">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={data.transitTrend.filter((d: any) => d.avgDays !== null)}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} unit=" d" allowDecimals={false} />
              <Tooltip content={<ChartTooltip formatter={(v: number) => [`${v} days`, 'Avg Transit']} />} />
              <Line
                type="monotone" dataKey="avgDays" name="Avg Transit"
                stroke={ORANGE} strokeWidth={2.5}
                dot={{ fill: ORANGE, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  )
}

export default Analytics
