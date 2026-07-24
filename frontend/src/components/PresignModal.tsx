'use client';

import { useCallback, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { PresignResponse } from '@/lib/types';
import { Spinner } from './ui';

const EXPIRY_OPTIONS = [
  { label: '15 minutes', value: 900 },
  { label: '1 hour', value: 3600 },
  { label: '2 hours', value: 7200 },
];

interface Props {
  fileKey: string;
  onClose: () => void;
  onCopied: () => void;
}

/** Modal that generates and displays a temporary (pre-signed) download link. */
export default function PresignModal({ fileKey, onClose, onCopied }: Props) {
  const [expiresIn, setExpiresIn] = useState(3600);
  const [data, setData] = useState<PresignResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedExpiresIn, setGeneratedExpiresIn] = useState<number | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.presign(fileKey, expiresIn);
      setData(result);
      setGeneratedExpiresIn(expiresIn);
    } catch (err) {
      setData(null);
      setError(err instanceof ApiError ? err.message : 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  }, [fileKey, expiresIn]);

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.url);
      onCopied();
    } catch {
      // Clipboard API unavailable (non-secure context) — select text instead.
    }
  };

  const canRegenerate = data !== null && generatedExpiresIn !== expiresIn;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Temporary access link"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-700">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-lg font-semibold">Temporary access link</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-4 break-all text-sm text-slate-500 dark:text-slate-400">{fileKey}</p>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Link expires in
          </span>
          <select
            value={expiresIn}
            onChange={(e) => setExpiresIn(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800"
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {loading && (
          <div className="flex items-center justify-center py-6 text-indigo-600">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!loading && error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        {!loading && data && (
          <>
            <label className="mb-2 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                URL
              </span>
              <input
                readOnly
                value={data.url}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Expires at {formatDateTime(data.expiresAt)}
            </p>
          </>
        )}

        {!loading && (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Close
            </button>
            {data && canRegenerate && (
              <button
                type="button"
                onClick={() => void generate()}
                className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400"
              >
                Regenerate
              </button>
            )}
            {data && (
              <button
                type="button"
                onClick={() => void copy()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Copy to clipboard
              </button>
            )}
            {!data && (
              <button
                type="button"
                onClick={() => void generate()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Generate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
