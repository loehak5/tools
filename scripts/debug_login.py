import requests

# Trigger login for ArianaxPalmer (ID 3)
print("Getting accounts...")
res = requests.get("http://localhost:8000/api/v1/accounts/")
accounts = res.json()
print(f"Accounts: {accounts}")

# Find ArianaxPalmer
for acc in accounts:
    if "ArianaxPalmer" in acc.get("username", ""):
        acc_id = acc["id"]
        print(f"\nTriggering login for account ID: {acc_id}")
        login_res = requests.post(f"http://localhost:8000/api/v1/accounts/{acc_id}/login")
        print(f"Login trigger status: {login_res.status_code}")
        print(f"Response: {login_res.text}")
        break
else:
    print("ArianaxPalmer not found")
