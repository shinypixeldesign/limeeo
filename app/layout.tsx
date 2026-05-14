import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Limeeo — CRM pentru freelanceri',
  description: 'Gestionează clienți, proiecte și finanțe cu ajutorul AI.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Limeeo',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ro" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#acff55" />
      </head>
      <body className="h-full bg-[#e9eeea] font-['Urbanist'] antialiased">
        {children}
      </body>
    </html>
  )
}
