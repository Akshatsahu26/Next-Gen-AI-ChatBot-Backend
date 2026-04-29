# Bank Seva Backend

Scalable fintech backend built with Node.js, Express.js, and MongoDB (Mongoose).

## Features

- Transactions APIs with notification creation on debit send
- Spending insights aggregation (monthly, category split, top category, month comparison)
- Fraud risk analysis endpoint
- Loan EMI calculator endpoint
- Complaint management with ticket ID generation
- Notifications listing and read status update
- Secure JWT authentication (login only: email/phone + password)

## Project Structure

```text
backend/
  server.js
  config/db.js
  models/
  controllers/
  routes/
  services/
```

## Environment Variables

Copy `.env.example` to `.env` and update:

- `PORT` - server port (default: `5000`)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - secret key for signing JWT tokens
- `JWT_EXPIRES_IN` - token validity window (default: `1d`)

## Run

Install dependencies and run server:

- `npm install`
- `npm run dev`

## API Endpoints

### Transactions
- `GET /api/transactions`
- `POST /api/transactions/send`
- `GET /api/transactions/insights`

### Fraud
- `POST /api/fraud-check`

### Loan
- `POST /api/loan/calculate`

### Complaint
- `POST /api/complaint`
- `GET /api/complaint`
- `GET /api/complaint/:ticketId`

### Notifications
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/logout` (requires `Authorization: Bearer <token>`)
- `GET /api/protected/dashboard` (requires `Authorization: Bearer <token>`)

## Seed dummy users (optional)

- `npm run seed:users`
