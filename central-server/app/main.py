from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from app.core.billing_logic import calculate_addon_price, calculate_upgrade_cost

app = FastAPI(title="Instatools Central Server (Landing Page)")

@app.get("/", response_class=HTMLResponse)
async def landing_page():
    return """
    <html>
        <head><title>Instatools - Documentation & Billing</title></head>
        <body style="font-family: Arial, sans-serif; padding: 50px; text-align: center;">
            <h1>Instatools Documentation</h1>
            <p>Welcome to the central landing page. Here you can find documentation and manage your subscription.</p>
            <div style="margin-top: 30px; padding: 20px; border: 1px solid #ccc; display: inline-block;">
                <h3>Go to Billing</h3>
                <p>Login to your account at <b>instatools.web.id/billing</b> to purchase a plan.</p>
            </div>
            <hr>
            <h2>Installation Guide</h2>
            <p>1. Download the app<br>2. Install Python 3.12<br>3. Run the app on localhost:8000</p>
        </body>
    </html>
    """

@app.get("/health")
async def health():
    return {"status": "central server is healthy"}

# Placeholder for Billing API integration
@app.post("/api/billing/calculate-upgrade")
async def get_upgrade(current_price: float, duration: int, remaining: int, new_price: float):
    return {"cost": calculate_upgrade_cost(current_price, duration, remaining, new_price)}
