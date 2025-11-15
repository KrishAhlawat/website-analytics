'use client'

import { Eye, Users, Clock, TrendingUp } from 'lucide-react'

interface StatsSummary {
  total_views: number
  unique_visitors: number
  avg_session_duration: number
  bounce_rate: number
  change_views?: number
  change_visitors?: number
  change_duration?: number
  change_bounce?: number
}

interface StatsCardsProps {
  stats: StatsSummary
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Views',
      value: stats.total_views.toLocaleString(),
      change: stats.change_views,
      icon: Eye,
      color: 'blue',
    },
    {
      title: 'Unique Visitors',
      value: stats.unique_visitors.toLocaleString(),
      change: stats.change_visitors,
      icon: Users,
      color: 'green',
    },
    {
      title: 'Avg. Session Duration',
      value: formatDuration(stats.avg_session_duration),
      change: stats.change_duration,
      icon: Clock,
      color: 'purple',
    },
    {
      title: 'Bounce Rate',
      value: `${stats.bounce_rate.toFixed(1)}%`,
      change: stats.change_bounce,
      icon: TrendingUp,
      color: 'orange',
      invertChange: true,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon
        const hasChange = card.change !== undefined && card.change !== null
        const isPositive = card.invertChange ? card.change! < 0 : card.change! > 0
        
        return (
          <div
            key={card.title}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg bg-${card.color}-100 dark:bg-${card.color}-900/20`}>
                <Icon className={`h-6 w-6 text-${card.color}-600 dark:text-${card.color}-400`} />
              </div>
              {hasChange && (
                <span
                  className={`text-sm font-medium ${
                    isPositive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {isPositive ? '+' : ''}{card.change!.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {card.title}
              </h3>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {card.value}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}m ${secs}s`
}
