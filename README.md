# To-Do Web App

*Your modern, AI-powered task management assistant.*

## Overview
The To-Do Web App is a beautifully designed, full-stack task manager built for productivity. Beyond standard CRUD capabilities, it features real-time optimistic UI updates, an AI-powered goal breakdown system via Gemini, a 7-day productivity analytics widget, and a visually stunning dark/light theme toggle with ambient background elements. 

## Features
- **Full CRUD Operations:** Add, edit, delete, and mark tasks as complete with zero page reloads.
- **Smart Filtering:** Quickly toggle between All, Active, and Completed tasks.
- **AI Task Breakdown:** Got a massive goal? Enter it, click "AI", and the Gemini API will instantly break it down into 3-5 manageable sub-tasks.
- **Productivity Analytics:** A 7-day trailing bar chart tracks how many tasks you complete each day.
- **Soft Delete & Undo:** Deleting a task smoothly hides it and offers a 5-second "Undo" toast in case of mistakes.
- **Visual Polish:** Enjoy a smooth dark/light mode toggle that cross-fades the entire palette, alongside slowly drifting ambient background blobs.
- **Completion Confetti:** A delightful confetti burst when you clear your active tasks.

## Tech Stack
*Note: While the original prompt template mentioned plain HTML/JS, this project was explicitly built using the requested modern stack to meet the requirements of Task 3:*
- **Frontend:** React (via Vite)
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas + Mongoose
- **Styling:** Custom CSS with CSS Variables for seamless theming
- **APIs:** Google Gemini API for AI features

## How to Run Locally

### 1. Backend Setup
1. Open a terminal and navigate to the `todo-app/server` directory.
2. Ensure you have a `.env` file with `MONGO_URI` and `GEMINI_API_KEY` defined.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the backend server:
   ```bash
   node server.js
   ```
   *(The server will run on http://localhost:5000)*

### 2. Frontend Setup
1. Open a second terminal and navigate to the `todo-app/client` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *(The frontend will run on http://localhost:5173)*

### 3. All-in-One (Optional)
If you have `concurrently` installed globally (or set up via npx), you can run both servers from the root project directory:
```bash
npx concurrently "cd todo-app/client && npm run dev" "cd todo-app/server && node server.js"
```
