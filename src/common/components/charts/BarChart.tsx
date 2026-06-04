'use client'

import React from 'react'
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { BarRectangleItem } from 'recharts'
import { useThemeColors } from './useThemeColors'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BarDataEntry {
  name: string
  [key: string]: string | number
}

export interface BarChartProps {
  data: BarDataEntry[]
  /** Data keys to plot as bars */
  keys: string[]
  /** Per-key colours — falls back to DEFAULT_COLORS */
  colors?: string[]
  /**
   * 'bar'    = vertical bars (default)
   * 'column' = horizontal bars
   */
  type?: 'bar' | 'column'
  /** Stack all bars on top of each other */
  stacked?: boolean
  /** Show grid lines (default true) */
  showGrid?: boolean
  /** Show legend (default true) */
  showLegend?: boolean
  /** Legend placement (default 'bottom') */
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  xAxisLabel?: string
  yAxisLabel?: string
  /** Chart height in px (default 300) */
  height?: number
  /** Called when a bar segment is clicked */
  onClick?: (data: BarDataEntry, key: string, value: number) => void
  className?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return String(value)
}

function resolveLegendProps(position: NonNullable<BarChartProps['legendPosition']>): {
  verticalAlign: 'top' | 'bottom' | 'middle'
  layout: 'horizontal' | 'vertical'
  align: 'left' | 'center' | 'right'
} {
  return {
    verticalAlign:
      position === 'top' || position === 'bottom' ? position : 'bottom',
    layout:
      position === 'left' || position === 'right' ? 'vertical' : 'horizontal',
    align:
      position === 'left' ? 'left' : position === 'right' ? 'right' : 'center',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BarChart({
  data,
  keys,
  colors,
  type = 'bar',
  stacked = false,
  showGrid = true,
  showLegend = true,
  legendPosition = 'bottom',
  xAxisLabel,
  yAxisLabel,
  height = 300,
  onClick,
  className,
}: BarChartProps) {
  const isHorizontal = type === 'column'
  const legendProps = resolveLegendProps(legendPosition)
  const themeColors = useThemeColors()
  const palette = themeColors.series.length ? themeColors.series : DEFAULT_COLORS

  function resolveColor(index: number): string {
    return colors?.[index] ?? palette[index % palette.length]
  }

  function handleBarClick(barData: BarRectangleItem, key: string) {
    if (!onClick) return
    const entry = (barData.payload ?? barData) as BarDataEntry
    const value = Number(entry[key] ?? 0)
    onClick(entry, key, value)
  }

  // Horizontal (column) layout: categories on Y axis, values on X axis
  const xAxisNode = isHorizontal ? (
    <XAxis
      type="number"
      tickFormatter={formatNumber}
      domain={[0, 'auto']}
      label={
        yAxisLabel
          ? { value: yAxisLabel, position: 'insideBottom', offset: -10 }
          : undefined
      }
    />
  ) : (
    <XAxis
      dataKey="name"
      label={
        xAxisLabel
          ? { value: xAxisLabel, position: 'insideBottom', offset: -10 }
          : undefined
      }
    />
  )

  const yAxisNode = isHorizontal ? (
    <YAxis
      type="category"
      dataKey="name"
      width={110}
      label={
        xAxisLabel
          ? { value: xAxisLabel, angle: -90, position: 'insideLeft' }
          : undefined
      }
    />
  ) : (
    <YAxis
      tickFormatter={formatNumber}
      domain={[0, 'auto']}
      label={
        yAxisLabel
          ? { value: yAxisLabel, angle: -90, position: 'insideLeft' }
          : undefined
      }
    />
  )

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 10, right: 30, left: 20, bottom: showLegend && legendPosition === 'bottom' ? 30 : 20 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}

          {xAxisNode}
          {yAxisNode}

          <Tooltip
            formatter={(value) => [
              typeof value === 'number' ? formatNumber(value) : String(value),
            ]}
          />

          {showLegend && (
            <Legend
              verticalAlign={legendProps.verticalAlign}
              layout={legendProps.layout}
              align={legendProps.align}
              iconSize={14}
              wrapperStyle={{ fontSize: '13px' }}
            />
          )}

          {keys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={resolveColor(index)}
              stackId={stacked ? 'stack' : undefined}
              cursor={onClick ? 'pointer' : undefined}
              onClick={
                onClick
                  ? (barData: BarRectangleItem) => handleBarClick(barData, key)
                  : undefined
              }
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
