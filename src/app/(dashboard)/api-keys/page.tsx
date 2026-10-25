'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Plus, Trash2, Copy, Check, Terminal, Code, AlertTriangle, Eye, EyeOff, X } from 'lucide-react';

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  fullKey?: string | null;
  allowedDomains: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [domains, setDomains] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyItem | null>(null);
  const [selectedTab, setSelectedTab] = useState<'curl' | 'js' | 'python'>('curl');
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedRowKeyId, setCopiedRowKeyId] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/v1/keys', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setKeys(data.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreateError(null);

    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName,
          allowed_domains: domains.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setCreatedSecret(data.data.key);
        setKeyName('');
        setDomains('');
        const newKeyItem: ApiKeyItem = {
          id: data.data.id,
          name: data.data.name,
          keyPrefix: data.data.keyPrefix,
          fullKey: data.data.key,
          allowedDomains: domains.trim() || null,
          lastUsedAt: null,
          createdAt: typeof data.data.createdAt === 'string' ? data.data.createdAt : new Date().toISOString(),
        };
        setKeys((prev) => [newKeyItem, ...prev.filter((k) => k.id !== data.data.id)]);
        fetchKeys();
        router.refresh();
      } else {
        setCreateError(data.error || 'Failed to generate key');
      }
    } catch {
      setCreateError('Network error connecting to API');
    }
  };

  const executeRevokeKey = async (id: string) => {
    setKeyToRevoke(null);
    // Optimistic UI removal
    setKeys((prev) => prev.filter((k) => k.id !== id));

    try {
      const res = await fetch(`/api/v1/keys?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        fetchKeys();
      } else {
        router.refresh();
      }
    } catch {
      fetchKeys();
    }
  };

  const handleCloseSecretModal = () => {
    setCreatedSecret(null);
    fetchKeys();
    router.refresh();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyRowKey = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRowKeyId(id);
    setTimeout(() => setCopiedRowKeyId(null), 2000);
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-3 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <h1 className="text-base sm:text-2xl font-bold tracking-tight text-slate-50">API Key Credentials</h1>
          <p className="text-[11px] sm:text-sm text-slate-400 mt-0.5">
            Generate and manage access tokens for integrating Driveinary uploads into external websites and apps.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateError(null);
            setIsModalOpen(true);
          }}
          className="h-8 sm:h-10 px-3 sm:px-4 rounded-md bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary/20 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Create API Key
        </button>
      </div>

      {/* Secret Reveal Modal Popup */}
      {createdSecret && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-surface-border rounded-xl max-w-md w-full p-4 sm:p-6 space-y-3.5 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-100 font-bold text-xs sm:text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                API Key Generated Successfully
              </div>
              <button
                onClick={handleCloseSecretModal}
                className="text-slate-400 hover:text-slate-100 p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
              Your API key is active. Copy it now, or you can reveal and manage it anytime in the Active API Keys table below.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdSecret}
                className="flex-1 bg-canvas border border-surface-border rounded-md px-3 py-2 font-mono text-[11px] sm:text-xs text-slate-200 select-all focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => copyToClipboard(createdSecret)}
                className="h-9 px-4 rounded-md bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary/20 shrink-0"
              >
                {copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSecret ? 'Copied!' : 'Copy Key'}
              </button>
            </div>

            {/* Clean Done & Close button */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={handleCloseSecretModal}
                className="h-8 px-4 rounded-md bg-canvas hover:bg-surface-hover active:scale-95 text-slate-200 border border-surface-border text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                Done & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="bg-surface border border-surface-border rounded-xl p-3 sm:p-5 transition-all">
        <h3 className="text-xs sm:text-base font-semibold text-slate-50 mb-2.5 sm:mb-4">Active API Keys</h3>

        {loading ? (
          <p className="text-xs text-slate-400 py-6 text-center">Loading keys...</p>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-surface-border rounded-lg">
            <Key className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500 mx-auto mb-1.5" />
            <p className="text-xs sm:text-sm font-medium text-slate-300">No API keys created yet</p>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
              Click &quot;Create API Key&quot; above to issue your first credential.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-surface-border text-[10px] sm:text-xs">
                <tr>
                  <th className="py-2 px-3 font-semibold">Name</th>
                  <th className="py-2 px-3 font-semibold">Key Identifier</th>
                  <th className="py-2 px-3 font-semibold">Allowed Domains</th>
                  <th className="py-2 px-3 font-semibold">Last Used</th>
                  <th className="py-2 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-slate-300 font-medium text-[11px] sm:text-xs">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-100">{k.name}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] sm:text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[130px] sm:max-w-[240px]">
                          {k.fullKey
                            ? revealedKeys[k.id]
                              ? k.fullKey
                              : `${k.fullKey.substring(0, 12)}••••••••`
                            : k.keyPrefix}
                        </span>
                        {k.fullKey && (
                          <button
                            onClick={() => toggleReveal(k.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                            title={revealedKeys[k.id] ? 'Hide Key' : 'Reveal Key'}
                          >
                            {revealedKeys[k.id] ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => copyRowKey(k.fullKey || k.keyPrefix, k.id)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-hover hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition-all"
                          title="Copy API Key"
                        >
                          {copiedRowKeyId === k.id ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                              <span className="text-[9px] text-emerald-400 font-sans">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5" />
                              <span className="text-[9px] font-sans">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{k.allowedDomains || 'Any (*)'}</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setKeyToRevoke(k)}
                        className="text-[11px] text-red-400 hover:text-red-300 active:scale-95 inline-flex items-center gap-1 font-semibold transition-all"
                      >
                        <Trash2 className="w-3 h-3" /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Integration Code Snippets */}
      <div className="bg-surface border border-surface-border rounded-xl p-3 sm:p-5 space-y-2.5 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
          <h3 className="text-xs sm:text-base font-semibold text-slate-50">SDK & API Examples</h3>
          <div className="flex gap-1 bg-canvas p-0.5 sm:p-1 rounded-lg border border-surface-border self-start sm:self-auto">
            {(['curl', 'js', 'python'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded text-[10px] sm:text-xs font-semibold uppercase transition-colors ${
                  selectedTab === tab
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-canvas border border-surface-border rounded-lg p-2.5 sm:p-4 font-mono text-[10px] sm:text-xs text-slate-300 overflow-x-auto max-h-48 overflow-y-auto">
          {selectedTab === 'curl' && (
            <pre>{`curl -X POST http://localhost:3000/api/v1/upload \\
  -H "Authorization: Bearer drv_live_YOUR_API_KEY" \\
  -F "file=@/path/to/image.jpg" \\
  -F "folder=products"`}</pre>
          )}

          {selectedTab === 'js' && (
            <pre>{`// Simple 3-step direct upload (works for any file size up to 5 TB)
async function uploadToDrive(file, apiKey) {
  // 1. Get direct upload URL
  const session = await fetch('http://localhost:3000/api/v1/upload/direct', {
    method: 'POST',
    headers: { 'Authorization': \`Bearer \${apiKey}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, mime_type: file.type, size: file.size })
  }).then(r => r.json());

  // 2. Upload file directly to Google Drive
  const googleRes = await fetch(session.upload_url, { method: 'PUT', body: file }).then(r => r.json());

  // 3. Confirm upload
  const confirmed = await fetch('http://localhost:3000/api/v1/upload/confirm', {
    method: 'POST',
    headers: { 'Authorization': \`Bearer \${apiKey}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ asset_id: session.asset_id, google_file_id: googleRes.id })
  }).then(r => r.json());

  return confirmed.url; // Ready-to-use CDN URL
}`}</pre>
          )}

          {selectedTab === 'python' && (
            <pre>{`import requests

url = "http://localhost:3000/api/v1/upload"
headers = {"Authorization": "Bearer drv_live_YOUR_API_KEY"}
files = {"file": open("image.jpg", "rb")}
data = {"folder": "products"}

res = requests.post(url, headers=headers, files=files, data=data)
print("Asset URL:", res.json()["url"])`}</pre>
          )}
        </div>
      </div>

      {/* Create Key Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface border border-surface-border rounded-xl max-w-md w-full p-4 sm:p-6 space-y-3 sm:space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-lg font-bold text-slate-50">Generate New API Key</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-xs text-red-400 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateKey} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                  Key Name / Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Web Client"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full bg-canvas border border-surface-border rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                  Allowed Domains (Optional Whitelist)
                </label>
                <input
                  type="text"
                  placeholder="e.g. mydomain.com, staging.mydomain.com"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  className="w-full bg-canvas border border-surface-border rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary"
                />
                <p className="text-[10px] text-slate-500 mt-1">Leave empty to allow all origins.</p>
              </div>

              <div className="flex justify-end gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-canvas border border-surface-border text-xs font-semibold text-slate-300 hover:bg-surface-hover active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-semibold transition-all shadow-md shadow-primary/20"
                >
                  Create Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Revoking Key (No Browser 'localhost says' popup) */}
      {keyToRevoke && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-surface-border rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Revoke API Key</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Permanent access revocation.</p>
              </div>
            </div>

            <div className="bg-canvas/80 p-2.5 rounded-lg border border-surface-border">
              <p className="text-xs font-semibold text-slate-200">{keyToRevoke.name}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{keyToRevoke.keyPrefix}</p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Any external apps or upload scripts using this key will immediately be denied access with HTTP 401.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setKeyToRevoke(null)}
                className="px-3.5 py-1.5 rounded-md bg-canvas border border-surface-border text-xs font-semibold text-slate-300 hover:bg-surface-hover active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeRevokeKey(keyToRevoke.id)}
                className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold transition-all shadow-md shadow-red-900/30"
              >
                Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
