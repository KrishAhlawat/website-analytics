'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Copy, Eye, EyeOff, ExternalLink, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Site {
  _id: string
  site_id: string
  name: string
  api_key: string
  created_at: string
}

export default function SitesPage() {
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const { data: sites = [], isLoading, refetch } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await fetch('/api/sites')
      if (!res.ok) throw new Error('Failed to fetch sites')
      return res.json()
    },
  })

  const toggleKeyVisibility = (siteId: string) => {
    const newRevealed = new Set(revealedKeys)
    if (newRevealed.has(siteId)) {
      newRevealed.delete(siteId)
    } else {
      newRevealed.add(siteId)
    }
    setRevealedKeys(newRevealed)
  }

  const copyApiKey = (apiKey: string, siteId: string) => {
    navigator.clipboard.writeText(apiKey)
    setCopiedKey(siteId)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const deleteSite = async (siteId: string) => {
    if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/sites/${siteId}`, { method: 'DELETE' })
      if (res.ok) {
        refetch()
      } else {
        alert('Failed to delete site')
      }
    } catch (error) {
      alert('Error deleting site')
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Your Sites
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your tracked websites and API keys
          </p>
        </div>
        <Link
          href="/dashboard/sites/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Site
        </Link>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No sites yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Get started by adding your first website
          </p>
          <Link
            href="/dashboard/sites/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Site
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {sites.map((site) => (
            <div
              key={site._id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {site.name}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      {site.site_id}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Created {format(new Date(site.created_at), 'MMM dd, yyyy')}
                  </p>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API Key
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono text-gray-900 dark:text-white">
                        {revealedKeys.has(site.site_id)
                          ? site.api_key
                          : '•'.repeat(48)}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(site.site_id)}
                        className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        title={revealedKeys.has(site.site_id) ? 'Hide' : 'Reveal'}
                      >
                        {revealedKeys.has(site.site_id) ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => copyApiKey(site.api_key, site.site_id)}
                        className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        title="Copy"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                      {copiedKey === site.site_id && (
                        <span className="text-sm text-green-600 dark:text-green-400">
                          Copied!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/dashboard?site=${site.site_id}`}
                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="View Analytics"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => deleteSite(site.site_id)}
                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete Site"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
