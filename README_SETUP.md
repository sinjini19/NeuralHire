# NeuralHire setup

This package adds a minimal FastAPI backend and root-level project configuration.
It does not replace or modify your existing `frontend` folder.

## Expected project structure

NeuralHire/
  frontend/                 # Existing Vite + React + TypeScript app
  backend/
    app/
      __init__.py
      main.py
    requirements.txt
    .env.example
  .gitignore
  README_SETUP.md

## Start the backend (Windows PowerShell)

From the `NeuralHire` project folder:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open:
- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/health

If PowerShell blocks virtual-environment activation, run:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Then activate again.

## Important Python note

Your current Python version is 3.15.2. Some scientific/ML packages may not yet publish compatible builds for it. This starter intentionally installs only the basic API dependencies. Add PDF parsing and ML packages after checking compatibility in your environment.

## Frontend

Keep your existing Vite frontend. In a separate terminal:
```powershell
cd frontend
npm run dev
```

The frontend runs at http://localhost:5173 and the backend at http://127.0.0.1:8000.

## Environment variables

Copy `backend/.env.example` to `backend/.env` when you are ready to add an AI key.
Use the backend to read secrets. Never put API keys in React/Vite frontend variables.
