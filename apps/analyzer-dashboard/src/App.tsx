import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = 'http://localhost:7072/api';
const WS_URL = 'ws://localhost:7071';

interface Spin {
  id: string;
  ts: number;
  bet: number;
  win: number;
  net_win: number;
}

interface Seed {
  id: number;
  ts: number;
  seed: string;
}

interface LiveMetrics {
  metrics: { count: number; totalBet: number; totalWin: number; rtp: number };
  rtpWindow: { size: number; meanNetWin: number; deviationRatio: number };
  seeds: { count: number; lastTs: number | null; avgIntervalMs: number | null };
}

function App() {
  const [spins, setSpins] = useState<Spin[]>([]);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [rtpHistory, setRtpHistory] = useState<{ ts: number; rtp: number }[]>([]);

  useEffect(() => {
    // Fetch initial data
    fetch(`${API_BASE}/spins?limit=500`)
      .then(res => res.json())
      .then(data => {
        setSpins(data.spins || []);
        computeRtpHistory(data.spins || []);
      });

    fetch(`${API_BASE}/seeds`)
      .then(res => res.json())
      .then(data => setSeeds(data.seeds || []));

    // WebSocket for live metrics
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'metrics') {
          setLiveMetrics(msg);
        }
      } catch (_) {}
    };

    return () => ws.close();
  }, []);

  function computeRtpHistory(spinData: Spin[]) {
    if (spinData.length === 0) return;
    const sorted = spinData.slice().sort((a, b) => a.ts - b.ts);
    const windowSize = 100;
    const points: { ts: number; rtp: number }[] = [];
    for (let i = windowSize; i < sorted.length; i += 50) {
      const window = sorted.slice(i - windowSize, i);
      const totalBet = window.reduce((a, s) => a + s.bet, 0);
      const totalWin = window.reduce((a, s) => a + s.win, 0);
      const rtp = totalBet > 0 ? (totalWin / totalBet) * 100 : 0;
      points.push({ ts: window[window.length - 1].ts, rtp });
    }
    setRtpHistory(points);
  }

  const formatTimestamp = (ts: number) => new Date(ts).toLocaleTimeString();

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '2px solid #333', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>🎰 Gameplay Analyzer Dashboard</h1>
        <p style={{ color: '#888', marginTop: '0.5rem' }}>Real-time fairness metrics & seed transparency</p>
      </header>

      {/* Live Metrics Summary */}
      {liveMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <MetricCard title="Total Spins" value={liveMetrics.metrics.count.toLocaleString()} />
          <MetricCard title="Overall RTP" value={`${(liveMetrics.metrics.rtp * 100).toFixed(2)}%`} />
          <MetricCard title="Window RTP (400)" value={`${(liveMetrics.rtpWindow.meanNetWin).toFixed(4)}`} />
          <MetricCard title="Deviation Ratio" value={liveMetrics.rtpWindow.deviationRatio.toFixed(3)} alert={liveMetrics.rtpWindow.deviationRatio > 0.5} />
          <MetricCard title="Seed Rotations" value={liveMetrics.seeds.count.toString()} />
          <MetricCard 
            title="Avg Rotation Interval" 
            value={liveMetrics.seeds.avgIntervalMs ? `${(liveMetrics.seeds.avgIntervalMs / 1000 / 60).toFixed(1)}m` : 'N/A'} 
          />
        </div>
      )}

      {/* RTP Trend Chart */}
      <section style={{ background: '#111', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>📊 RTP Rolling Trend (100-spin windows)</h2>
        {rtpHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={rtpHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="ts" tickFormatter={formatTimestamp} stroke="#888" />
              <YAxis stroke="#888" domain={[80, 110]} label={{ value: 'RTP %', angle: -90, position: 'insideLeft', fill: '#888' }} />
              <Tooltip 
                contentStyle={{ background: '#222', border: '1px solid #444' }}
                labelFormatter={formatTimestamp}
                formatter={(val: number) => [`${val.toFixed(2)}%`, 'RTP']}
              />
              <Legend />
              <Line type="monotone" dataKey="rtp" stroke="#00d4ff" strokeWidth={2} dot={false} name="RTP %" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#666' }}>Insufficient data for trend (need 100+ spins)</p>
        )}
      </section>

      {/* Seed Rotations Timeline */}
      <section style={{ background: '#111', padding: '1.5rem', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>🔑 Seed Rotation History</h2>
        {seeds.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {seeds.slice(-10).reverse().map((s) => (
              <div key={s.id} style={{ background: '#1a1a1a', padding: '0.75rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'monospace', color: '#0ff' }}>{s.seed}</span>
                <span style={{ color: '#888' }}>{new Date(s.ts).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#666' }}>No seed rotations recorded yet</p>
        )}
      </section>
    </div>
  );
}

function MetricCard({ title, value, alert }: { title: string; value: string; alert?: boolean }) {
  return (
    <div style={{ 
      background: alert ? '#331111' : '#111', 
      border: alert ? '2px solid #ff4444' : '1px solid #333',
      padding: '1rem', 
      borderRadius: '8px' 
    }}>
      <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.25rem' }}>{title}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: alert ? '#ff6666' : '#fff' }}>{value}</div>
    </div>
  );
}

export default App;
