'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import PresignModal from '@/components/PresignModal';
import {
  EmptyState,
  ErrorBanner,
  PageHeader,
  SkeletonRows,
  Spinner,
  Toasts,
  type ToastData,
} from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { formatBytes, timeAgo } from '@/lib/format';
import type { LogFile } from '@/lib/types';

export default function LogsPage() {
  const [files, setFiles] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefixInput, setPrefixInput] = useState('');
  const [activePrefix, setActivePrefix] = useState('');
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [presignKey, setPresignKey] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const pushToast = useCallback((message: string, kind: ToastData['kind'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, kind }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const load = useCallback(async (prefix: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listLogs(prefix || undefined);
      setFiles(res.files);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load log files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(activePrefix);
  }, [activePrefix, load]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setActivePrefix(prefixInput.trim());
  };

  const onDownload = async (key: string) => {
    setDownloadingKey(key);
    try {
      await api.downloadLog(key);
      pushToast(`Downloaded ${key.split('/').pop()}`);
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Download failed', 'error');
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <>
      <PageHeader title="Log Files">
        <form onSubmit={onSearch} className="flex w-full gap-2 sm:w-auto">
          <input
            type="search"
            value={prefixInput}
            onChange={(e) => setPrefixInput(e.target.value)}
            placeholder="Filter by prefix, e.g. archive/ or 2024-"
            aria-label="Filter by prefix"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 sm:w-72"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Search
          </button>
        </form>
      </PageHeader>

      {activePrefix && (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Filtering by prefix{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
            {activePrefix}
          </code>{' '}
          <button
            type="button"
            onClick={() => {
              setPrefixInput('');
              setActivePrefix('');
            }}
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Clear
          </button>
        </p>
      )}

      {error && !loading && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={() => void load(activePrefix)} />
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Size</th>
              <th className="px-4 py-3 font-semibold">Last modified</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={5} />
            ) : (
              files.map((file) => (
                <tr
                  key={file.key}
                  className="border-t border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      <span className="break-all font-medium" title={file.key}>
                        {file.key}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                    {formatBytes(file.size)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                    {timeAgo(file.lastModified)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void onDownload(file.key)}
                        disabled={downloadingKey === file.key}
                        title="Download"
                        aria-label={`Download ${file.name}`}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-indigo-500/10"
                      >
                        {downloadingKey === file.key ? (
                          <Spinner className="h-5 w-5" />
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresignKey(file.key)}
                        title="Get temporary link"
                        aria-label={`Get temporary link for ${file.name}`}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-indigo-500/10"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && files.length === 0 && !error && (
          <div className="p-4">
            <EmptyState
              title="No log files found"
              hint="Try a different search prefix or clear the filter."
            />
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-2 h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}

        {!loading && files.length === 0 && !error && (
          <EmptyState title="No log files found" hint="Try a different search prefix or clear the filter." />
        )}

        {!loading &&
          files.map((file) => (
            <div
              key={file.key}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="mb-1 break-all text-sm font-medium">{file.key}</p>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                {formatBytes(file.size)} · {timeAgo(file.lastModified)}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void onDownload(file.key)}
                  disabled={downloadingKey === file.key}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                >
                  {downloadingKey === file.key ? <Spinner className="h-4 w-4" /> : 'Download'}
                </button>
                <button
                  type="button"
                  onClick={() => setPresignKey(file.key)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Get link
                </button>
              </div>
            </div>
          ))}
      </div>

      {!loading && !error && files.length > 0 && (
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Showing {files.length} file{files.length === 1 ? '' : 's'}
        </p>
      )}

      {presignKey && (
        <PresignModal
          fileKey={presignKey}
          onClose={() => setPresignKey(null)}
          onCopied={() => pushToast('Link copied to clipboard')}
        />
      )}

      <Toasts toasts={toasts} />
    </>
  );
}