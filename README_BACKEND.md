
# Masuma ERP - Manual Installation Guide

This guide explains how to run the system on a standard server or local machine without Docker.

## 1. Prerequisites
Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **MySQL Server** (v8.0)
- **Redis Server** (v6.0 or higher)

## 2. Database Setup
1. Open your MySQL terminal or Workbench.
2. Create the database:
   ```sql
   CREATE DATABASE masuma_db;
   ```

## 3. Backend Setup
Navigate to the `server` folder:

1. **Install Dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file in the `server` root (copy the structure below):
   ```env
   PORT=3000
   NODE_ENV=development
   
   # Database
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=masuma_db
   
   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   # Security
   JWT_SECRET=your_secure_random_string_here
   CORS_ORIGIN=*
   
   # M-Pesa (Use Sandbox creds for dev)
   MPESA_CONSUMER_KEY=...
   MPESA_CONSUMER_SECRET=...
   MPESA_PASSKEY=...
   MPESA_SHORTCODE=174379
   MPESA_CALLBACK_URL=https://your-public-domain.com/api/mpesa/callback
   ```

3. **Initialize Data**:
   Run this script to create tables and the Admin user:
   ```bash
   npm run seed
   ```
   *Default Admin:* `admin@masuma.africa` / `password`

4. **Start Server**:
   ```bash
   npm run dev
   ```
   The API will be live at `http://localhost:3000`.

5. **Start Background Worker** (For Emails):
   Open a new terminal:
   ```bash
   npm run worker
   ```

## 4. Frontend Setup
1. Go to the project root.
2. Ensure `utils/apiClient.ts` points to your backend URL (Default is `http://localhost:3000/api`).
3. Serve the frontend (using Vite, Parcel, or your preferred bundler).
