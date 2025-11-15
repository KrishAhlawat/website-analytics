'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface DeviceData {
  device: string
  count: number
}

interface DeviceChartProps {
  data: DeviceData[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function DeviceChart({ data }: DeviceChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  
  const chartData = data.map(item => ({
    name: item.device,
    value: item.count,
    percentage: ((item.count / total) * 100).toFixed(1),
  }))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Devices
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percentage }) => `${percentage}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgb(31, 41, 55)',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
            }}
            formatter={(value: number) => value.toLocaleString()}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
