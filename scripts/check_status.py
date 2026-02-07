import requests

res = requests.get("http://localhost:8000/api/v1/accounts/")
accounts = res.json()
for a in accounts:
    print(f"{a['username']}: {a['status']}")
