"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { logoutAction } from "@/features/auth/actions/logout.action"

interface HeaderProps {
  user: { id: string } | null // Current authenticated user, if any
}

export function Header({ user }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800/80 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <Logo size="md" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-amber-500 transition-colors duration-150"
            >
              Features
            </a>
            <a
              href="#stack"
              className="text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-amber-500 transition-colors duration-150"
            >
              Tech Stack
            </a>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white transition-colors duration-150 cursor-pointer px-3 py-2 bg-transparent border-none outline-none font-sans"
                  >
                    Sign Out
                  </button>
                </form>
                <Link href="/workspace">
                  <Button
                    variant="default"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2 rounded-lg text-xs transition-colors duration-150 h-9 border-0 cursor-pointer shadow-sm shadow-amber-500/10"
                  >
                    Workspace
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-slate-950" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white transition-colors duration-150 cursor-pointer px-3 py-2">
                    Sign In
                  </span>
                </Link>
                <Link href="/signup">
                  <Button
                    variant="default"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2 rounded-lg text-xs transition-colors duration-150 h-9 border-0 cursor-pointer shadow-sm shadow-amber-500/10"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 focus:outline-none transition-colors duration-150"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-5 w-5" /> : <Menu className="block h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-[#0b0f19] border-b border-slate-800 transition-all duration-200 ease-in-out origin-top ${
          isOpen ? "opacity-100 transform scale-y-100" : "opacity-0 transform scale-y-0 pointer-events-none"
        }`}
      >
        <div className="px-6 pt-2 pb-6 space-y-3 shadow-xl">
          <a
            href="#features"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-sm font-semibold uppercase tracking-wider text-slate-300 hover:text-white transition-all"
          >
            Features
          </a>
          <a
            href="#stack"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-sm font-semibold uppercase tracking-wider text-slate-300 hover:text-white transition-all"
          >
            Tech Stack
          </a>

          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            {user ? (
              <>
                <Link href="/workspace" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-lg transition-colors border-0 text-sm flex items-center justify-center gap-1.5 cursor-pointer">
                    Workspace
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </Button>
                </Link>
                <form action={logoutAction} onSubmit={() => setIsOpen(false)} className="w-full">
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold py-2.5 rounded-lg transition-colors text-sm bg-transparent cursor-pointer"
                  >
                    Sign Out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full border-slate-800 hover:bg-slate-900 text-slate-300 font-semibold py-2.5 rounded-lg transition-colors text-sm bg-transparent cursor-pointer"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-lg transition-colors border-0 text-sm cursor-pointer">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
