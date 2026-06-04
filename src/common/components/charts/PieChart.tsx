'use client'

import React, { useState } from 'react'
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  Sector,
} from 'recharts'
import type { PieSectorDataItem } from 'recharts'
import { useThemeColors } from './useThemeColors'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PieDataEntry {
  name: string
  value: number
  color?: string
}

export interface PieChartProps {
  data: PieDataEntry[]
  colors?: string[]
  /** Render as donut (innerRadius='70%') — default true */
  donut?: boolean
  /** Show percentage labels on slices — default true */
  showLabels?: boolean
  /** Gap between slices in degrees — default 2 */
  paddingAngle?: number
  /** Called when a slice is clicked */
  onClick?: (entry: PieDataEntry, index: number) => void
  /** Show legend — default true */
  showLegend?: boolean
  /** Chart height in px — default 300 */
  height?: number
  className?: string
  /**
   * When provided, replaces the default tooltip.
   * Receives the raw PieDataEntry for the hovered slice.
   */
  renderTooltip?: (entry: PieDataEntry) => React.ReactNode
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

// ─── Active-shape renderer (expands hovered slice by 8 px) ───────────────────

interface SectorProps {
  cx: number
  cy: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  fill: string
}

function renderActiveShape(props: SectorProps) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  )
}

// ─── Slice label renderer ─────────────────────────────────────────────────────

interface LabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
}

function renderCustomLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  percent = 0,
}: LabelProps) {
  if (percent < 0.05) return null // skip tiny slices to avoid overlap

  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PieChart({
  data,
  colors,
  donut = true,
  showLabels = true,
  paddingAngle = 2,
  onClick,
  showLegend = true,
  height = 300,
  className,
  renderTooltip,
}: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const themeColors = useThemeColors()
  const palette = themeColors.series.length ? themeColors.series : DEFAULT_COLORS

  function resolveColor(entry: PieDataEntry, index: number): string {
    return entry.color ?? colors?.[index] ?? palette[index % palette.length]
  }

  const buildActiveShape = (sectorIndex: number) =>
    (props: PieSectorDataItem): React.ReactElement => {
      if (sectorIndex !== activeIndex) {
        const { cx = 0, cy = 0, innerRadius = 0, outerRadius = 0, startAngle = 0, endAngle = 0, fill = '' } = props
        return (
          <Sector
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={startAngle}
            endAngle={endAngle}
            fill={fill}
          />
        )
      }
      return renderActiveShape(props as unknown as SectorProps)
    }

  const tooltipContent: React.ReactElement | ((props: Parameters<typeof Tooltip>[0]) => React.ReactNode) | undefined =
    renderTooltip
      ? ((props: { active?: boolean; payload?: Array<{ payload: PieDataEntry }> }) => {
          if (props.active && props.payload?.[0]) {
            return <>{renderTooltip(props.payload[0].payload)}</>
          }
          return null
        }) as unknown as (props: Parameters<typeof Tooltip>[0]) => React.ReactNode
      : undefined

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={donut ? '70%' : 0}
            outerRadius="80%"
            dataKey="value"
            paddingAngle={paddingAngle}
            activeShape={
              activeIndex !== undefined
                ? (buildActiveShape(activeIndex) as unknown as (props: PieSectorDataItem) => React.ReactElement)
                : undefined
            }
            labelLine={showLabels ? undefined : false}
            label={showLabels ? renderCustomLabel : false}
            cursor={onClick ? 'pointer' : undefined}
            onMouseEnter={(_: PieSectorDataItem, index: number) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
            onClick={
              onClick
                ? (entry: PieSectorDataItem, index: number) =>
                    onClick(
                      (entry as PieSectorDataItem & { payload?: PieDataEntry }).payload ??
                        (entry as unknown as PieDataEntry),
                      index
                    )
                : undefined
            }
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={resolveColor(entry, index)} />
            ))}
          </Pie>

          {tooltipContent ? (
            <Tooltip content={tooltipContent} />
          ) : (
            <Tooltip formatter={(value, name) => [value, name]} />
          )}

          {showLegend && (
            <Legend
              align="center"
              verticalAlign="bottom"
              layout="horizontal"
              iconSize={14}
              wrapperStyle={{ fontSize: '13px', color: '#333' }}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
