#!/bin/bash
# Setup script for Instatools Central Server

echo "Setting up Central Server..."
cd central-server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Link .env from backend for database access
if [ -f ../backend/.env ]; then
    cp ../backend/.env .env
    echo ".env copied from backend."
else
    echo "Warning: backend/.env not found. Please create central-server/.env manually."
fi

echo "Setup complete! To run the Central Server:"
echo "source venv/bin/activate"
echo "uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload"
