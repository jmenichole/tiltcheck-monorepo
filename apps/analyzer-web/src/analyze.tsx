import React, { useEffect, useRef, useState } from 'react';

interface SpinEvent {
  ts: number;
  bet: number;
  payout: number;
  symbols?: string[];
  bonus?: boolean;
}

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8082/ws';

function extractSpinFromDOM(doc: Document): SpinEvent | null {
  // MVP: Try to find bet, payout, symbols, bonus in DOM
  // This is a stub; real selectors depend on casino
  const betEl = doc.querySelector('[data-bet], .bet-amount');
  const payoutEl = doc.querySelector('[data-payout], .win-amount');
  const symbolsEls = Array.from(doc.querySelectorAll('.reel-symbol'));
  const bonusEl = doc.querySelector('.free-spin-counter, [data-bonus]');

  if (!betEl || !payoutEl) return null;
  const bet = parseFloat(betEl.textContent || '0');
  const payout = parseFloat(payoutEl.textContent || '0');
  const symbols = symbolsEls.map(el => el.getAttribute('alt') || el.textContent || '');
  const bonus = !!bonusEl;
  return {
    ts: Date.now(),
    bet,
    payout,
    symbols,
    bonus,
  };
}

export default function AnalyzePage() {
  const [session, setSession] = useState<string>('');
  const [casino, setCasino] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Parse session/casino from URL
    const params = new URLSearchParams(window.location.search);
    setSession(params.get('session') || '');
    setCasino(params.get('casino') || '');
    setStatus('Ready');
  }, []);

  useEffect(() => {
    if (!session || !casino) return;
    wsRef.current = new WebSocket(WS_URL);
    wsRef.current.onopen = () => setStatus('Connected to backend');
    wsRef.current.onclose = () => setStatus('Disconnected');
    wsRef.current.onerror = () => setStatus('WebSocket error');
    return () => { wsRef.current?.close(); };
  }, [session, casino]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const poll = setInterval(() => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        const spin = extractSpinFromDOM(doc);
        if (spin && wsRef.current?.readyState === 1) {
          wsRef.current.send(JSON.stringify({ session, casino, spin }));
          setStatus('Spin sent: ' + JSON.stringify(spin));
        }
      } catch {}
    }, 1000);
    return () => clearInterval(poll);
  }, [session, casino]);

  const casinoUrl = casino === 'stake-us' ? 'https://stake.com/casino' : '';

  return (
    <div style={{ background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: 24 }}>
      <h1>Analyzer Session</h1>
      <div>Status: {status}</div>
      <iframe
        ref={iframeRef}
        src={casinoUrl}
        title="Casino Game"
        style={{ width: '100%', height: 600, border: '2px solid #222', marginTop: 24 }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
