'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import StatsCards from '@/components/dashboard/StatsCards'
import TrafficChart from '@/components/dashboard/TrafficChart'
import TopPagesChart from '@/components/dashboard/TopPagesChart'
import DeviceChart from '@/components/dashboard/DeviceChart'
import DateRangePicker from '@/components/dashboard/DateRangePicker'
import SiteSelector from '@/components/dashboard/SiteSelector'
import { subDays, format } from 'date-fns'

export default function Dashboard() {
  const { data: session } = useSession()
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 7),
    end: new Date(),
  })

  // Fetch user's sites
  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await fetch('/api/sites')
      if (!res.ok) throw new Error('Failed to fetch sites')
      return res.json()
    },
  })

  // Auto-select first site when sites load
  useEffect(() => {
    if (!selectedSite && sites && sites.length > 0) {
      setSelectedSite(sites[0].site_id)
    }
    // Only run when sites list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites])

  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', selectedSite, dateRange],
    queryFn: async () => {
      if (!selectedSite) return null
      const params = new URLSearchParams({
        site_id: selectedSite,
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd'),
      })
      const res = await fetch(`/api/stats?${params}`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    enabled: !!selectedSite,
  })

  if (!session) {
    return null
  }

  if (sites.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Analytics!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You don't have any sites yet. Create your first site to start tracking.
        </p>
        <a
          href="/dashboard/sites/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Create Your First Site
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <SiteSelector
            sites={sites}
            selectedSite={selectedSite}
            onChange={setSelectedSite}
          />
          <DateRangePicker
            dateRange={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : stats ? (
        <>
          <StatsCards stats={stats.summary} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrafficChart data={stats.daily} />
            <DeviceChart data={stats.devices} />
          </div>

          <TopPagesChart data={stats.top_pages} />
        </>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No data available for the selected period
        </div>
      )}
    </div>
  )
}
