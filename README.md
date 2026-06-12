# Crypto Market Platform — Developer Setup & Creation Handbook

An end-to-end, high-performance web platform for real-time cryptocurrency tracking, indicator analytics, virtual portfolio trading, and limit threshold alerts. Powered by **FastAPI (Python)**, **PostgreSQL**, and **React (Vite)**.

---

## 🛠️ Step-by-Step Project Creation Log

This section details how the project was initialized and structured from scratch.

### Part 1: Backend Setup (FastAPI & SQLAlchemy)
1. **Initialize Project Directory**:
   ```bash
   mkdir crypto-market
   cd crypto-market
   mkdir backend
   cd backend
   ```
2. **Create Python Virtual Environment**:
   ```bash
   python -m venv venv
   # Activate on Windows:
   venv\Scripts\activate
   # Activate on Unix/macOS:
   source venv/bin/activate
   ```
3. **Install Core Backend Dependencies**:
   ```bash
   pip install fastapi uvicorn sqlalchemy psycopg2-binary requests apscheduler python-dotenv
   pip freeze > requirements.txt
   ```
4. **Define Database Connection & Models**:
   - Set up `app/db/database.py` with SQLAlchemy engines.
   - Set up `app/db/models.py` to declare the SQL Schema mapping:
     - `market_data` table tracking: `id` (PK), `symbol` (Indexed String), `price` (Float), `volume` (Float), and `timestamp` (DateTime).
5. **Implement Background Ingestion Worker**:
   - Coded `app/services/fetcher.py` to pull top 50 assets from CoinGecko API and save prices/volumes to Postgres.
   - Coded `app/services/scheduler.py` using `APScheduler` to run data refreshes every 60 seconds automatically.
6. **Expose REST API Endpoints**:
   - `/markets/` (GET): Pulls historical asset logs.
   - `/markets/fetch` (POST): Explicitly trigger CoinGecko sync.
   - `/analytics/` (GET): Resolves price average and top assets.
   - `/strategy/run` (POST): Compares the two most recent price logs of each asset to generate volatility indicators (BUY, SELL, HOLD).

---

### Part 2: Frontend Setup (React & Vite)
1. **Initialize React App**:
   ```bash
   # From root 'crypto-market/'
   npx -y create-vite@latest frontend --template react
   cd frontend
   npm install
   ```
2. **Install Core UI Dependencies**:
   ```bash
   npm install react-router-dom axios recharts
   ```
3. **Configure Custom Stylings**:
   - Custom-themed `src/index.css` with dark mode variables, Outfit fonts, CSS tables, hover scales, and clean alert toast transitions.
4. **Program Page Components**:
   - `Dashboard.jsx`: Features search bar, transaction list logs, threshold alerts settings with floating notification triggers, and mock trading simulator.
   - `Analytics.jsx`: Houses price Area charts and volume Bar charts styled with custom gradients.
   - `Strategy.jsx`: Displays the top 15 indicator output log signals.

---

## 🚀 Setup & Launch Instructions

Follow these instructions to run the project locally.

### 1. Database Configuration
The platform is built on PostgreSQL. You can use a local PostgreSQL instance or connect to a cloud provider like **Supabase**:

#### Using Supabase:
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings** -> **Database** -> **Connection string** (select **URI** mode).
3. Copy the URI and replace the `[YOUR-PASSWORD]` placeholder with your database password.
4. Update your `backend/.env` file:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   COINGECKO_URL=https://api.coingecko.com/api/v3/coins/markets
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   ```
5. When the backend starts, SQLAlchemy will automatically initialize and construct the `market_data` schema on Supabase.

### 2. Startup Commands

#### A. Backend API Server
```bash
cd backend
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- API will start at: `http://127.0.0.1:8000`
- Interactive Swagger documentation: `http://127.0.0.1:8000/docs`

#### B. Frontend Client
```bash
cd frontend
npm install
npm run dev
```
- Frontend will start at: `http://localhost:5173`

---

## 📈 System Flow & Architecture

- **APIs**: The backend handles queries via FastAPI routes and persists entries using SQLAlchemy ORM.
- **Worker**: An active context scheduler runs in the background to automatically ingest cryptocurrency prices.
- **Frontend State**: The React client uses native local storage persistence (`localStorage`) to save mock portfolio cash, current token shares, and custom alarm triggers, connecting to the API via `src/api/cryptoApi.js`.

---

## ☁️ Production Hosting (Render & Vercel)

### 1. Backend Deployment (Render)
To deploy the FastAPI backend successfully, configure the Render Web Service with the following settings:

- **Root Directory**: `backend` (This navigates Render inside the `backend/` folder at launch)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

*Note: Since the code imports packages starting with `app.` (e.g., `from app.api...`), Python expects the server to run inside the `backend/` folder. If you encounter any module resolution issues, add this environment variable on Render:*
- **Key**: `PYTHONPATH`
- **Value**: `.` (or `/opt/render/project/src/backend`)

### 2. Frontend Deployment (Vercel)
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: `VITE_API_URL` pointing to your Render backend URL (e.g. `https://crypto-market-backend.onrender.com`).
