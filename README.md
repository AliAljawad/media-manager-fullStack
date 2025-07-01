# Media Manager Full Stack

## Project Overview

Media Manager is a full stack web application that allows users to manage, upload, and organize media files (such as images, videos, or audio). The project consists of a Node.js backend server and a React frontend client, designed for easy media management and a modern user experience.

**Key Features:**

- Upload, view, and organize media files
- User-friendly interface built with React
- RESTful API backend using Node.js
- Easily extensible for additional features

---

## Backend (`/Backend`)

This is the backend server for the Media Manager application.

### Prerequisites

- Node.js (v16 or higher recommended)
- npm (comes with Node.js)

### Setup Instructions

1. **Install dependencies**
   ```sh
   cd Backend
   npm install
   ```
Add your Hugging Face API key (I had to use hugging face api because i didn't have OpenAi api key which wasted a lot of time looking for a free alternative)

Create a .env file in the Backend directory and add your Hugging Face API key:   
```sh
HF_API_KEY=your_huggingface_api_key_here
```
2. **Start the server**
   ```sh
   npm start
   ```
   The server will start on the default port (check `index.js` for the port number).

---

## Frontend (`/media-manager`)

This is the frontend (React) application for the Media Manager project.

### Prerequisites

- Node.js (v16 or higher recommended)
- npm (comes with Node.js)

### Setup Instructions

1. **Install dependencies**
   ```sh
   cd media-manager
   npm install
   ```
2. **Start the development server**
   ```sh
   npm run dev
   ```
   The app will be available at the URL shown in the terminal (usually http://localhost:5173).
3. **Build for production**
   ```sh
   npm run build
   ```
   The production-ready files will be in the `dist` folder.

---

## Project Structure

- `/Backend` - Node.js backend server
- `/media-manager` - React frontend application

---
