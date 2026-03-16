import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'LensLinkUp — Photography Business Network',
  description: 'Connect with photographers, studios, labs and creative professionals across India.',
  keywords:    ['photography', 'photographer', 'photo studio', 'videographer', 'India'],
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:        true,
    statusBarStyle: 'black-translucent',
    title:          'LensLinkUp',
  },
  icons: {
    icon:  [
      { url: '/favicon-32.png', sizes: '32x32',   type: 'image/png' },
      { url: '/icon-192.png',   sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png',   sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor:          '#0D9488',
  width:               'device-width',
  initialScale:        1,
  maximumScale:        1,
  viewportFit:         'cover',  // enables safe-area-inset on iOS notch/Dynamic Island
  userScalable:        false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Capacitor / PWA — prevent tap highlight on mobile */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>{children}</body>
    </html>
  )
}
