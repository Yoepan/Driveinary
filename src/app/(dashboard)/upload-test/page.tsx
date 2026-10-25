'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, CheckCircle2, AlertCircle, File, ExternalLink, ChevronDown, Key, Check } from 'lucide-react';

interface KeyOption {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey?: string | null;
}

export default function UploadTestPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<KeyOption[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [folder, setFolder] = useState('uploads/test');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/v1/keys', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setKeys(data.data);
          // Pre-select first key with fullKey if available and not yet set
          const firstValid = data.data.find((k: KeyOption) => k.fullKey);
          if (firstValid && !apiKey) {
            setApiKey(firstValid.fullKey);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    if (!apiKey.trim()) {
      setError('Please provide an API Key. Generate one from the API Keys tab.');
      return;
    }

    setUploading(true);
    setProgress(15);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folder.trim()) {
        formData.append('folder', folder.trim());
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/v1/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${apiKey.trim()}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(95, Math.round((event.loaded / event.total) * 95));
          setProgress(percent);
        }
      };

      xhr.onload = () => {
        setUploading(false);
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            setProgress(100);
            setResult(data);
            router.refresh();
          } else {
            setError(data.error || `Upload failed with status ${xhr.status}`);
          }
        } catch {
          setError('Failed to parse server upload response');
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        setError('Network error connecting to Driveinary server');
      };

      xhr.send(formData);
    } catch (err: any) {
      setUploading(false);
      setError(err.message || 'An unexpected error occurred during upload');
    }
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-3 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-base sm:text-2xl font-bold tracking-tight text-slate-50">Upload Test Bench</h1>
        <p className="text-[11px] sm:text-sm text-slate-400 mt-0.5">
          Interactive playground to test multipart stream uploads directly to Google Drive and verify immediate proxy delivery.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        {/* Upload Form */}
        <form onSubmit={handleUpload} className="space-y-3 sm:space-y-4 bg-surface border border-surface-border rounded-xl p-3 sm:p-5">
          <h3 className="font-semibold text-xs sm:text-sm text-slate-100">Upload Parameters</h3>

          {/* API Key Input & Quick Selector */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1.5">
              API Key (Bearer Token)
            </label>

            {keys.length > 0 && (
              <div ref={dropdownRef} className="relative mb-2">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="w-full bg-canvas border border-surface-border hover:border-slate-500 rounded-lg px-3 py-2 text-left flex items-center justify-between text-xs text-slate-200 focus:outline-none focus:border-primary transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Key className="w-3.5 h-3.5 text-primary shrink-0" />
                    {(() => {
                      const matched = keys.find((k) => k.fullKey && k.fullKey === apiKey.trim());
                      if (matched) {
                        return (
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-slate-100 truncate">{matched.name}</span>
                            <span className="text-[10px] font-mono bg-surface px-1.5 py-0.5 rounded border border-surface-border text-slate-400">
                              {matched.keyPrefix}
                            </span>
                          </div>
                        );
                      }
                      if (apiKey) {
                        return (
                          <span className="font-mono text-slate-300 truncate">
                            Custom Key ({apiKey.substring(0, 14)}...)
                          </span>
                        );
                      }
                      return <span className="text-slate-400">Select an active API key...</span>;
                    })()}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Custom Dropdown Popover */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface border border-surface-border rounded-xl shadow-2xl p-1.5 z-30 space-y-1 animate-scale-in max-h-56 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Active API Keys
                    </div>
                    {keys.map((k) => {
                      const isSelected = Boolean(k.fullKey && k.fullKey === apiKey.trim());
                      return (
                        <div
                          key={k.id}
                          onClick={() => {
                            if (k.fullKey) {
                              setApiKey(k.fullKey);
                            }
                            setIsDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-primary/15 border border-primary/30 text-white'
                              : 'hover:bg-surface-hover/80 text-slate-200'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <p className="text-xs font-semibold truncate text-slate-100">{k.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{k.keyPrefix}</p>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <input
              type="text"
              required
              placeholder="drv_live_xxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-canvas border border-surface-border rounded-md px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary"
            />
          </div>

          {/* Target Folder */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
              Target Folder in Google Drive (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. products/summer2026"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full bg-canvas border border-surface-border rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary"
            />
          </div>

          {/* Dropzone */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
              Select Media File
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-surface-border hover:border-primary/60 rounded-xl p-3.5 sm:p-5 text-center cursor-pointer transition-colors bg-canvas/60"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 mx-auto mb-1" />
              {file ? (
                <div>
                  <p className="text-xs font-semibold text-primary truncate max-w-xs mx-auto">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    {(file.size / 1024).toFixed(1)} KB — {file.type || 'unknown type'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-300">Click to choose or drag & drop</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Photos, Videos, or Documents (up to 500 MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Streaming to Google Drive...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-surface-border h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full h-8 sm:h-10 rounded-md bg-primary hover:bg-primary-hover active:scale-95 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary/20"
          >
            {uploading ? 'Uploading...' : 'Send Multipart Request'}
          </button>
        </form>

        {/* Live Response Inspector */}
        <div className="bg-surface border border-surface-border rounded-xl p-3 sm:p-5 flex flex-col justify-between space-y-3">
          <div>
            <h3 className="font-semibold text-xs sm:text-sm text-slate-100 mb-1">Live Response Inspector</h3>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Direct verification of the server response and streamed media preview.
            </p>

            {result ? (
              <div className="mt-3 space-y-3">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Asset Uploaded & Ready
                </div>

                {/* Rendered Asset Preview */}
                <div className="bg-canvas border border-surface-border rounded-lg overflow-hidden flex items-center justify-center min-h-[140px] max-h-[180px]">
                  {result.mime_type?.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.url}
                      alt={result.name}
                      className="max-h-[160px] w-auto object-contain"
                    />
                  ) : result.mime_type?.startsWith('video/') ? (
                    <video controls className="max-h-[160px] w-full">
                      <source src={result.url} type={result.mime_type} />
                    </video>
                  ) : (
                    <div className="text-center py-4 text-slate-400">
                      <File className="w-8 h-8 mx-auto mb-1 text-slate-500" />
                      <span className="text-xs">{result.name}</span>
                    </div>
                  )}
                </div>

                {/* Direct Link Anchor */}
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline font-mono inline-flex items-center gap-1"
                >
                  {result.url} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="mt-3 border border-dashed border-surface-border rounded-lg p-6 sm:p-8 text-center bg-canvas/30">
                <p className="text-xs text-slate-400">Awaiting upload payload...</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  JSON attributes & direct media link will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
