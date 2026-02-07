import requests

# Get all accounts first
print("Getting accounts...")
res = requests.get("http://localhost:8000/api/v1/accounts/")
print(f"Status: {res.status_code}")
accounts = res.json()
print(f"Accounts: {accounts}")

if accounts:
    account_id = accounts[0]["id"]
    print(f"\nDeleting account ID: {account_id}")
    del_res = requests.delete(f"http://localhost:8000/api/v1/accounts/{account_id}")
    print(f"Delete Status: {del_res.status_code}")
    print(f"Delete Response: {del_res.text}")
