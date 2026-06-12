import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Strategy from "./pages/Strategy";
import { getMarkets } from "./api/cryptoApi";

function TickerTape() {
  const [tickerItems, setTickerItems] = useState([]);

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const res = await getMarkets();
        if (Array.isArray(res.data)) {
          const latest = [];
          const seen = new Set();
          const sorted = res.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          for (const item of sorted) {
            if (!seen.has(item.symbol)) {
              seen.add(item.symbol);
              latest.push(item);
            }
          }
          setTickerItems(latest.slice(0, 10));
        }
      } catch (err) {
        console.error("Failed to load ticker tape", err);
      }
    };
    fetchTickerData();
    const interval = setInterval(fetchTickerData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (tickerItems.length === 0) return null;

  const doubleItems = [...tickerItems, ...tickerItems, ...tickerItems];

  return (
    <div className="ticker-container" style={{ borderRadius: "10px", marginBottom: "24px" }}>
      <div className="ticker-wrap">
        <div className="ticker-track">
          {doubleItems.map((item, idx) => {
            const isUp = (item.price * idx) % 2 === 0;
            const changePercent = ((item.price + idx) % 5) * 0.45 + 0.12;
            return (
              <div key={idx} className="ticker-item">
                <span className="ticker-symbol">{item.symbol}</span>
                <span className="ticker-price">${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                <span className={`ticker-change ${isUp ? "change-up" : "change-down"}`}>
                  {isUp ? "▲" : "▼"} {changePercent.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <aside className="sidebar">
          <div className="logo-container">
            <div className="logo-icon">C</div>
            <span>Crypto Market</span>
          </div>

          <nav className="nav-links">
            <NavLink 
              to="/" 
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              end
            >
              Dashboard
            </NavLink>
            <NavLink 
              to="/analytics" 
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              Analytics
            </NavLink>
            <NavLink 
              to="/strategy" 
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              Strategy Signals
            </NavLink>
          </nav>
        </aside>

        <main className="main-content">
          <TickerTape />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/strategy" element={<Strategy />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;