import './globals.css'

export const metadata = {
  title: 'Property Presentation Generator',
  description: 'Generate luxury property presentations for clients',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
