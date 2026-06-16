import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import fs from "fs"
import path from "path"

//this is for just debugging purpose it will not affect the application.
// try {
//   const result = {
//     env: Object.keys(process.env).reduce((acc: any, key) => {
//       if (key.includes("SUPABASE") || key.includes("KEY") || key.includes("PORT") || key.includes("URL") || key.includes("DB")) {
//         acc[key] = process.env[key];
//       }
//       return acc;
//     }, {})
//   };
//   fs.writeFileSync(path.join(process.cwd(), "debug_output.json"), JSON.stringify(result, null, 2));
// } catch (e: any) {
//   console.error("Failed to write debug info:", e);
// }


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "TaskPilot - Streamline Your Workspace",
  description: "Next-generation workspace management and task collaboration tool.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  )
}
