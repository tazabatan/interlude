'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import type { ChartDataPoint } from './types'

type BookingsChartProps = {
  data: ChartDataPoint[]
  chartType?: 'line' | 'bar'
}

export function BookingsChart({ data, chartType = 'bar' }: BookingsChartProps) {
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-2xl border border-[#E8E4D7] bg-[#F9F6ED] p-3 shadow-lg">
          <p className="text-xs font-medium text-[#6F716D]">
            {formatDate(payload[0].payload.date)}
          </p>
          <p className="mt-1 text-lg font-semibold text-[#02374D]">
            {payload[0].value} bookings
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_18px_rgba(0,0,0,0.08)]">
      <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
        Bookings Over Time
      </h2>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4D7" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#6F716D"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6F716D"
                style={{ fontSize: '12px' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#7fcfc2"
                strokeWidth={2}
                dot={{ fill: '#7fcfc2', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4D7" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#6F716D"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6F716D"
                style={{ fontSize: '12px' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#7fcfc2" radius={[8, 8, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart type toggle */}
      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => {}}
          className="text-xs font-medium uppercase tracking-[0.2em] text-[#6F716D] transition hover:text-[#02374D]"
        >
          {chartType === 'line' ? 'Line Chart' : 'Bar Chart'}
        </button>
      </div>
    </div>
  )
}
