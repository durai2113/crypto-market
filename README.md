# Crypto Market Platform

A full-stack web app that tracks cryptocurrency prices in real time, runs basic trading strategies, and lets you simulate trades with virtual money. Built with FastAPI on the backend, PostgreSQL for storage, and React on the frontend.

I built this to learn how real-time data pipelines work — pulling live prices from CoinGecko, storing them in a database, running analysis on top, and displaying everything in a clean dashboard.

---

## What it does

**Dashboard** — Shows live prices for the top 50 cryptocurrencies. You can search by symbol, toggle auto-refresh every 10 seconds, or manually pull fresh data from CoinGecko. There's also a scrolling ticker tape at the top that shows prices updating in real time.

**Portfolio Simulator** — You start with $10,000 in fake money and can buy/sell any tracked crypto at current market prices. It tracks your holdings, calculates profit/loss, and keeps a full transaction log. Everything persists in localStorage so you don't lose your portfolio on refresh.

**Price Alerts** — Set custom alerts like "notify me when BTC goes above $65,000". When the condition is met, you get a toast notification in the corner of the screen. You can manage and delete alerts from the Alert Manager tab.

**Analytics** — Visual charts built with Recharts. There's an area chart comparing prices of the top assets, a bar chart showing 24h trading volumes, and a ranked table of all tracked assets.

**Strategy Signals** — A simple algorithm that compares the two most recent price records for each coin. If the price went up, it says BUY. If it went down, SELL. If unchanged, HOLD. It's basic, but it demonstrates how you'd wire up a strategy engine to a database.

**Background Scheduler** — APScheduler runs in the background and fetches fresh data from CoinGecko every 5 minutes automatically. You don't have to manually click anything — the database keeps growing with historical price data.

---

## Tech stack

- **Backend:** Python, FastAPI, Uvicorn, SQLAlchemy, APScheduler
- **Database:** PostgreSQL (I used Supabase, but any Postgres instance works)
- **Frontend:** React 19, Vite, React Router, Axios, Recharts
- **Data source:** CoinGecko free API
- **Styling:** Custom CSS with a dark theme, Outfit font from Google Fonts

---

## Project structure

```
crypto-market/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS setup, route registration
│   │   ├── api/routes/
│   │   │   ├── market.py        # /markets/ endpoints
│   │   │   ├── analytics.py     # /analytics/ endpoint
│   │   │   └── strategy.py      # /strategy/ endpoints
│   │   ├── core/
│   │   │   └── config.py        # Loads env variables
│   │   ├── db/
│   │   │   ├── database.py      # SQLAlchemy engine and session
│   │   │   └── models.py        # MarketData table definition
│   │   └── services/
│   │       ├── fetcher.py       # Pulls data from CoinGecko, saves to DB
│   │       ├── scheduler.py     # Background job that runs every 5 min
│   │       ├── analytics.py     # Computes rankings using pandas
│   │       └── strategy.py      # BUY/SELL/HOLD logic using SQL window functions
│   ├── .env
│   ├── requirements.txt
│   └── venv/
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx             # React entry point
│   │   ├── App.jsx              # Layout, sidebar, routing, ticker tape
│   │   ├── index.css            # Global styles and design tokens
│   │   ├── api/
│   │   │   └── cryptoApi.js     # Axios client for all API calls
│   │   └── pages/
│   │       ├── Dashboard.jsx    # Main page — prices, portfolio, alerts
│   │       ├── Analytics.jsx    # Charts and rankings
│   │       └── Strategy.jsx     # Trading signal output
│   ├── .env
│   ├── package.json
│   └── vite.config.js
│
├── package.json
├── .gitignore
└── README.md
```

---

## How the pieces connect

```
CoinGecko API
     │
     │  (fetcher.py pulls top 50 coins every 5 min)
     ▼
PostgreSQL Database
     │
     │  (SQLAlchemy ORM)
     ▼
FastAPI Backend  ──────►  REST API (JSON)
     │
     │  (Axios HTTP calls)
     ▼
React Frontend  ──────►  Dashboard / Charts / Strategy
```

The scheduler kicks in when the backend starts. It fetches prices from CoinGecko and writes them to a `market_data` table in Postgres. The frontend calls the FastAPI endpoints to read that data and render it. The portfolio simulator and alerts run entirely on the client side using localStorage.

---

## Getting started

### What you need installed

- Python 3.10 or higher
- Node.js 18 or higher
- PostgreSQL (local install, or a cloud one like Supabase/Neon/Railway)
- Git

### Clone and set up

```bash
git clone https://github.com/durai2113/crypto-market.git
cd crypto-market
```

### Backend

```bash
cd backend
python -m venv venv

# activate the virtual environment
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```env
DATABASE_URL=postgresql://username:password@host:5432/database_name
COINGECKO_URL=https://api.coingecko.com/api/v3/coins/markets
CORS_ORIGINS=*
```

Replace the `DATABASE_URL` with your actual Postgres connection string. The `COINGECKO_URL` stays as is. Set `CORS_ORIGINS=*` for local development — in production you'd restrict it to your frontend domain.

The database table gets created automatically on first startup, so you don't need to run any migrations.

### Frontend

```bash
cd frontend
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

This tells the frontend where the backend is running.

---

## Running it

Open two terminals:

**Terminal 1 — Backend**

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

You should see `Uvicorn running on http://127.0.0.1:8000` and `Starting scheduler...` in the output. That means the API is live and the background data fetcher is running.

You can also check the auto-generated API docs at http://127.0.0.1:8000/docs — FastAPI gives you a nice Swagger UI for free.

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser. That's it — you should see the dashboard.

If there's no data yet, click "Fetch Latest Market Data" on the dashboard. Wait a few seconds, then click it again. After two fetches you'll have enough data for the strategy signals to work too.

---

## API reference

### General

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/` | Health check. Returns `{"message": "Crypto Market API Running"}` |

### Markets

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/markets/` | Returns the latest 10 market records from the database |
| GET | `/markets/prices?symbol=BTC` | Returns the most recent price for a specific coin |
| POST | `/markets/fetch` | Triggers a fresh pull from CoinGecko and saves to DB |

### Analytics

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/analytics/` | Returns all assets ranked by price, with total count and volumes |

### Strategy

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/strategy/` | Simple health check |
| POST | `/strategy/run` | Runs the strategy and returns BUY/SELL/HOLD signals |
| GET | `/strategy/results` | Same as above, but as a GET request |

### Sample response — `/markets/`

```json
[
  {
    "id": 1,
    "symbol": "BTC",
    "price": 63943.0,
    "volume": 31032110360.0,
    "timestamp": "2026-06-12T17:13:07.853911"
  }
]
```

### Sample response — `/strategy/results`

```json
[
  {
    "symbol": "BTC",
    "latest_price": 63943.0,
    "previous_price": 63800.0,
    "signal": "BUY"
  }
]
```

---

## Database

There's just one table:

| Column | Type | Notes |
|--------|------|-------|
| id | Integer | Auto-increment primary key |
| symbol | String | Indexed. Crypto ticker like BTC, ETH, SOL |
| price | Float | Price in USD at time of fetch |
| volume | Float | 24h trading volume |
| timestamp | DateTime | When the record was created |

---

## How the strategy works

It's intentionally simple. The backend runs a SQL query that grabs the two most recent price records for each coin (using a window function with `ROW_NUMBER()`). Then it compares them:

- Latest price **higher** than previous → **BUY**
- Latest price **lower** than previous → **SELL**
- Same price → **HOLD**

This needs at least two rounds of data ingestion to work. If you just set up the project, fetch data twice from the dashboard and then check the Strategy page.

---

## Things to know

- The portfolio simulator is entirely client-side. It uses `localStorage` to save your balance, holdings, and trade history. Clearing your browser data will reset it.
- The scheduler runs every 5 minutes. You'll see `Market data updated successfully` in the backend terminal each time it runs.
- CoinGecko's free API has rate limits. If you hit them, the fetcher will log an error but the app won't crash.
- The frontend auto-refreshes every 10 seconds when the toggle is on. This only reads from your database — it doesn't hit the CoinGecko API.

---

## License

Built for learning and demonstration purposes.
