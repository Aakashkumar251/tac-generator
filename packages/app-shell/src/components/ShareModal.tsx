import { useState, useCallback } from 'react';
import { X, Copy, Check, Link, QrCode } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  sourceCode: string;
}

export function ShareModal({ open, onClose, sourceCode }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useCallback(() => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(sourceCode)));
      return `${window.location.origin}${window.location.pathname}?code=${encoded}`;
    } catch {
      return window.location.href;
    }
  }, [sourceCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  const url = shareUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[420px] rounded-xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Share Code</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Share URL</label>
            <div className="mt-1.5 flex gap-2">
              <input
                readOnly
                value={url}
                className="flex-1 rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-code text-foreground truncate"
              />
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  copied
                    ? 'bg-syntax-string/20 text-syntax-string'
                    : 'bg-primary text-primary-foreground hover:brightness-110'
                }`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground">
            <p>The link encodes your source code in the URL. Anyone with this link can view and compile your code.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                const text = `Check out this C code in TAC Generator Pro: ${url}`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
              }}
              className="flex-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-muted transition-colors text-center"
            >
              Share on X
            </button>
            <button
              onClick={() => {
                window.open(`mailto:?subject=C-TAC Code&body=${encodeURIComponent(`Check out this code: ${url}`)}`, '_blank');
              }}
              className="flex-1 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-muted transition-colors text-center"
            >
              Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
