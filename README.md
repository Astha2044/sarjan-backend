# Sarjan Backend - Multi-Agent Creative Studio

The **Sarjan Backend** is a next-generation creative platform powered by **Advanced AI Agents** (Gemini 2.5 & Gemini 3 Pro). It features a real-time **Multi-Agent Workflow** that acts as a virtual creative team, guiding users from abstract ideas to polished, final deliverables.

## 🌟 Core Features

### 🧠 Multi-Agent Creative Studio
A sophisticated 4-stage pipeline that simulates a professional creative team:
1.  **💡 Idea Agent**: Brainstorms 3 distinct creative concepts or visual angles based on user input.
    *   *Now Context-Aware*: Remembers previous conversation history to handle follow-up requests.
2.  **🧐 Selector Agent** (The "Creative Director"): Analyzes the concepts, picks the **best one**, and provides a critique and improvement plan.
3.  **🔧 Executor Agent** (The "Specialist"):
    *   **For Text**: Writes the full blog post, strategy, or code.
    *   **For Images**: Crafts a highly detailed prompt for the vision model.
4.  **🎤 Presenter / Artist Agent**:
    *   **For Text**: Formats the final output into a professional Markdown report.
    *   **For Images**: Generates high-fidelity visuals using **Gemini 3 Pro** (Vision).

### ⚡ Real-Time Interaction
*   **Socket.IO Integration**: Live updates for every step of the agent pipeline (Brainstorming -> Selecting -> Refining -> Presenting).
*   **Conversation History**: Stateful chat memory allows for natural, iterative refinements ("Make it more blue", "Change the second point").

### 📧 User System
*   **Authentication**: Secure JWT-based auth with HTTP-only cookies.
*   **Email Notifications**: Automated welcome emails via **Nodemailer** (SMTP) upon registration.
*   **Security**: Helmet, CORS, and Rate Limiting enabled by default.

---

## 🛠️ Tech Stack

*   **Runtime**: Node.js & Express.js
*   **AI Models**: Google Gemini 2.5 Flash (Logic/Text), Gemini 3 Pro (Vision/Images)
*   **Database**: MongoDB (Mongoose)
*   **Real-time**: Socket.IO
*   **Email**: Nodemailer
*   **Tools**: ESLint, Prettier, Dotenv

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   MongoDB Instance
*   Google Gemini API Key

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
    Create a `.env` file in the root directory:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    ACCESS_TOKEN_SECRET=your_jwt_secret
    GEMINI_API_KEY=your_gemini_api_key

    # Email Configuration (SMTP)
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your_email@gmail.com
    SMTP_PASSWORD=your_app_password
    ```

### Running the Server

*   **Development** (Hot-reload):
    ```bash
    npm run dev
    ```
*   **Production**:
    ```bash
    npm start
    ```

---

## 📡 API Endpoints

### Authentication
*   `POST /api/auth/register` - Create account & send welcome email
*   `POST /api/auth/login` - Login & receive JWT
*   `POST /api/auth/logout` - Clear cookies

### Chat & AI
*   `POST /api/chat/message` - Send message (triggers background agents)
*   **Socket Events**: Listen to `pipeline_step` for real-time agent feedback.

---

## 🧪 Project Structure

```bash
src/
├── controllers/    # Auth & Chat logic
├── models/         # User, Conversation, Message schemas
├── utils/
│   ├── agent-function.js   # Main Multi-Agent Pipeline Logic
│   ├── background.processor.js # History fetching & Job queue
│   ├── gemini-client.js    # Gemini API Wrapper (Text & Image)
│   └── email.service.js    # Nodemailer Setup
├── routes/         # Express Routes
└── server.js       # Entry Point
```

## 📄 License
MIT License.