"""
Test full login flow
"""
import requests

base_url = "http://127.0.0.1:8000/api/v1"

print("=" * 70)
print("Testing Full Login Flow")
print("=" * 70)

# Step 1: Login
print("\n1. Attempting login...")
login_data = {
    "username": "admin",
    "password": "admin"
}

try:
    response = requests.post(f"{base_url}/accounts/auth/login", data=login_data)
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        token_data = response.json()
        print(f"   ✅ Login successful!")
        print(f"   Token: {token_data['access_token'][:50]}...")
        
        # Step 2: Get user info
        print("\n2. Getting user info with token...")
        headers = {
            "Authorization": f"Bearer {token_data['access_token']}"
        }
        
        me_response = requests.get(f"{base_url}/accounts/auth/me", headers=headers)
        print(f"   Status: {me_response.status_code}")
        
        if me_response.status_code == 200:
            user_data = me_response.json()
            print(f"   ✅ User info retrieved!")
            print(f"   Username: {user_data.get('username')}")
            print(f"   Role: {user_data.get('role')}")
        else:
            print(f"   ❌ Failed to get user info")
            print(f"   Response: {me_response.text}")
    else:
        print(f"   ❌ Login failed")
        print(f"   Response: {response.text}")
        
except Exception as e:
    print(f"   ❌ Error: {e}")

print("=" * 70)
