@echo off
title DocuMind AI - Local Enterprise RAG Launcher
echo ======================================================================
echo    DocuMind AI: Serverless Enterprise RAG Console (Zero-Cloud Mode)
echo ======================================================================
echo.

echo [1/3] Activating virtual environment...
call .venv\Scripts\activate.bat

echo [2/3] Starting DocuMind FastAPI Backend on http://127.0.0.1:8000...
start "DocuMind Backend" /min .venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

echo [3/3] Starting DocuMind React Enterprise Console on http://127.0.0.1:5173...
cd frontend
start "DocuMind Frontend" /min npm run dev -- --host 127.0.0.1 --port 5173
cd ..

echo.
echo ======================================================================
echo    System Ready!
echo    - Web Console: http://127.0.0.1:5173/
echo    - API Docs:    http://127.0.0.1:8000/docs
echo ======================================================================
echo.
pause
