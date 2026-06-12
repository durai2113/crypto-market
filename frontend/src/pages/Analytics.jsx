/* eslint-disable */
import { useEffect, useState } from "react";
import { getAnalytics } from "../api/cryptoApi";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getAnalytics();
      setData(response.data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError("Failed to fetch analytics metrics from the database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Compute derived metrics
  const rankingData = data?.ranking || [];
  const totalAssets = data?.total_assets || 0;
  
  const highestPriceAsset = rankingData.length > 0 
    ? rankingData[0] 
    : null;

  const averagePrice = rankingData.length > 0
    ? rankingData.reduce((sum, item) => sum + item.price, 0) / rankingData.length
    : 0;

  // Colors for charts
  const colors = ["#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#10b981", "#14b8a6", "#f59e0b", "#eab308"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h1>Market Analytics</h1>
          <div className="subtitle">Visualizing asset ranking, prices, volume distribution, and overall metrics.</div>
        </div>
        <button 
          onClick={loadAnalytics} 
          disabled={loading}
          style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-color)", boxShadow: "none" }}
        >
          Reload Analytics
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-indicator">Computing market analytics...</div>
      ) : rankingData.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "var(--text-muted)" }}>No asset analytics data is available. Try fetching latest data in the Dashboard first.</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Assets Tracked</span>
              <span className="stat-value highlight">{totalAssets}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Highest Value Asset</span>
              <span className="stat-value" style={{ color: "#fff" }}>
                {highestPriceAsset ? `${highestPriceAsset.symbol} ($${highestPriceAsset.price.toLocaleString(undefined, { maximumFractionDigits: 2 })})` : "N/A"}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Average Asset Price</span>
              <span className="stat-value" style={{ color: "var(--color-purple)" }}>
                ${averagePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "24px", marginBottom: "24px" }}>
            {/* Price Area Chart */}
            <div className="card" style={{ minHeight: "420px" }}>
              <h2 style={{ marginBottom: "8px" }}>Asset Price Comparison</h2>
              <div className="subtitle" style={{ marginBottom: "16px" }}>Valuation comparison of top assets (USD)</div>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rankingData.slice(0, 6)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-cyan)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--color-cyan)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis 
                      dataKey="symbol" 
                      tick={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: "600" }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "var(--bg-surface)", 
                        borderColor: "var(--border-color)",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                        color: "var(--text-primary)"
                      }}
                      formatter={(value) => [`$${value.toLocaleString()}`, "Price"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="var(--color-cyan)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Volume Bar Chart */}
            <div className="card" style={{ minHeight: "420px" }}>
              <h2 style={{ marginBottom: "8px" }}>Trading Volume</h2>
              <div className="subtitle" style={{ marginBottom: "16px" }}>24-hour transaction volume distribution</div>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingData.slice(0, 6)} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-purple)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--color-purple)" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                    <XAxis 
                      dataKey="symbol" 
                      tick={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: "600" }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => {
                        if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
                        if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
                        return `$${value.toLocaleString()}`;
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "var(--bg-surface)", 
                        borderColor: "var(--border-color)",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                        color: "var(--text-primary)"
                      }}
                      formatter={(value) => [`$${value.toLocaleString()}`, "24h Volume"]}
                    />
                    <Bar 
                      dataKey="volume" 
                      fill="url(#colorVolume)" 
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <h2 style={{ margin: 0 }}>Market Rankings & Asset Details</h2>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Showing top 5 assets by market valuation
              </span>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Asset Symbol</th>
                    <th>Price Value (USD)</th>
                    <th>Trading Volume (24h)</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingData.slice(0, 5).map((item, index) => (
                    <tr key={item.symbol}>
                      <td style={{ color: "var(--text-muted)", fontWeight: "600" }}>#{index + 1}</td>
                      <td style={{ fontWeight: "700" }}>{item.symbol}</td>
                      <td style={{ color: "var(--color-cyan)", fontFamily: "var(--mono)", fontWeight: "600" }}>
                        ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontFamily: "var(--mono)" }}>
                        ${item.volume ? item.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}