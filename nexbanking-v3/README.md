# 🏦 NexBanking

A modern full-stack banking application built with **React**, **Node.js**, **Express**, **Prisma ORM**, and **PostgreSQL**. The application provides secure authentication, account management, atomic money transfers, transaction history, beneficiary management, 4-digit transaction PIN authorization, and a responsive user interface.

---

## 🚀 Features

- 🔐 **Secure Authentication**: JWT-based session authorization with bcrypt password hashing (12 rounds)
- 🔢 **4-Digit Transaction PIN**: Independent hashed transaction PIN required before every balance-modifying action (deposit, withdraw, transfer)
- 🏦 **Beneficiary Management**: Save, edit, and favorite payees for quick transfers
- ⚛️ **Atomic Financial Operations**: ACID transactions powered by PostgreSQL + Prisma with deadlock-safe row-level locking (`FOR UPDATE`)
- 💳 **Account Dashboard**: Real-time balance, cash flow charts, recent activity, and monthly spending insights
- 💰 **Transactions**: Deposit, withdraw, and peer-to-peer transfers with real-time balance updates
- 📜 **Transaction History & Statements**: Filter, search, paginate, and export statements to PDF or CSV
- 🤖 **AI Assistant**: Conversational financial advisor and automated spending analytics
- 🛡️ **Admin Dashboard**: User management, account freeze/unfreeze, transaction monitoring, and activity audit logs
- 🌙 **Theme Support**: Premium Dark and Light modes with modern typography and animations

---

## 📂 Project Structure

```
NexBanking/
│
├── backend/
│   ├── config/             # Database connection (Prisma Client)
│   ├── controllers/        # Request handling and controller business logic
│   ├── middleware/         # Auth, Admin, Transaction PIN, and Error handlers
│   ├── prisma/             # Prisma schema and seed scripts
│   │   ├── schema.prisma   # PostgreSQL relational data model
│   │   └── seed.js         # Development database seed script
│   ├── routes/             # Express API route declarations
│   ├── services/           # Activity logging, notifications, fraud checks
│   ├── utils/              # Serializers, banking cent arithmetic, loggers
│   ├── validators/         # express-validator schemas
│   ├── server.js           # Server entry point
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/     # UI, Layout, Auth, and Transaction PIN modal
│   │   ├── context/        # Auth and Theme React contexts
│   │   ├── hooks/          # Notification and polling hooks
│   │   ├── pages/          # Dashboard, Transactions, Beneficiaries, Profile, Admin
│   │   ├── services/       # Axios API client
│   │   ├── utils/          # Formatting and helper utilities
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 🛠 Tech Stack

### Frontend
- **React 18** + **Vite**
- **Tailwind CSS** + Custom Design System
- **Axios** (API client with auth interceptors)
- **React Router v6**
- **React Hot Toast**
- **Lucide React** (Icons)
- **Recharts** (Financial charts)

### Backend
- **Node.js** + **Express.js**
- **PostgreSQL** + **Prisma ORM v6**
- **bcryptjs** (Password & Transaction PIN hashing)
- **JSON Web Tokens (JWT)**
- **Helmet** & **CORS**
- **express-rate-limit**
- **express-validator**
- **PDFKit** (Statement PDF generation)
- **Winston** & **Morgan** (Logging)

---

## ⚙️ Local Development Setup

### 1. Prerequisites
- Node.js >= 18
- PostgreSQL server running locally or a remote connection string (e.g. Neon, Supabase, Render PostgreSQL)

### 2. Clone Repository
```bash
git clone https://github.com/swayammehta5/NexBanking.git
cd NexBanking/nexbanking-v3
```

### 3. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file from the template:
```bash
cp .env.example .env
```

Configure `.env`:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/nexbanking?schema=public"
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Run database migrations and seed:
```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations (for development)
npx prisma migrate dev --name init

# (Optional) Seed demo users
node prisma/seed.js
```

Start backend development server:
```bash
npm run dev
```

Backend runs at: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/api/health`

### 4. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🌐 Production Deployment (Render)

### Backend Service on Render:
- **Environment**: Node
- **Build Command**: `npm install && npx prisma generate`
- **Start Command**: `npm start`
- **Pre-Deploy Command (or manual step)**:
  ```bash
  npx prisma migrate deploy
  ```
- **Environment Variables**:
  - `DATABASE_URL`: PostgreSQL connection string from Render PostgreSQL
  - `JWT_SECRET`: Secure random string
  - `CLIENT_URL`: `https://nexbanking-frontend.onrender.com`
  - `NODE_ENV`: `production`

### Frontend Service on Render:
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: `https://nexbanking.onrender.com/api`

---

## 🔐 Security Architecture

- **PostgreSQL Relational Integrity**: Strict foreign key cascading, unique constraints, and numeric precision (`Decimal(19, 2)`) for financial amounts.
- **Atomic Fund Transfers**: Handled via `prisma.$transaction` with deterministic, sorted row-level locks (`FOR UPDATE`) to prevent race conditions and deadlocks.
- **Transaction PIN Protection**:
  - 4-digit numeric PIN verified on backend with `bcrypt.compare`.
  - Stored as `transactionPinHash` (never plaintext, never logged, never exposed in API responses).

---

## 📌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user (optional initial PIN) |
| POST | `/api/auth/login` | Log in user and receive JWT |
| GET | `/api/auth/me` | Retrieve profile and account details |
| PUT | `/api/auth/update-profile` | Update profile information |
| PUT | `/api/auth/transaction-pin` | Set or update 4-digit Transaction PIN |

### Account & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/account` | Current account balance and details |
| GET | `/api/account/stats` | Monthly cashflow statistics |
| GET | `/api/ai/analysis` | Automated spending insights |
| POST | `/api/ai/chat` | AI banking assistant conversation |

### Transactions (Require Transaction PIN)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | Paginated transaction history |
| GET | `/api/transactions/recent` | 5 most recent transactions |
| POST | `/api/transactions/deposit` | Deposit funds (requires `transactionPin`) |
| POST | `/api/transactions/withdraw` | Withdraw funds (requires `transactionPin`) |
| POST | `/api/transactions/transfer` | Fund transfer (requires `transactionPin`) |
| GET | `/api/statement/pdf` | Download PDF account statement |
| GET | `/api/statement/csv` | Download CSV account statement |

### Beneficiaries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/beneficiaries` | List saved beneficiaries |
| POST | `/api/beneficiaries` | Add beneficiary |
| PUT | `/api/beneficiaries/:id` | Update beneficiary |
| DELETE | `/api/beneficiaries/:id` | Remove beneficiary |
| PATCH | `/api/beneficiaries/:id/favorite` | Toggle favorite status |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | System-wide statistics |
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/users/:id` | Get user details and account |
| PATCH | `/api/admin/users/:id/status` | Freeze/unfreeze/deactivate account |
| PATCH | `/api/admin/users/:id/reset-password` | Admin password reset |
| GET | `/api/admin/transactions` | Audit all system transactions |
| GET | `/api/admin/logs` | Audit system activity logs |

---

## 👨‍💻 Author

**Swayam Mehta**  
GitHub: [https://github.com/swayammehta5](https://github.com/swayammehta5)

---

## 📄 License

This project is developed for learning and educational purposes.
