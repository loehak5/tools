import requests

# Login
resp = requests.post(
    'http://127.0.0.1:8000/api/v1/accounts/auth/login',
    data={'username': 'admin', 'password': 'admin'}
)
print(f'Login status: {resp.status_code}')
token = resp.json()['access_token']
print(f'Token received: {token[:20]}...')

# Get accounts
resp2 = requests.get(
    'http://127.0.0.1:8000/api/v1/accounts/',
    headers={'Authorization': f'Bearer {token}'}
)
print(f'\nAccounts endpoint status: {resp2.status_code}')
data = resp2.json()
if isinstance(data, list):
    print(f'Total accounts returned: {len(data)}')
    if data:
        print(f'\nFirst 3 accounts:')
        for acc in data[:3]:
            print(f'  - {acc.get("username", "no username")} (ID: {acc.get("id", "no id")})')
else:
    print(f'Response is not a list: {type(data)}')
    print(f'Response: {data}')
