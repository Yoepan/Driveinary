'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Key, Image as ImageIcon, UploadCloud, HardDrive, Menu, X } from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/api-keys', label: 'API Keys', icon: Key },
  { href: '/explorer', label: 'Media Explorer', icon: ImageIcon },
  { href: '/upload-test', label: 'Test Bench', icon: UploadCloud },
];

interface StorageInfo {
  connected: boolean;
  email: string | null;
  used_formatted: string;
  limit_formatted: string;
  percentage: number;
  percentage_label: string;
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [storage, setStorage] = useState<StorageInfo>({
    connected: false,
    email: null,
    used_formatted: '0 B',
    limit_formatted: '0 B',
    percentage: 0,
    percentage_label: '0%',
  });

  useEffect(() => {
    fetch('/api/v1/storage')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.percentage === 'number') {
          setStorage(data);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Close mobile drawer and revalidate data on route change
  useEffect(() => {
    setIsMobileOpen(false);
    router.refresh();
  }, [pathname, router]);

  const navContent = (
    <nav className="p-3 sm:p-4 space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={() => setIsMobileOpen(false)}
            className={clsx(
              'flex items-center gap-2.5 px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-h-[38px] sm:min-h-[42px]',
              isActive
                ? 'bg-primary/10 text-primary border border-primary/30 shadow-sm shadow-primary/10 font-semibold'
                : 'text-slate-400 hover:text-slate-50 hover:bg-surface-hover active:scale-[0.98]'
            )}
          >
            <Icon className={clsx('w-3.5 h-3.5 sm:w-4 sm:h-4', isActive ? 'text-primary' : 'text-slate-400')} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const storageWidget = (
    <div className="p-3 sm:p-4 border-t border-surface-border">
      <div className="bg-canvas border border-surface-border rounded-lg p-2.5 sm:p-3">
        <div className="flex items-center justify-between text-[11px] sm:text-xs mb-1.5">
          <span className="text-slate-400 font-medium">Storage Quota</span>
          <span
            className={clsx(
              'font-semibold text-[11px] sm:text-xs',
              storage.connected ? 'text-emerald-400' : 'text-slate-500'
            )}
          >
            {storage.connected ? `${storage.limit_formatted} Plan` : 'Disconnected'}
          </span>
        </div>
        <div className="w-full bg-surface-border h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-700 ease-out"
            style={{
              width: `${storage.connected ? Math.max(2, Math.min(100, storage.percentage)) : 0}%`,
            }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-mono">
          <span>{storage.used_formatted} used</span>
          <span>{storage.percentage_label}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navigation Header (Android / Smartphone) */}
      <header className="md:hidden sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-surface-border h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold">
            <HardDrive className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-sm tracking-wide text-slate-50">Driveinary</span>
        </div>

        <button
          onClick={() => setIsMobileOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white active:bg-surface-hover transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile Drawer Backdrop & Slide-out Menu */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fade-in"
          />
          <div className="relative w-64 max-w-[75vw] bg-surface border-r border-surface-border h-full flex flex-col justify-between z-50 shadow-2xl animate-slide-up">
            <div>
              {/* Drawer Header */}
              <div className="h-12 px-3.5 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                    <HardDrive className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xs text-slate-50">Driveinary</h2>
                    <p className="text-[9px] text-slate-400">Mobile Console</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-white"
                  aria-label="Close Navigation Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {navContent}
            </div>

            {storageWidget}
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-surface border-r border-surface-border flex-col justify-between h-screen sticky top-0 shrink-0">
        <div>
          {/* Brand Header */}
          <div className="h-16 px-6 border-b border-surface-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold">
              <HardDrive className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-slate-50">Driveinary</h1>
              <p className="text-[11px] text-slate-400">BYOS Media Gateway</p>
            </div>
          </div>

          {navContent}
        </div>

        {storageWidget}
      </aside>
    </>
  );
}
