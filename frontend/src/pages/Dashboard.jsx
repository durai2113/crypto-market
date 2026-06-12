/* eslint-disable */
import { useEffect, useState } from "react";
import { getMarkets, fetchMarkets, runStrategy } from "../api/cryptoApi";

export default function Dashboard() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("live"); // "live", "history", "portfolio", or "alerts"
  const [sentiment, setSentiment] = useState(55);
  const [sentimentLabel, setSentimentLabel] = useState("Neutral");
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Mock Portfolio states
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem("mock_balance");
    return saved ? parseFloat(saved) : 10000;
  });
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem("mock_portfolio");
    return saved ? JSON.parse(saved) : {};
  });
  const [tradeSymbol, setTradeSymbol] = useState("BTC");
  const [tradeQty, setTradeQty] = useState(0.1);
  const [tradeError, setTradeError] = useState("");

  // Transaction history state
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("mock_transactions");
    return saved ? JSON.parse(saved) : [];
  });

  // Price alerts state
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem("mock_alerts");
    return saved ? JSON.parse(saved) : [];
  });
  const [alertSymbol, setAlertSymbol] = useState("BTC");
  const [alertCondition, setAlertCondition] = useState("above"); // "above" or "below"
  const [alertTargetPrice, setAlertTargetPrice] = useState("");
  const [toasts, setToasts] = useState([]);

  // Persists
  useEffect(() => {
    localStorage.setItem("mock_balance", balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem("mock_portfolio", JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem("mock_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("mock_alerts", JSON.stringify(alerts));
  }, [alerts]);

  const loadSentiment = async () => {
    try {
      const response = await runStrategy();
      if (Array.isArray(response.data) && response.data.length > 0) {
        const buys = response.data.filter(item => item.signal === "BUY").length;
        const total = response.data.filter(item => item.signal === "BUY" || item.signal === "SELL").length;
        if (total > 0) {
          const score = Math.round((buys / total) * 100);
          setSentiment(score);
          if (score < 20) setSentimentLabel("Extreme Fear 🔴");
          else if (score < 40) setSentimentLabel("Fear 🟠");
          else if (score < 60) setSentimentLabel("Neutral 🟡");
          else if (score < 80) setSentimentLabel("Greed 🟢");
          else setSentimentLabel("Extreme Greed 💚");
        }
      }
    } catch (err) {
      console.error("Failed to compute sentiment index", err);
    }
  };

  const checkAlerts = (latestData) => {
    if (!latestData || latestData.length === 0 || alerts.length === 0) return;

    const triggeredToasts = [];
    const updatedAlerts = alerts.map(alert => {
      if (alert.triggered) return alert;

      const currentAsset = latestData.find(a => a.symbol === alert.symbol);
      if (!currentAsset) return alert;

      let conditionMet = false;
      if (alert.condition === "above" && currentAsset.price >= alert.targetPrice) {
        conditionMet = true;
      } else if (alert.condition === "below" && currentAsset.price <= alert.targetPrice) {
        conditionMet = true;
      }

      if (conditionMet) {
        triggeredToasts.push({
          id: Date.now() + Math.random(),
          symbol: alert.symbol,
          condition: alert.condition,
          targetPrice: alert.targetPrice,
          currentPrice: currentAsset.price
        });
        return { ...alert, triggered: true, triggeredAt: new Date().toISOString() };
      }
      return alert;
    });

    if (triggeredToasts.length > 0) {
      setToasts(prev => [...prev, ...triggeredToasts]);
      setAlerts(updatedAlerts);
    }
  };

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const response = await getMarkets();
      if (Array.isArray(response.data)) {
        const sorted = response.data.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        setAssets(sorted);
        
        // Group to check alerts on latest values
        const latest = [];
        const seen = new Set();
        for (const asset of sorted) {
          if (!seen.has(asset.symbol)) {
            seen.add(asset.symbol);
            latest.push(asset);
          }
        }
        checkAlerts(latest);
      } else {
        setAssets([]);
      }
      loadSentiment();
    } catch (err) {
      console.error(err);
      setError("Failed to connect to backend server. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async () => {
    try {
      setFetching(true);
      setError("");
      await fetchMarkets();
      await loadData(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch fresh market data from API.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadData(false);
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Group assets by symbol to get the latest unique record for each symbol
  const getLatestAssets = () => {
    const latest = [];
    const seen = new Set();
    for (const asset of assets) {
      if (!seen.has(asset.symbol)) {
        seen.add(asset.symbol);
        latest.push(asset);
      }
    }
    return latest;
  };

  const latestAssets = getLatestAssets();

  useEffect(() => {
    if (latestAssets.length > 0 && !latestAssets.some(a => a.symbol === tradeSymbol)) {
      setTradeSymbol(latestAssets[0].symbol);
    }
    if (latestAssets.length > 0 && !latestAssets.some(a => a.symbol === alertSymbol)) {
      setAlertSymbol(latestAssets[0].symbol);
    }
  }, [latestAssets]);

  const handleBuy = () => {
    setTradeError("");
    if (isNaN(tradeQty) || tradeQty <= 0) {
      setTradeError("Please enter a valid quantity.");
      return;
    }
    const assetObj = latestAssets.find(a => a.symbol === tradeSymbol);
    if (!assetObj) {
      setTradeError("Selected asset not found.");
      return;
    }
    const cost = assetObj.price * tradeQty;
    if (cost > balance) {
      setTradeError("Insufficient mock USD funds!");
      return;
    }

    setBalance(prev => prev - cost);
    setPortfolio(prev => {
      const current = prev[tradeSymbol] || { qty: 0, avgPrice: 0 };
      const newQty = current.qty + tradeQty;
      const newAvg = (current.qty * current.avgPrice + cost) / newQty;
      return {
        ...prev,
        [tradeSymbol]: { qty: newQty, avgPrice: newAvg }
      };
    });

    // Add to transaction log
    setTransactions(prev => [
      {
        id: Date.now(),
        type: "BUY",
        symbol: tradeSymbol,
        qty: tradeQty,
        price: assetObj.price,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
  };

  const handleSell = () => {
    setTradeError("");
    if (isNaN(tradeQty) || tradeQty <= 0) {
      setTradeError("Please enter a valid quantity.");
      return;
    }
    const assetObj = latestAssets.find(a => a.symbol === tradeSymbol);
    if (!assetObj) {
      setTradeError("Selected asset not found.");
      return;
    }
    const current = portfolio[tradeSymbol] || { qty: 0, avgPrice: 0 };
    if (tradeQty > current.qty) {
      setTradeError("You do not own enough of this asset to sell!");
      return;
    }

    const earnings = assetObj.price * tradeQty;
    setBalance(prev => prev + earnings);
    setPortfolio(prev => {
      const newQty = current.qty - tradeQty;
      const updated = { ...prev };
      if (newQty <= 0) {
        delete updated[tradeSymbol];
      } else {
        updated[tradeSymbol] = { qty: newQty, avgPrice: current.avgPrice };
      }
      return updated;
    });

    // Add to transaction log
    setTransactions(prev => [
      {
        id: Date.now(),
        type: "SELL",
        symbol: tradeSymbol,
        qty: tradeQty,
        price: assetObj.price,
        timestamp: new Date().toISOString()
      },
      ...prev
    ]);
  };

  const handleResetPortfolio = () => {
    setBalance(10000);
    setPortfolio({});
    setTransactions([]);
    setTradeError("");
  };

  const getPortfolioValue = () => {
    let total = balance;
    Object.entries(portfolio).forEach(([sym, holding]) => {
      const liveAsset = latestAssets.find(a => a.symbol === sym);
      if (liveAsset) {
        total += holding.qty * liveAsset.price;
      } else {
        total += holding.qty * holding.avgPrice;
      }
    });
    return total;
  };

  const totalPortfolioVal = getPortfolioValue();
  const netPnL = totalPortfolioVal - 10000;
  const netPnLPercent = (netPnL / 10000) * 100;

  // Add a price alert
  const handleAddAlert = (e) => {
    e.preventDefault();
    const target = parseFloat(alertTargetPrice);
    if (isNaN(target) || target <= 0) {
      alert("Please enter a valid target price.");
      return;
    }
    const newAlert = {
      id: Date.now(),
      symbol: alertSymbol,
      condition: alertCondition,
      targetPrice: target,
      triggered: false,
      createdAt: new Date().toISOString()
    };
    setAlerts(prev => [newAlert, ...prev]);
    setAlertTargetPrice("");
  };

  const handleDeleteAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleClearTriggeredAlerts = () => {
    setAlerts(prev => prev.filter(a => !a.triggered));
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sparkline Builder
  const renderSparkline = (symbol) => {
    // Filter history points for this symbol and sort ascending chronologically
    const history = assets
      .filter(a => a.symbol === symbol)
      .slice(0, 10) // last 10 points
      .reverse(); // oldest first

    if (history.length < 2) {
      return (
        <svg width="80" height="25" style={{ overflow: "visible" }}>
          <line x1="0" y1="12" x2="80" y2="12" stroke="var(--text-muted)" strokeWidth="1.5" />
        </svg>
      );
    }

    const prices = history.map(h => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min === 0 ? 1 : max - min;

    const width = 80;
    const height = 24;
    const padding = 2;

    const points = history.map((item, index) => {
      const x = (index / (history.length - 1)) * width;
      const y = height - padding - ((item.price - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(" ");

    const isUp = prices[prices.length - 1] >= prices[0];
    const strokeColor = isUp ? "var(--color-green)" : "var(--color-red)";

    return (
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Stats summaries
  const totalVolume24h = latestAssets.reduce((sum, item) => sum + (item.volume || 0), 0);
  const activeAlertsCount = alerts.filter(a => !a.triggered).length;

  // Search filter applied to latestAssets
  const filteredLatestAssets = latestAssets.filter(asset => 
    asset.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Toast Alert Notifications */}
      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000, display: "flex", flexDirection: "column", gap: "10px" }}>
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className="card" 
            style={{ 
              margin: 0, 
              background: "rgba(18, 22, 32, 0.95)", 
              border: "1px solid var(--color-cyan)", 
              boxShadow: "0 0 15px rgba(6, 182, 212, 0.25)",
              padding: "16px",
              minWidth: "280px",
              animation: "fadeIn 0.3s ease-out",
              backdropFilter: "blur(8px)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontWeight: "700", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="badge badge-neutral" style={{ background: "var(--color-cyan)", color: "#000" }}>ALERT</span>
                {toast.symbol} Triggered
              </div>
              <button 
                onClick={() => dismissToast(toast.id)} 
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "16px", padding: 0, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "8px" }}>
              Condition: Price went <strong>{toast.condition}</strong> ${toast.targetPrice.toLocaleString()}
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-cyan)", marginTop: "4px" }}>
              Current Price: ${toast.currentPrice.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1>Crypto Market Dashboard</h1>
          <div className="subtitle">Real-time cryptocurrency tracking and automated execution strategies.</div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)", cursor: "pointer", marginRight: "8px" }}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: "var(--color-cyan)" }}
            />
            Auto-refresh (10s)
          </label>
          <button
            onClick={handleFetch}
            disabled={fetching}
          >
            {fetching ? (
              <>
                <span className="spinner"></span>
                Ingesting Data...
              </>
            ) : (
              "Fetch Latest Market Data"
            )}
          </button>
        </div>
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
      {/* Stats Grid */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        <div className="stat-card" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
          <span className="stat-label">Total Assets Tracked</span>
          <span className="stat-value highlight" style={{ fontSize: "28px", color: "var(--color-cyan)" }}>{latestAssets.length}</span>
        </div>
        <div className="stat-card" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
          <span className="stat-label">Total 24h Volume</span>
          <span className="stat-value" style={{ fontSize: "28px", color: "#fff" }}>
            ${totalVolume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="stat-card" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
          <span className="stat-label">Fear & Greed Index</span>
          <span className="stat-value" style={{ fontSize: "28px", color: "var(--color-purple)" }}>
            {sentiment}%
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{sentimentLabel}</span>
        </div>
        <div className="stat-card" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
          <span className="stat-label">Active Price Alerts</span>
          <span className="stat-value" style={{ fontSize: "28px", color: "var(--color-green)" }}>
            {activeAlertsCount}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("live")}
          style={{
            background: activeTab === "live" ? "linear-gradient(135deg, var(--color-cyan), var(--color-purple))" : "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-color)",
            boxShadow: "none",
            padding: "10px 20px"
          }}
        >
          Live Market Prices ({filteredLatestAssets.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          style={{
            background: activeTab === "history" ? "linear-gradient(135deg, var(--color-cyan), var(--color-purple))" : "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-color)",
            boxShadow: "none",
            padding: "10px 20px"
          }}
        >
          Historical Ingestion Logs ({assets.length})
        </button>
        <button
          onClick={() => setActiveTab("portfolio")}
          style={{
            background: activeTab === "portfolio" ? "linear-gradient(135deg, var(--color-cyan), var(--color-purple))" : "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-color)",
            boxShadow: "none",
            padding: "10px 20px"
          }}
        >
          Mock Portfolio Simulator
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          style={{
            background: activeTab === "alerts" ? "linear-gradient(135deg, var(--color-cyan), var(--color-purple))" : "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-color)",
            boxShadow: "none",
            padding: "10px 20px"
          }}
        >
          Alert Manager ({alerts.length})
        </button>
      </div>

      <div className="card">
        {loading && assets.length === 0 ? (
          <div className="loading-indicator">Loading assets data...</div>
        ) : activeTab === "live" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <h2>Current Asset Valuations</h2>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <input 
                  type="text" 
                  placeholder="Search assets (e.g. BTC)..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "8px 12px", color: "#fff", fontSize: "13px", width: "200px" }}
                />
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Price (USD)</th>
                    <th>Trend</th>
                    <th>Volume (24h)</th>
                    <th>Last Updated</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLatestAssets.length > 0 ? (
                    filteredLatestAssets.map((asset) => (
                      <tr key={asset.symbol}>
                        <td style={{ fontWeight: "700", color: "#fff" }}>
                          <span className="badge badge-neutral" style={{ marginRight: "8px" }}>
                            {asset.symbol}
                          </span>
                        </td>
                        <td style={{ color: "var(--color-cyan)", fontFamily: "var(--mono)", fontWeight: "600" }}>
                          ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </td>
                        <td>
                          {renderSparkline(asset.symbol)}
                        </td>
                        <td style={{ fontFamily: "var(--mono)", color: "var(--text-secondary)" }}>
                          ${asset.volume ? asset.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
                        </td>
                        <td style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                          {new Date(asset.timestamp).toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button 
                            onClick={() => {
                              setTradeSymbol(asset.symbol);
                              setActiveTab("portfolio");
                            }}
                            style={{ padding: "4px 10px", fontSize: "12px", marginRight: "6px", background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.2)", color: "var(--color-cyan)", boxShadow: "none" }}
                          >
                            Trade
                          </button>
                          <button 
                            onClick={() => {
                              setAlertSymbol(asset.symbol);
                              setActiveTab("alerts");
                            }}
                            style={{ padding: "4px 10px", fontSize: "12px", background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)", color: "var(--color-purple)", boxShadow: "none" }}
                          >
                            Set Alert
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 20px" }}>
                        {searchQuery ? "No assets matching search criteria." : "No market data available. Ingest some above."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "history" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2>All Ingested Logs</h2>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Complete database audit log history
              </span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Price (USD)</th>
                    <th>Volume (24h)</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.length > 0 ? (
                    assets.map((asset, index) => (
                      <tr key={asset.id || `${asset.symbol}-${asset.timestamp}-${index}`}>
                        <td style={{ fontWeight: "500" }}>{asset.symbol}</td>
                        <td style={{ fontFamily: "var(--mono)" }}>
                          ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </td>
                        <td style={{ fontFamily: "var(--mono)", color: "var(--text-muted)" }}>
                          ${asset.volume ? asset.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
                        </td>
                        <td style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                          {new Date(asset.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 20px" }}>
                        No log history.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "portfolio" ? (
          /* MOCK PORTFOLIO TAB VIEW */
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "10px" }}>
              <h2>Virtual Trading Simulator</h2>
              <button 
                onClick={handleResetPortfolio}
                style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--color-red)", padding: "6px 14px", fontSize: "12px", boxShadow: "none" }}
              >
                Reset Portfolio & Logs
              </button>
            </div>

            {/* Account Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "24px" }}>
              <div className="stat-card" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                <span className="stat-label">Net Account Value</span>
                <span className="stat-value" style={{ color: "#fff" }}>
                  ${totalPortfolioVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="stat-card" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                <span className="stat-label">USD Cash Balance</span>
                <span className="stat-value" style={{ color: "var(--color-cyan)" }}>
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="stat-card" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                <span className="stat-label">Holdings Value</span>
                <span className="stat-value" style={{ color: "var(--color-purple)" }}>
                  ${(totalPortfolioVal - balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="stat-card" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
                <span className="stat-label">Total Return (PnL)</span>
                <span className={`stat-value ${netPnL >= 0 ? "change-up" : "change-down"}`} style={{ color: netPnL >= 0 ? "var(--color-green)" : "var(--color-red)" }}>
                  {netPnL >= 0 ? "+" : ""}${netPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({netPnLPercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Trade Panel */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "24px" }}>
              <div className="card" style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-color)", margin: 0, padding: "20px" }}>
                <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Execute Transaction</h3>
                
                {tradeError && (
                  <div style={{ color: "var(--color-red)", fontSize: "13px", marginBottom: "12px", fontWeight: "600" }}>
                    ⚠️ {tradeError}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>Choose Asset</label>
                    <select
                      value={tradeSymbol}
                      onChange={(e) => setTradeSymbol(e.target.value)}
                      style={{ width: "100%", background: "var(--bg-surface)", color: "#fff", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", fontSize: "14px" }}
                    >
                      {latestAssets.map(a => (
                        <option key={a.symbol} value={a.symbol}>{a.symbol} (${a.price.toLocaleString(undefined, { maximumFractionDigits: 4 })})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>Order Quantity</label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={tradeQty}
                      onChange={(e) => setTradeQty(parseFloat(e.target.value) || 0)}
                      style={{ width: "100%", background: "var(--bg-surface)", color: "#fff", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", fontSize: "14px" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                    <button onClick={handleBuy} style={{ flex: 1, padding: "10px" }}>
                      Mock BUY
                    </button>
                    <button 
                      onClick={handleSell} 
                      style={{ flex: 1, padding: "10px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--color-red)", boxShadow: "none" }}
                    >
                      Mock SELL
                    </button>
                  </div>
                </div>
              </div>

              {/* Holdings List */}
              <div className="card" style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-color)", margin: 0, padding: "20px", display: "flex", flexDirection: "column" }}>
                <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Current Holdings</h3>
                
                <div className="table-container" style={{ flexGrow: 1, maxHeight: "220px", overflowY: "auto" }}>
                  <table style={{ fontSize: "13px" }}>
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Qty</th>
                        <th>Avg Cost</th>
                        <th>Value</th>
                        <th>ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(portfolio).length > 0 ? (
                        Object.entries(portfolio).map(([sym, holding]) => {
                          const liveAsset = latestAssets.find(a => a.symbol === sym);
                          const currentPrice = liveAsset ? liveAsset.price : holding.avgPrice;
                          const currentVal = holding.qty * currentPrice;
                          const invested = holding.qty * holding.avgPrice;
                          const pnlVal = currentVal - invested;
                          const roi = (pnlVal / invested) * 100;
                          return (
                            <tr key={sym}>
                              <td style={{ fontWeight: "700" }}>{sym}</td>
                              <td style={{ fontFamily: "var(--mono)" }}>{holding.qty}</td>
                              <td style={{ fontFamily: "var(--mono)" }}>${holding.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              <td style={{ fontFamily: "var(--mono)", color: "var(--color-cyan)" }}>${currentVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              <td style={{ fontFamily: "var(--mono)", color: pnlVal >= 0 ? "var(--color-green)" : "var(--color-red)" }}>
                                {pnlVal >= 0 ? "+" : ""}{roi.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px 10px" }}>
                            You own no mock asset shares. Execute a mock BUY order to build your portfolio.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Transaction History Sub-Panel */}
            <div className="card" style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-color)", margin: 0, padding: "20px" }}>
              <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Transaction Audit Logs</h3>
              <div className="table-container" style={{ maxHeight: "240px", overflowY: "auto" }}>
                <table style={{ fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Symbol</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length > 0 ? (
                      transactions.map(tx => (
                        <tr key={tx.id}>
                          <td style={{ color: "var(--text-muted)" }}>{new Date(tx.timestamp).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${tx.type === "BUY" ? "badge-buy" : "badge-sell"}`}>{tx.type}</span>
                          </td>
                          <td style={{ fontWeight: "600" }}>{tx.symbol}</td>
                          <td style={{ fontFamily: "var(--mono)" }}>{tx.qty}</td>
                          <td style={{ fontFamily: "var(--mono)" }}>${tx.price.toLocaleString()}</td>
                          <td style={{ fontFamily: "var(--mono)", color: "var(--text-primary)" }}>${(tx.qty * tx.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>No transactions executed yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ALERT MANAGER TAB VIEW */
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2>Price Threshold Alerts</h2>
              {alerts.some(a => a.triggered) && (
                <button 
                  onClick={handleClearTriggeredAlerts}
                  style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-color)", padding: "6px 14px", fontSize: "12px", boxShadow: "none" }}
                >
                  Clear Triggered Alerts
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "24px" }}>
              {/* Form card */}
              <div className="card" style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-color)", margin: 0, padding: "20px" }}>
                <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Create Price Alert</h3>
                <form onSubmit={handleAddAlert} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>Choose Asset</label>
                    <select
                      value={alertSymbol}
                      onChange={(e) => setAlertSymbol(e.target.value)}
                      style={{ width: "100%", background: "var(--bg-surface)", color: "#fff", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", fontSize: "14px" }}
                    >
                      {latestAssets.map(a => (
                        <option key={a.symbol} value={a.symbol}>{a.symbol} (${a.price.toLocaleString(undefined, { maximumFractionDigits: 4 })})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>Condition</label>
                    <select
                      value={alertCondition}
                      onChange={(e) => setAlertCondition(e.target.value)}
                      style={{ width: "100%", background: "var(--bg-surface)", color: "#fff", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", fontSize: "14px" }}
                    >
                      <option value="above">Price rises above (&gt;=)</option>
                      <option value="below">Price falls below (&lt;=)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>Target Price (USD)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 68000"
                      value={alertTargetPrice}
                      onChange={(e) => setAlertTargetPrice(e.target.value)}
                      style={{ width: "100%", background: "var(--bg-surface)", color: "#fff", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", fontSize: "14px" }}
                    />
                  </div>

                  <button type="submit" style={{ padding: "10px", marginTop: "6px" }}>
                    Create Active Alert
                  </button>
                </form>
              </div>

              {/* Alerts status list */}
              <div className="card" style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-color)", margin: 0, padding: "20px", display: "flex", flexDirection: "column" }}>
                <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Active Alert Registry</h3>
                <div className="table-container" style={{ flexGrow: 1, maxHeight: "250px", overflowY: "auto" }}>
                  <table style={{ fontSize: "13px" }}>
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Condition</th>
                        <th>Target</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.length > 0 ? (
                        alerts.map(a => (
                          <tr key={a.id}>
                            <td style={{ fontWeight: "700" }}>{a.symbol}</td>
                            <td style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>{a.condition}</td>
                            <td style={{ fontFamily: "var(--mono)" }}>${a.targetPrice.toLocaleString()}</td>
                            <td>
                              {a.triggered ? (
                                <span className="badge badge-sell" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--color-red)" }}>Triggered</span>
                              ) : (
                                <span className="badge badge-buy" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--color-green)" }}>Monitoring</span>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button 
                                onClick={() => handleDeleteAlert(a.id)}
                                style={{ padding: "4px 8px", fontSize: "11px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--color-red)", boxShadow: "none" }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px 10px" }}>No price threshold alerts registered.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}