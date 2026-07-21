# 🏦 NexBanking v3.0 — Full Stack Banking System

Modern banking system with **React** frontend, **Node.js/Express** backend, **MongoDB Atlas**, and a standalone **C++ DSA** library.

---

## 📁 Project Structure

```
nexbanking-v3/
│
├── /backend                     ← Node.js + Express API
│   ├── config/db.js             ← MongoDB Atlas connection
│   ├── controllers/             ← authController, depositController, withdrawController,
│   │                               transferController, transactionHistoryController, accountController
│   ├── middleware/              ← authMiddleware (JWT), errorMiddleware
│   ├── models/                  ← User, Account, Transaction (Mongoose)
│   ├── routes/                  ← authRoutes, accountRoutes, transactionRoutes
│   ├── services/                ← authService (JWT sign/send)
│   ├── utils/                   ← apiResponse, logger (winston)
│   ├── validators/              ← authValidators, transactionValidators
│   ├── server.js                ← Express entry point
│   └── .env.example
│
├── /frontend                    ← React + Vite + TailwindCSS
│   └── src/
│       ├── components/
│       │   ├── auth/            ← ProtectedRoute
│       │   ├── layout/          ← Sidebar, AppLayout
│       │   └── ui/              ← Card, StatCard, TxnBadge, Input, Spinner, ThemeToggle
│       ├── context/             ← AuthContext, ThemeContext (dark/light/sunshine)
│       ├── pages/               ← Login, Register, ForgotPassword, Dashboard,
│       │                           Transactions, History, Profile
│       ├── services/api.js      ← Axios instance with JWT interceptors
│       └── utils/format.js      ← Currency, date, badge helpers
│
└── /dsa                         ← Standalone C++ DSA library
    ├── linkedlist/              ← Doubly linked list (transaction history)
    ├── queue/                   ← Max-heap priority queue (transfer scheduling)
    ├── stack/                   ← Undo/redo stack (operation reversal)
    ├── searching/               ← Binary search + linear search
    ├── sorting/                 ← Merge sort + quick sort
    ├── graphs/                  ← Directed graph (transaction flow, BFS/DFS)
    ├── bankingAlgorithms/       ← Balance calc, running balance, monthly grouping
    ├── main.cpp                 ← Demo runner
    └── Makefile
```

---

## ⚡ Quick Start

### 1 — Backend

```bash
cd nexbanking-v3/backend
npm install
cp .env.example .env        # Atlas URI is pre-filled
npm run dev                 # http://localhost:5000
```

### 2 — Frontend

```bash
cd nexbanking-v3/frontend
npm install
npm run dev                 # http://localhost:5173
```

### 3 — DSA (C++)

```bash
cd nexbanking-v3/dsa

# Option A — Makefile (Linux/macOS/WSL)
make run

# Option B — Direct g++ (Windows/any)
g++ -std=c++17 -Wall -O2 -o nexbank_dsa \
    main.cpp \
    linkedlist/LinkedList.cpp \
    queue/PriorityQueue.cpp \
    stack/UndoStack.cpp \
    searching/Searching.cpp \
    sorting/Sorting.cpp \
    graphs/TransactionGraph.cpp \
    bankingAlgorithms/BankingAlgorithms.cpp

./nexbank_dsa       # Linux/macOS
nexbank_dsa.exe     # Windows
```

**Requires:** g++ 9+ or MSVC 19.29+ with C++17 support.

---

## 🔑 Environment Variables (`backend/.env`)

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://mehtaswayam19_db_user:akQjsAXPZrvdBuWu@nexbanking.mlyrwfe.mongodb.net/bankDB?retryWrites=true&w=majority&appName=NexBanking
JWT_SECRET=nexbanking_super_secret_jwt_key_change_in_production_2024
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 🎨 Themes

Switch themes with the button in the sidebar or top bar:

| Theme      | Description                          |
|------------|--------------------------------------|
| 🌙 Dark    | Deep navy + blue accents (default)   |
| ☀️ Light   | Clean white + blue accents           |
| 🌅 Sunshine | Warm amber + orange accents         |

Theme persists in `localStorage` as `nex_theme`.

---

## 📦 Backend npm Packages

| Package                  | Purpose                          |
|--------------------------|----------------------------------|
| express                  | Web framework                    |
| mongoose                 | MongoDB ODM                      |
| bcryptjs                 | Password hashing (12 rounds)     |
| jsonwebtoken             | JWT auth                         |
| helmet                   | HTTP security headers            |
| cors                     | CORS policy                      |
| express-rate-limit       | Rate limiting                    |
| express-mongo-sanitize   | NoSQL injection prevention       |
| express-validator        | Input validation                 |
| winston                  | Structured logging               |
| compression              | Gzip compression                 |
| morgan                   | HTTP request logger              |
| dotenv                   | Environment variables            |
| uuid                     | Unique ID generation             |

## 📦 Frontend npm Packages

| Package          | Purpose                         |
|------------------|---------------------------------|
| react            | UI framework                    |
| react-dom        | DOM rendering                   |
| react-router-dom | Client-side routing             |
| axios            | HTTP client                     |
| tailwindcss      | Utility CSS framework           |
| react-hot-toast  | Toast notifications             |
| recharts         | Charts (area, pie)              |
| lucide-react     | Icon library                    |

---

## 🧠 C++ DSA Modules

| File                              | Data Structure / Algorithm       | Complexity      |
|-----------------------------------|----------------------------------|-----------------|
| `linkedlist/LinkedList.cpp`       | Doubly Linked List               | O(1) push, O(n) find |
| `queue/PriorityQueue.cpp`         | Max-Heap Priority Queue          | O(log n) enqueue/dequeue |
| `stack/UndoStack.cpp`             | LIFO Stack (undo/redo)           | O(1) push/pop   |
| `searching/Searching.cpp`         | Binary + Linear Search           | O(log n) / O(n) |
| `sorting/Sorting.cpp`             | Merge Sort + Quick Sort          | O(n log n)      |
| `graphs/TransactionGraph.cpp`     | Directed Graph, BFS, DFS, Cycle  | O(V + E)        |
| `bankingAlgorithms/BankingAlgorithms.cpp` | Financial computations  | O(n)            |

---

## 🛡️ Security

- ✅ JWT authentication (7-day expiry)
- ✅ bcrypt password hashing (12 salt rounds)
- ✅ Helmet security headers
- ✅ Rate limiting (100/15min global, 20/15min auth)
- ✅ MongoDB injection sanitization
- ✅ CORS restricted to frontend origin
- ✅ Input validation on all endpoints
- ✅ Auto-logout on 401 responses

---

## 🚀 API Reference

### Auth
```
POST /api/auth/register     Create account + savings account
POST /api/auth/login        Get JWT token
GET  /api/auth/me           Get current user
PUT  /api/auth/update-profile  Update name/phone
```

### Account
```
GET /api/account            Account details
GET /api/account/stats      Stats + chart data
```

### Transactions
```
GET  /api/transactions              History (search/filter/paginate)
GET  /api/transactions/recent       Last 5 transactions
POST /api/transactions/deposit      Deposit funds
POST /api/transactions/withdraw     Withdraw funds
POST /api/transactions/transfer     Transfer to another account
```
