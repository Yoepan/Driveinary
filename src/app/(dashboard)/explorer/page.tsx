'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Image as ImageIcon, Video, FileText, Copy, Trash2, ExternalLink, X, Sliders, AlertTriangle, Play } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  url: string;
  direct_url: string | null;
  created_at: string;
}

export default function ExplorerPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Transformation states for URL builder
  const [tfWidth, setTfWidth] = useState('400');
  const [tfFormat, setTfFormat] = useState('webp');
  const [tfQuality, setTfQuality] = useState('80');

  const fetchAssets = async () => {
    try {
      let url = '/api/v1/assets?limit=60';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (typeFilter) url += `&type=${encodeURIComponent(typeFilter)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setAssets(data.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [search, typeFilter]);

  const executeDelete = async (id: string) => {
    // Instantly close modal and remove from screen
    setAssetToDelete(null);
    setSelectedAsset(null);
    setAssets((prev) => prev.filter((a) => a.id !== id));

    try {
      const res = await fetch(`/api/v1/assets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        fetchAssets();
      } else {
        router.refresh();
      }
    } catch {
      fetchAssets();
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const computedTransformUrl = selectedAsset
    ? `${selectedAsset.url}?w=${tfWidth}&format=${tfFormat}&q=${tfQuality}`
    : '';

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-3 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-base sm:text-2xl font-bold tracking-tight text-slate-50">Media Explorer</h1>
        <p className="text-[11px] sm:text-sm text-slate-400 mt-0.5">
          Visual gallery of all photos, videos, and documents streamed directly from your 5 TB Google Drive storage.
        </p>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-surface border border-surface-border rounded-xl p-2.5 sm:p-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-canvas border border-surface-border rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
          {[
            { label: 'All', value: '' },
            { label: 'Images', value: 'image/' },
            { label: 'Videos', value: 'video/' },
            { label: 'Documents', value: 'application/' },
          ].map((f) => (
            <button
              key={f.label}
              onClick={() => setTypeFilter(f.value)}
              className={`px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-semibold transition-all active:scale-95 whitespace-nowrap ${
                typeFilter === f.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-canvas border border-surface-border'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <p className="text-xs text-slate-400 py-12 text-center">Loading media assets...</p>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-surface-border rounded-xl bg-surface">
          <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-1.5" />
          <p className="text-xs sm:text-sm font-semibold text-slate-300">No media assets found</p>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
            Try adjusting your search query or upload media in the Test Bench.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {assets.map((asset) => {
            const isImg = asset.mime_type.startsWith('image/');
            const isVid = asset.mime_type.startsWith('video/');

            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className="group relative bg-surface border border-surface-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/60 active:scale-95 transition-all hover:shadow-lg"
              >
                <div className="aspect-square bg-canvas flex items-center justify-center overflow-hidden">
                  {isImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${asset.url}?w=200&format=webp`}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : isVid ? (
                    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
                      <video
                        src={`${asset.url}#t=0.5`}
                        preload="metadata"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/15 transition-colors">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                          <Play className="w-3 h-3 fill-white ml-0.5 text-white" />
                        </div>
                      </div>
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[8px] font-mono font-medium text-slate-200">
                        VIDEO
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500 mb-1" />
                      <span className="text-[8px] sm:text-[10px] font-mono uppercase">Doc</span>
                    </div>
                  )}
                </div>

                <div className="p-1.5 sm:p-2">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-200 truncate">{asset.name}</p>
                  <p className="text-[8px] sm:text-[10px] text-slate-500 mt-0.5 font-mono">
                    {(asset.size_bytes / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Asset Detail Slide-over Drawer */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="bg-surface border-l border-surface-border w-full sm:max-w-md h-full overflow-y-auto p-4 sm:p-6 space-y-5 shadow-2xl flex flex-col justify-between animate-slide-up">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <h3 className="font-bold text-xs sm:text-sm text-slate-50 truncate max-w-[280px]">
                  {selectedAsset.name}
                </h3>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview Box */}
              <div className="bg-canvas border border-surface-border rounded-lg overflow-hidden flex items-center justify-center min-h-[180px]">
                {selectedAsset.mime_type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedAsset.url}
                    alt={selectedAsset.name}
                    className="max-h-[240px] w-auto object-contain"
                  />
                ) : selectedAsset.mime_type.startsWith('video/') ? (
                  <video controls className="max-h-[240px] w-full">
                    <source src={selectedAsset.url} type={selectedAsset.mime_type} />
                    Your browser does not support HTML5 video streaming.
                  </video>
                ) : (
                  <div className="text-center py-6">
                    <FileText className="w-10 h-10 text-slate-500 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-400 font-mono">{selectedAsset.mime_type}</p>
                  </div>
                )}
              </div>

              {/* Metadata Attributes */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-canvas/60 p-2.5 rounded-lg border border-surface-border">
                <div>
                  <span className="text-slate-500">File Size:</span>
                  <p className="text-slate-200 font-medium">
                    {(selectedAsset.size_bytes / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">MIME Type:</span>
                  <p className="text-slate-200 font-mono text-[10px] truncate">
                    {selectedAsset.mime_type}
                  </p>
                </div>
                {selectedAsset.width && (
                  <div>
                    <span className="text-slate-500">Resolution:</span>
                    <p className="text-slate-200 font-medium">
                      {selectedAsset.width} × {selectedAsset.height} px
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Created:</span>
                  <p className="text-slate-200 font-medium">
                    {new Date(selectedAsset.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Clean URL & Copy */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Clean Media Delivery URL</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={selectedAsset.url}
                    className="flex-1 bg-canvas border border-surface-border rounded-md px-2.5 py-1.5 font-mono text-[10px] text-primary select-all"
                  />
                  <button
                    onClick={() => copyUrl(selectedAsset.url)}
                    className="px-3 rounded-md bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* On-The-Fly Image Transformer (Cloudinary-style) */}
              {selectedAsset.mime_type.startsWith('image/') && (
                <div className="space-y-2.5 pt-2.5 border-t border-surface-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    On-The-Fly Transformation Builder
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500">Width (px)</label>
                      <input
                        type="number"
                        value={tfWidth}
                        onChange={(e) => setTfWidth(e.target.value)}
                        className="w-full bg-canvas border border-surface-border rounded px-2 py-1 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Format</label>
                      <select
                        value={tfFormat}
                        onChange={(e) => setTfFormat(e.target.value)}
                        className="w-full bg-canvas border border-surface-border rounded px-2 py-1 text-xs text-slate-200"
                      >
                        <option value="webp">WebP</option>
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                        <option value="avif">AVIF</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Quality (1-100)</label>
                      <input
                        type="number"
                        value={tfQuality}
                        onChange={(e) => setTfQuality(e.target.value)}
                        className="w-full bg-canvas border border-surface-border rounded px-2 py-1 text-xs text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={computedTransformUrl}
                      className="flex-1 bg-canvas border border-surface-border rounded-md px-2.5 py-1.5 font-mono text-[10px] text-emerald-400 select-all"
                    />
                    <button
                      onClick={() => copyUrl(computedTransformUrl)}
                      className="px-3 rounded-md bg-surface-hover hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold transition-all"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-surface-border flex justify-between items-center">
              <a
                href={selectedAsset.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 font-semibold"
              >
                Open in tab <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setAssetToDelete(selectedAsset)}
                className="h-8 px-3 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting Asset (No Browser 'localhost says' popup) */}
      {assetToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-surface-border rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Delete Asset</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-canvas/80 p-2.5 rounded-lg border border-surface-border">
              <p className="text-xs font-semibold text-slate-200 truncate">{assetToDelete.name}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{(assetToDelete.size_bytes / 1024).toFixed(1)} KB</p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              This file will be permanently removed from both your Google Drive and database.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                className="px-3.5 py-1.5 rounded-md bg-canvas border border-surface-border text-xs font-semibold text-slate-300 hover:bg-surface-hover active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDelete(assetToDelete.id)}
                className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold transition-all shadow-md shadow-red-900/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Check(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
