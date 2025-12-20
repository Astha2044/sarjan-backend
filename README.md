# Sarjan Backend

A production-ready RESTful API backend built with Node.js, Express, and MongoDB. Designed for scalability, maintainability, and performance.

## 🚀 Features

- **MVC Architecture**: Organized structure with controllers, models, and routes.
- **MongoDB & Mongoose**: Efficient data modeling and database interaction.
- **Authentication Ready**: User model and controller setup for easy auth integration.
- **Error Handling**: Centralized error middleware for consistent API responses.
- **Security**: Implements `helmet` for HTTP headers and `cors` for cross-origin support.
- **Linting & Formatting**: Pre-configured with ESLint and Prettier for code quality.
- **Developer Experience**: Nodemon for hot-reloading and dotenv for environment management.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Tools**: ESLint, Prettier, Nodemon

## 📂 Project Structure

```bash
backend/
├── config/             # Database connection setup
├── controllers/        # Request logic and response handling
├── middlewares/        # Error handlers and custom middleware
├── models/             # Mongoose schemas
├── routes/             # API route definitions
├── utils/              # Helper functions (e.g., async handler)
├── app.js              # Express app configuration
├── server.js           # Server entry point
└── .env                # Environment variables
```

## ⚡ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/meet1810/sarjan-backend.git
    cd sarjan-backend
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory (copy from example if available, or use the keys below):
    ```env
    PORT=5000
    MONGO_URI=mongodb://localhost:27017/sarjan_db
    NODE_ENV=development
    ```

### Running the Server

- **Development Mode** (with hot-reload):
    ```bash
    npm run dev
    ```
- **Production Mode**:
    ```bash
    npm start
    ```

## 🧪 Code Quality

- **Lint Code**: `npm run lint`
- **Fix Lint Issues**: `npm run lint:fix`
- **Format Code**: `npm run format`

## 📄 License

This project is open-source and available under the [ISC License](LICENSE).