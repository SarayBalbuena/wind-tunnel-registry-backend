# Wind Tunnel Registry Backend 🪂

A specialized backend to track and manage wind tunnel flight time, built with NestJS.

## 🚀 Features

- **Authentication:** Google OAuth2 integration and JWT-based session management (via cookies).
- **Flight Entries:** Create, list, update, and delete flight time entries. Supports bulk import.
- **Reports:** Generate summaries of flight time by type (Individual, Coaching, Shared, etc.).
- **User Management:** Automatic user profile creation on first login.
- **API Documentation:** Fully interactive Swagger UI.

## 🛠 Tech Stack

- **Framework:** [NestJS 11](https://nestjs.com/)
- **Database:** [MongoDB](https://www.mongodb.com/) with Mongoose.
- **Language:** TypeScript.
- **Package Manager:** [pnpm](https://pnpm.io/).
- **Testing:** [Vitest](https://vitest.dev/).
- **Deployment:** [Koyeb](https://www.koyeb.com/) (using Docker).

## 💻 Local Development

### Prerequisites

- Node.js (v20 or higher recommended)
- pnpm (`npm install -g pnpm`)
- MongoDB instance (local or Atlas)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd wind-tunnel-registry-backend
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/wind-tunnel
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   # Page the emailed link opens. Frontend confirm page that POSTs the token to /auth/magic-link/verify
   MAGIC_LINK_CALLBACK_URL=http://localhost:5173/auth/magic-link
   # SMTP for magic-link emails (if SMTP_HOST is unset outside production, the link is logged instead)
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=your_smtp_user
   SMTP_PASS=your_smtp_password
   MAIL_FROM="Wind Tunnel <no-reply@example.com>"
   ```

4. **Run the application:**
   ```bash
   # Development mode
   pnpm run start:dev

   # Production mode
   pnpm run build
   pnpm run start:prod
   ```

## 🧪 Testing

```bash
# Run all tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:coverage
```

## 🔐 Access and Authentication

In production, the API is protected. Follow these steps to access the documentation and endpoints (for the moment only emails accepted):

1.  **Login:** Navigate to `https://substantial-rosalynd-blue-code-1a304522.koyeb.app/auth/google`.
2.  **Authenticate:** Log in with your Google account.
3.  **Automatic Redirect:** Once authenticated, you will be automatically redirected to the **Swagger Documentation** (`/docs`).
4.  **Session:** A secure `access_token` cookie will be set in your browser, allowing you to interact with the API.

## 🚀 Deployment

The application is configured for **Continuous Deployment** on [Koyeb](https://www.koyeb.com/).

- Every push to the `main` branch triggers an automatic build using the `Dockerfile`.
- **Production URL:** [https://substantial-rosalynd-blue-code-1a304522.koyeb.app](https://substantial-rosalynd-blue-code-1a304522.koyeb.app)

## 📄 License

This project is [UNLICENSED](LICENSE).
