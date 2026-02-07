"""
Test script untuk verify Central Server installation
Run this after starting Central Server untuk ensure everything works
"""

import httpx
import sys


def test_central_server(base_url: str = "http://localhost:8001"):
    """Test Central Server endpoints"""
    
    print("="*60)
    print("Testing Central Server Installation")
    print("="*60)
    print(f"Base URL: {base_url}\n")
    
    # Test 1: Health check
    print("1. Testing health endpoint...")
    try:
        response = httpx.get(f"{base_url}/health")
        if response.status_code == 200:
            print("   ✅ Health check passed")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Cannot connect to server: {e}")
        print("   Make sure Central Server is running!")
        return False
    
    # Test 2: Create test client
    print("\n2. Creating test client...")
    try:
        response = httpx.post(
            f"{base_url}/api/v1/clients",
            json={
                "client_name": "test_client_demo",
                "password": "test123",
                "company_name": "Test Company",
                "email": "test@example.com",
                "license_type": "trial",
                "max_accounts": 50,
                "max_proxies": 25
            }
        )
        
        if response.status_code == 200:
            client_data = response.json()
            print("   ✅ Client created successfully")
            print(f"   Client ID: {client_data['id']}")
            print(f"   Client Name: {client_data['client_name']}")
            print(f"   API Key: {client_data['api_key']}")
            client_id = client_data['id']
            client_name = client_data['client_name']
        else:
            print(f"   ❌ Client creation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 3: Client login
    print("\n3. Testing client login...")
    try:
        response = httpx.post(
            f"{base_url}/api/v1/auth/login",
            json={
                "client_name": "test_client_demo",
                "password": "test123",
                "device_info": {
                    "os": "Test OS",
                    "hostname": "test-machine"
                }
            }
        )
        
        if response.status_code == 200:
            auth_data = response.json()
            print("   ✅ Login successful")
            print(f"   Token: {auth_data['access_token'][:50]}...")
            print(f"   Session ID: {auth_data['session_id']}")
            token = auth_data['access_token']
            session_id = auth_data['session_id']
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 4: Report activity
    print("\n4. Testing activity reporting...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = httpx.post(
            f"{base_url}/api/v1/activity/report",
            headers=headers,
            json={
                "activity_type": "test_activity",
                "activity_data": {"test": True},
                "total_accounts": 10,
                "active_accounts": 8
            }
        )
        
        if response.status_code == 200:
            print("   ✅ Activity reported successfully")
        else:
            print(f"   ❌ Activity report failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 5: Heartbeat
    print("\n5. Testing heartbeat...")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = httpx.post(
            f"{base_url}/api/v1/auth/heartbeat",
            headers=headers,
            json={
                "total_accounts": 10,
                "active_accounts": 8,
                "total_proxies": 5,
                "active_proxies": 4
            }
        )
        
        if response.status_code == 200:
            print("   ✅ Heartbeat successful")
        else:
            print(f"   ❌ Heartbeat failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 6: Get analytics
    print("\n6. Testing analytics endpoint...")
    try:
        response = httpx.get(f"{base_url}/api/v1/analytics/clients/{client_id}")
        
        if response.status_code == 200:
            analytics = response.json()
            print("   ✅ Analytics retrieved successfully")
            print(f"   Client: {analytics['client_info']['client_name']}")
            print(f"   Recent activities: {len(analytics['recent_activities'])}")
        else:
            print(f"   ❌ Analytics failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 7: Deactivate client
    print("\n7. Testing client deactivation...")
    try:
        response = httpx.put(f"{base_url}/api/v1/clients/{client_id}/deactivate")
        
        if response.status_code == 200:
            print("   ✅ Client deactivated")
        else:
            print(f"   ❌ Deactivation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 8: Verify client cannot login when deactivated
    print("\n8. Testing login blocked when deactivated...")
    try:
        response = httpx.post(
            f"{base_url}/api/v1/auth/login",
            json={
                "client_name": "test_client_demo",
                "password": "test123"
            }
        )
        
        if response.status_code == 403:
            print("   ✅ Login correctly blocked (403 Forbidden)")
        else:
            print(f"   ❌ Should be blocked but got: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 9: Cleanup - delete test client
    print("\n9. Cleanup - deleting test client...")
    try:
        response = httpx.delete(f"{base_url}/api/v1/clients/{client_id}")
        
        if response.status_code == 200:
            print("   ✅ Test client deleted")
        else:
            print(f"   ⚠️ Deletion warning: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️ Cleanup error: {e}")
    
    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED!")
    print("="*60)
    print("\nCentral Server is working correctly!")
    print("\nNext steps:")
    print("1. Create real client accounts via API or admin panel")
    print("2. Give credentials to your customers")
    print("3. Configure client apps with CENTRAL_SERVER_ENABLED=true")
    print("\nAPI Documentation: " + base_url + "/docs")
    print("="*60)
    return True


if __name__ == "__main__":
    # Get base URL from command line or use default
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001"
    
    success = test_central_server(base_url)
    
    if not success:
        print("\n❌ Tests failed! Please check the errors above.")
        sys.exit(1)
    else:
        sys.exit(0)
