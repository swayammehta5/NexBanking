# 🏦 NexBanking

A modern full-stack banking application built with **React**, **Node.js**, **Express**, and **MongoDB Atlas**. The application provides secure authentication, account management, money transfers, transaction history, and a responsive user interface.

---

## 🚀 Features

- 🔐 Secure JWT Authentication
- 👤 User Registration & Login
- 💳 Account Dashboard
- 💰 Deposit & Withdraw Money
- 🔄 Transfer Funds
- 📜 Transaction History
- 👤 User Profile Management
- 🌙 Dark / ☀️ Light Theme Support
- 📱 Responsive UI
- 🛡️ Secure Backend with Validation & Authentication

---

# 📂 Project Structure

```
NexBanking/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── server.js
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

# 🛠 Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Axios
- React Router
- React Hot Toast
- Lucide React
- Recharts

### Backend

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- bcryptjs
- Helmet
- CORS
- Express Validator
- Winston Logger
- Morgan
- Dotenv

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/swayammehta5/NexBanking.git
cd NexBanking
```

---

## Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
MONGO_URI=YOUR_MONGODB_CONNECTION_STRING
JWT_SECRET=YOUR_SECRET_KEY
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

Backend runs on:

```
http://localhost:5000
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---

# 🔐 Authentication

The application uses **JSON Web Tokens (JWT)** for secure authentication.

Features include:

- User Registration
- Login
- Protected Routes
- Token Verification
- Auto Logout on Invalid Token

---

# 📌 API Endpoints

## Authentication

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Register User |
| POST | `/api/auth/login` | Login User |
| GET | `/api/auth/me` | Current User |
| PUT | `/api/auth/update-profile` | Update Profile |

---

## Account

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/account` | Account Details |
| GET | `/api/account/stats` | Dashboard Statistics |

---

## Transactions

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/transactions` | Transaction History |
| GET | `/api/transactions/recent` | Recent Transactions |
| POST | `/api/transactions/deposit` | Deposit Money |
| POST | `/api/transactions/withdraw` | Withdraw Money |
| POST | `/api/transactions/transfer` | Transfer Money |

---

# 🛡 Security Features

- JWT Authentication
- Password Hashing using bcrypt
- Helmet Security
- CORS Protection
- Rate Limiting
- Input Validation
- MongoDB Injection Protection

---

# 📷 Screenshots

Add your application screenshots here.

Example:

```
screenshots/
    login.png
    dashboard.png
    transactions.png
```

---

# 👨‍💻 Author

**Swayam Mehta**

GitHub: https://github.com/swayammehta5

---

# 📄 License

This project is developed for learning and educational purposes.
