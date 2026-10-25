import Link from 'next/link';
import { db } from '@/lib/db';
import { HardDrive, CheckCircle2, AlertCircle, ArrowUpRight, Copy, Image as ImageIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default async function OverviewPage() {
  const account = await db.googleAccount.findFirst();
  const [totalAssets, recentAssets] = await Promise.all([
    db.asset.count(),
    db.asset.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const usedBytes = account ? Number(account.storageUsed) : 0;
  const limitBytes = account ? Number(account.storageLimit) : 0;
  const percentUsed = limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0;
  const percentLabel = percentUsed > 0 && percentUsed < 0.01 ? `${percentUsed.toFixed(4)}%` : `${percentUsed.toFixed(2)}%`;

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-3 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-base sm:text-2xl font-bold tracking-tight text-slate-50">Dashboard Overview</h1>
        <p className="text-[11px] sm:text-sm text-slate-400 mt-0.5">
          Monitor your Google Drive storage engine, recent asset uploads, and service health.
        </p>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-6">
        {/* Google Account Card */}
        <div className="bg-surface border border-surface-border rounded-xl p-3 sm:p-5 flex flex-col justify-between hover:border-surface-border-active transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-400">
                Storage Provider
              </span>
              {account ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertCircle className="w-3 h-3" />
                  Disconnected
                </span>
              )}
            </div>

            <div className="mt-2.5 sm:mt-4">
              <h3 className="text-sm sm:text-lg font-semibold text-slate-50 truncate">
                {account ? account.email : 'No Account Linked'}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
                {account
                  ? 'Isolated folder: Google Drive > DriveCloud_Media'
                  : 'Link your Google account to enable upload streams.'}
              </p>
            </div>
          </div>

          <div className="mt-3 sm:mt-6 pt-2.5 sm:pt-4 border-t border-surface-border">
            {account ? (
              <a
                href="/api/auth/google"
                className="text-[11px] sm:text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1"
              >
                Reconnect tokens <ArrowUpRight className="w-3 h-3" />
              </a>
            ) : (
              <a
                href="/api/auth/google"
                className="w-full h-8 sm:h-10 px-3 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                Connect Google Drive
              </a>
            )}
          </div>
        </div>

        {/* Dynamic Quota Card */}
        <div className="bg-surface border border-surface-border rounded-xl p-3 sm:p-5 flex flex-col justify-between hover:border-surface-border-active transition-all">
          <div>
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-400">
              Capacity Allocation
            </span>
            <div className="mt-2.5 sm:mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-3xl font-extrabold text-slate-50">{formatBytes(usedBytes)}</span>
                <span className="text-[11px] sm:text-sm text-slate-400">/ {formatBytes(limitBytes)}</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                {percentLabel} utilized
              </p>
            </div>
          </div>

          <div className="mt-3 sm:mt-6">
            <div className="w-full bg-surface-border h-1.5 sm:h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(1, Math.min(100, percentUsed))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Assets Card */}
        <div className="bg-surface border border-surface-border rounded-xl p-3 sm:p-5 flex flex-col justify-between hover:border-surface-border-active transition-all">
          <div>
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-slate-400">
              Total Managed Assets
            </span>
            <div className="mt-2.5 sm:mt-4">
              <span className="text-xl sm:text-3xl font-extrabold text-slate-50">{totalAssets}</span>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
                Delivered with edge-caching headers and sharp transforms
              </p>
            </div>
          </div>

          <div className="mt-3 sm:mt-6 pt-2.5 sm:pt-4 border-t border-surface-border">
            <Link
              href="/explorer"
              className="text-[11px] sm:text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              Browse Media Explorer <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Integration Card */}
      <div className="bg-surface border border-surface-border rounded-xl p-3 sm:p-5">
        <h3 className="text-xs sm:text-base font-semibold text-slate-50 mb-1">Quick Integration Snippet</h3>
        <p className="text-[10px] sm:text-xs text-slate-400 mb-2.5">
          Upload any file from your application frontend or backend using your active API Key:
        </p>
        <div className="bg-canvas border border-surface-border rounded-lg p-2.5 sm:p-4 font-mono text-[10px] sm:text-xs text-slate-300 overflow-x-auto">
          <code>
            {`curl -X POST http://localhost:3000/api/v1/upload \\
  -H "Authorization: Bearer drv_live_YOUR_KEY" \\
  -F "file=@photo.jpg" \\
  -F "folder=products"`}
          </code>
        </div>
      </div>

      {/* Recent Uploads Table */}
      <div className="bg-surface border border-surface-border rounded-xl p-3 sm:p-5">
        <div className="flex items-center justify-between mb-2.5 sm:mb-4">
          <h3 className="text-xs sm:text-base font-semibold text-slate-50">Recent Uploads</h3>
          <Link href="/explorer" className="text-[11px] sm:text-xs font-medium text-primary hover:underline">
            View all ({totalAssets})
          </Link>
        </div>

        {recentAssets.length === 0 ? (
          <div className="text-center py-8 sm:py-12 border border-dashed border-surface-border rounded-lg">
            <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500 mx-auto mb-1.5" />
            <p className="text-xs sm:text-sm font-medium text-slate-300">No assets uploaded yet</p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
              Use the Upload Test Bench or post to /api/v1/upload to see files here.
            </p>
            <div className="mt-3">
              <Link
                href="/upload-test"
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-95 transition-all"
              >
                Go to Test Bench
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full text-left text-xs min-w-[480px]">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-surface-border text-[10px] sm:text-xs">
                <tr>
                  <th className="py-2 px-3 font-semibold">Asset Name</th>
                  <th className="py-2 px-3 font-semibold">Type</th>
                  <th className="py-2 px-3 font-semibold">Size</th>
                  <th className="py-2 px-3 font-semibold">Uploaded</th>
                  <th className="py-2 px-3 font-semibold text-right">Delivery Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-slate-300 font-medium text-[11px] sm:text-xs">
                {recentAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-100 flex items-center gap-2 truncate max-w-xs">
                      {asset.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                      {asset.mimeType}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {(asset.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <a
                        href={`/media/${asset.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-[10px]"
                      >
                        /media/{asset.id.substring(0, 8)}...
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
