import { useEffect, useState } from "react";
import { runStrategy } from "../api/cryptoApi";

export default function Strategy() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const executeStrategy = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await runStrategy();
      if (Array.isArray(response.data)) {
        setSignals(response.data);
      } else {
        setSignals([]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to run trading strategy analysis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeStrategy();
  }, []);

  const getSignalBadgeClass = (signal) => {
    switch (signal?.toUpperCase()) {
      case "BUY":
        return "badge badge-buy";
      case "SELL":
        return "badge badge-sell";
      case "HOLD":
        return "badge badge-hold";
      default:
        return "badge badge-neutral";
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1>Strategy Signals</h1>
          <div className="subtitle">Algorithmic trading indicators calculated based on short-term price movements.</div>
        </div>
        <button onClick={executeStrategy} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span>
              Analyzing Market...
            </>
          ) : (
            "Run Strategy Analysis"
          )}
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

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={{ margin: 0 }}>Signal Output Log</h2>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Showing top 15 assets by market cap
          </span>
        </div>

        {loading && signals.length === 0 ? (
          <div className="loading-indicator">Executing indicators strategy engine...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Previous Price</th>
                  <th>Latest Price</th>
                  <th>Price Change</th>
                  <th>Execution Signal</th>
                </tr>
              </thead>
              <tbody>
                {signals.length > 0 ? (
                  signals.slice(0, 15).map((item, index) => {
                    const priceDiff = item.latest_price - item.previous_price;
                    const percentChange = (priceDiff / item.previous_price) * 100;
                    return (
                      <tr key={index}>
                        <td style={{ fontWeight: "700" }}>{item.symbol}</td>
                        <td style={{ fontFamily: "var(--mono)", color: "var(--text-secondary)" }}>
                          ${item.previous_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </td>
                        <td style={{ fontFamily: "var(--mono)", color: "#fff" }}>
                          ${item.latest_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </td>
                        <td style={{ 
                          fontFamily: "var(--mono)", 
                          color: priceDiff > 0 ? "var(--color-green)" : priceDiff < 0 ? "var(--color-red)" : "var(--text-muted)",
                          fontWeight: "500"
                        }}>
                          {priceDiff > 0 ? "+" : ""}
                          {percentChange.toFixed(2)}%
                        </td>
                        <td>
                          <span className={getSignalBadgeClass(item.signal)}>
                            {item.signal}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 20px" }}>
                      No trading signals could be generated. This strategy requires at least 2 historical price points per asset. Try fetching latest data multiple times.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ background: "rgba(139, 92, 246, 0.05)", borderColor: "rgba(139, 92, 246, 0.2)" }}>
        <h3 style={{ marginTop: 0, color: "var(--color-purple)" }}>How the Strategy Works</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6" }}>
          This basic quantitative model checks the two most recent records for each asset symbol in the database:
          <br />
          • If the latest price is <strong>higher</strong> than the previous price, a <strong style={{ color: "var(--color-green)" }}>BUY</strong> signal is issued.
          <br />
          • If the latest price is <strong>lower</strong> than the previous price, a <strong style={{ color: "var(--color-red)" }}>SELL</strong> signal is issued.
          <br />
          • If the price is unchanged, it recommends to <strong style={{ color: "var(--color-yellow)" }}>HOLD</strong>.
        </p>
      </div>
    </div>
  );
}