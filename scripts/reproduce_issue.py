import requests

url = "http://localhost:8000/api/v1/proxies/"
payload = {
    "name": "Test Template 123",
    "proxy_url": "socks5://user:pass@host:1080",
    "description": "Test description"
}

try:
    print(f"Sending POST to {url} with payload {payload}")
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
