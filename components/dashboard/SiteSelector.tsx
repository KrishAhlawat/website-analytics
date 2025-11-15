'use client'

import { Globe } from 'lucide-react'

interface Site {
  site_id: string
  name: string
}

interface SiteSelectorProps {
  sites: Site[]
  selectedSite: string
  onChange: (siteId: string) => void
}

export default function SiteSelector({ sites, selectedSite, onChange }: SiteSelectorProps) {
  return (
    <div className="relative">
      <label htmlFor="site-select" className="sr-only">
        Select Site
      </label>
      <div className="inline-flex items-center">
        <Globe className="h-4 w-4 text-gray-400 absolute left-3 pointer-events-none" />
        <select
          id="site-select"
          value={selectedSite}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {sites.map((site) => (
            <option key={site.site_id} value={site.site_id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
