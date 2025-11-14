import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Website Analytics Platform',
  description: 'High-performance analytics backend with queue-based processing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
