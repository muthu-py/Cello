import { useState } from 'react';
import SectionLabel from '../ui/SectionLabel';
import ActionButton from '../ui/ActionButton';
import ReasonCard from '../ui/ReasonCard';
import { inventoryApi } from '../../config/api';

/**
 * Google Gemini brief — generated server-side using GEMINI_API_KEY.
 */
export default function AiExecutiveBrief({ disabled }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [missingKey, setMissingKey] = useState(false);

  function handleApiError(e) {
    const status = e.response?.status;
    const code = e.response?.data?.code;
    const msg =
      e.response?.data?.error ||
      e.message ||
      'Could not reach the AI summary endpoint.';
    if (status === 503 && code === 'MISSING_API_KEY') {
      setMissingKey(true);
      setError(
        'Add GEMINI_API_KEY to inventory-intelligence/.env (Google AI Studio), then restart the API.'
      );
      return;
    }
    setError(msg);
  }

  async function generate() {
    setError(null);
    setInfo(null);
    setMissingKey(false);
    setLoading(true);
    setSummary('');
    try {
      const res = await inventoryApi.post('/api/inventory/ai-summary', {});
      if (res.data?.success && res.data?.summary) {
        setSummary(res.data.summary);
        if (res.data?.source === 'fallback' && res.data?.warning) {
          setInfo(res.data.warning);
        }
      } else {
        setError(res.data?.error || 'Unexpected response');
      }
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdfReport() {
    setError(null);
    setInfo(null);
    setMissingKey(false);
    setDownloading(true);
    try {
      const res = await inventoryApi.post('/api/inventory/ai-summary/pdf', {}, { responseType: 'blob' });
      const file = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(file);
      const anchor = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `inventory-executive-report-${today}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      const source = res.headers?.['x-report-source'];
      const warning = res.headers?.['x-report-warning'];
      if (source === 'fallback' && warning) {
        setInfo(warning);
      }
    } catch (e) {
      if (e.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const parsed = JSON.parse(text);
          e.response.data = parsed;
        } catch (_blobParseErr) {
          // Keep fallback behavior.
        }
      }
      handleApiError(e);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-4"
      style={{
        border: 'var(--border-default)',
        borderRadius: 'var(--radius-panel)',
        background: 'var(--bg-panel)',
        padding: '20px 22px',
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionLabel>AI executive brief</SectionLabel>
          <p
            style={{
              margin: '6px 0 0',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              maxWidth: 540,
              lineHeight: 1.5,
            }}
          >
            One-click narrative from live restock and payables data via{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>Google Gemini</span>.
            Useful for ward huddles, pharmacy–finance alignment, and weekly steering.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActionButton variant="ghost" onClick={generate} disabled={disabled || loading || downloading}>
            {loading ? 'Generating…' : 'Preview brief'}
          </ActionButton>
          <ActionButton onClick={downloadPdfReport} disabled={disabled || downloading || loading}>
            {downloading ? 'Generating…' : 'Generate report (PDF)'}
          </ActionButton>
        </div>
      </div>

      {loading || downloading ? (
        <div className="mono-loading" style={{ padding: '20px 0' }}>
          LOADING...
        </div>
      ) : null}

      {error ? (
        <ReasonCard text={error} />
      ) : null}

      {info ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
          {info}
        </p>
      ) : null}

      {missingKey ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
          Get a key at https://aistudio.google.com/apikey
        </p>
      ) : null}

      {summary && !loading ? (
        <div
          style={{
            marginTop: 4,
            paddingTop: 16,
            borderTop: 'var(--border-row)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              lineHeight: 1.65,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {summary}
          </div>
        </div>
      ) : null}
    </div>
  );
}
