# DNF Trading Platform

A full-stack web application for DNF Trading — featuring product catalog management, real-time 3D model customization, order management, and analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, React Three Fiber (Three.js), React Router v7 |
| **Backend** | FastAPI (Python), SQLAlchemy ORM, Uvicorn |
| **Database** | PostgreSQL (primary) / SQLite (dev fallback) |
| **Auth** | JWT (python-jose + passlib/bcrypt) |
| **3D Rendering** | Three.js, @react-three/fiber, @react-three/drei |
| **Styling** | Vanilla CSS (glassmorphism design system) |

---

## Project Structure

`
dnf trd/
├── backend/               # FastAPI backend
│   ├── main.py            # App entry point, routers, CORS, static files
│   ├── database.py        # SQLAlchemy engine + session
│   ├── models.py          # ORM models
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── requirements.txt   # Python dependencies
│   ├── .env               # Backend environment variables
│   ├── utils/auth.py      # JWT helpers
│   └── routes/            # API route modules
│       ├── auth_routes.py
│       ├── product_routes.py
│       ├── category_routes.py
│       ├── cart_routes.py
│       ├── order_routes.py
│       ├── user_routes.py
│       ├── analytics_routes.py
│       └── blender_routes.py
│
├── frontend/              # React + Vite frontend
│   ├── .env               # Frontend environment variables
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── index.css      # Global design system
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── Navbar.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── Footer.jsx
│       │   ├── ProductCustomizer3D.jsx
│       │   └── blender/
│       │       ├── BlenderViewer.jsx
│       │       └── BlenderControls.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Categories.jsx
│       │   ├── ProductDetails.jsx
│       │   ├── Orders.jsx
│       │   ├── Cart.jsx
│       │   ├── Settings.jsx
│       │   ├── Analytics.jsx   (admin only)
│       │   └── Users.jsx       (super admin only)
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   ├── CartContext.jsx
│       │   └── ToastContext.jsx
│       └── services/api.js     # Axios + JWT interceptor
│
└── generated/             # Auto-created - stores generated .glb files
`

---

## Prerequisites

- **Node.js** v18+ — https://nodejs.org
- **Python** 3.10+ — https://python.org
- **PostgreSQL** 14+ — https://www.postgresql.org/download/
- **pip** (bundled with Python)

---

## 1. Database Setup (PostgreSQL)

Open psql and run:

`sql
CREATE DATABASE dnf;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE dnf TO postgres;
`

> To use SQLite instead (zero config), set DATABASE_URL=sqlite:///./dnf.db in backend/.env

---

## 2. Automated Setup & Run (Recommended)

We have provided automated scripts that will set up the Python virtual environment, install all dependencies (backend and frontend), and start the application.

### Setup

Run the appropriate setup script for your Operating System from the project root.

**Windows:**
```bat
setup.bat
```

**macOS / Linux:**
```bash
./setup.sh
```

### Start Servers

Once setup is complete, you can start both the backend and frontend simultaneously.

**Windows:**
```bat
start_app.bat
```

**macOS / Linux:**
```bash
./start_app.sh
```

App URLs:
- Frontend Application: http://localhost:5173
- Backend API Docs: http://localhost:8000/docs

---

## 3. Manual Setup (Fallback)

If you prefer to run the setup manually:

### Backend
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 4. Seed Sample Data (Optional)

```bash
# With venv active, from the backend directory:
python seed_3d_product.py
```

---

## 5. Default Credentials & Roles

Register via the UI, or create a super admin via API:

```bash
curl -X POST http://localhost:8000/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Admin User\",\"email\":\"admin@gmail.com\",\"password\":\"admin123\",\"role\":\"super_admin\"}"
```

| Role | Access |
|---|---|
| user | Catalog, cart, orders, settings |
| admin | Above + analytics dashboard |
| super_admin | Above + user management |

---

## 7. Production Build

` ash
cd "e:\projects\dnf trd\frontend"
npm run build
`

Output in frontend/dist/ — deploy to any static host.

Backend production:
`ash
uvicorn main:app --host 0.0.0.0 --port 8000
`

---

## API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | /auth/register | Register user | Public |
| POST | /auth/login | Login, get JWT | Public |
| GET | /products/ | List products | User+ |
| GET | /products/{id} | Product detail | User+ |
| GET | /categories/ | List categories | User+ |
| GET | /cart/ | Get cart | User+ |
| POST | /cart/add | Add to cart | User+ |
| GET | /orders/ | List orders | User+ |
| POST | /orders/ | Place order | User+ |
| GET | /analytics/dashboard | Stats | Admin+ |
| GET | /users/ | User list | Super Admin |
| POST | /blender/models/{id}/template | Upload .blend/.glb | Admin+ |
| GET | /blender/models/{id}/schema | Customization schema | User+ |
| POST | /blender/models/{id}/generate | Generate model | User+ |
| GET | /generated/{filename} | Serve GLB file | Public |

Full interactive docs: http://localhost:8000/docs

---

## Common Issues & Fixes

### EBUSY: resource busy or locked (Vite HMR)
Occurs when a file is written while Vite's watcher holds it open.
Fix: Press Ctrl+R in the browser to reload. Vite re-processes automatically.

### Failed to fetch studio_small_03_1k.hdr
Was caused by drei's <Environment> fetching HDR from an external CDN.
Already fixed — viewer uses self-contained lighting with no network dependency.

### PostgreSQL connection refused

`ash
# Windows - adjust version number
net start postgresql-x64-14

# macOS
brew services start postgresql
`

### Port already in use

`ash
# Windows - find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Windows - find and kill process on port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F
`

---

## Environment Variables Reference

### backend/.env

| Variable | Description | Example |
|---|---|---|
| DATABASE_URL | DB connection string | postgresql://postgres:password@localhost/dnf |
| JWT_SECRET | JWT signing secret | my_secret_32chars_min |

### frontend/.env

| Variable | Description | Example |
|---|---|---|
| VITE_API_URL | FastAPI backend base URL | http://localhost:8000 |

---

Managed and developed by Atarion Solutions — https://atarionsolutions.com
