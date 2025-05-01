# 🗣️ Abraham Lincoln Chatbot

This is a full stack historical chatbot project that emulates Abraham Lincoln using LLaMA 3.1-8B Instruct, hosted through Hugging Face's inference API. The frontend is built with Next.js, Tailwind CSS, and TypeScript. The backend is powered by FastAPI and Uvicorn.

---

## 🚀 Features

- Converses in the speaking style of Abraham Lincoln
- Maintains context across multiple turns
- Clean separation of frontend and backend
- LLM-powered using Hugging Face’s hosted API (no GPU setup required)

---

## 🧰 Tech Stack

- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python + Uvicorn
- **Model**: `meta-llama/Llama-3.1-8B-Instruct` (via Hugging Face API)

---

## 🛠️ Setup Instructions

### 🔹 Clone the Repository

```bash
git clone https://github.com/yourusername/historical-chatbot.git
cd historical-chatbot
```

---

### 🔹 Backend Setup

```bash
cd backend
python3 -m venv
source venv/bin/activate
pip install -r requirements.txt
```

> Add your Hugging Face token directly into `main.py` or use a `.env` file (not included in this demo).

Then start the FastAPI server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

### 🔹 Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

This will start the Next.js development server on:

```
http://localhost:3000
```

Make sure the backend is running at:

```
http://localhost:8000
```

---

## 💡 How It Works

- Frontend collects user input and sends it to the backend via a POST request to `/chat/`
- Backend receives the input, formats a structured prompt, and sends it to the LLaMA 3.1 model through Hugging Face’s Inference API
- The model replies in the voice of Abraham Lincoln
- The backend returns only the cleaned, final response to the frontend
- The frontend displays Lincoln’s answer in the chat UI

---

## 📋 Notes

- This project uses prompt engineering and post processing to strip model repetition and preserve only clean, in character responses.
- You must have access to Hugging Face’s LLaMA 3.1 model (`meta-llama/Llama-3.1-8B-Instruct`)
- Responses may take several seconds depending on API latency and `max_new_tokens` setting

---

## ✍️ Author

Created by Jesus Salomon for the Historical Chatbot Project  
Graduate Student, Loyola University Chicago
