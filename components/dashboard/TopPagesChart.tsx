'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PageData {
  path: string
  views: number
}

interface TopPagesChartProps {
  data: PageData[]
}

export default function TopPagesChart({ data }: TopPagesChartProps) {
  const chartData = data.slice(0, 10).map(item => ({
    ...item,
    shortPath: item.path.length > 30 ? item.path.substring(0, 27) + '...' : item.path,
  }))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Top Pages
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis 
            type="number"
            className="text-gray-600 dark:text-gray-400"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis 
            type="category"
            dataKey="shortPath"
            width={150}
            className="text-gray-600 dark:text-gray-400"
            tick={{ fill: 'currentColor', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgb(31, 41, 55)',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
            }}
            formatter={(value: number, name: string, props: any) => [
              value.toLocaleString(),
              props.payload.path === props.payload.shortPath ? 'Views' : props.payload.path
            ]}
          />
          <Bar
            dataKey="views"
            fill="#8b5cf6"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
