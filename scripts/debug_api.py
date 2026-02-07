import requests
import json

url = "http://localhost:8000/api/v1/accounts/"
payload = {
    "username": "debug_user_01",
    "password": "password123",
    "login_method": 1,
    "proxy": None
}

try:
    print(f"Sending POST to {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
