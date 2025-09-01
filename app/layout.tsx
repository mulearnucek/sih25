import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'SIH Internals 2025 - UCEK',
  description: 'Smart India Hackathon 2025 - UCEK Internal Selection',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
