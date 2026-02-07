import httpx
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime
import platform
import socket
import uuid

from app.core.config import settings


class CentralServerClient:
    """
    Service untuk komunikasi dengan Central Server.
    Handle authentication, session management, dan reporting.
    """
    
    def __init__(self):
        self.base_url = settings.CENTRAL_SERVER_URL
        self.client_name = settings.CLIENT_NAME
        self.client_password = settings.CLIENT_PASSWORD
        self.auth_token: Optional[str] = None
        self.session_id: Optional[str] = None
        self.is_licensed = False
        self.client_info: Optional[Dict] = None
        self._http_client: Optional[httpx.AsyncClient] = None
    
    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client"""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client
    
    def _get_device_info(self) -> Dict[str, Any]:
        """Get current device information"""
        try:
            return {
                "os": platform.system(),
                "os_version": platform.version(),
                "hostname": socket.gethostname(),
                "machine": platform.machine(),
                "processor": platform.processor()
            }
        except Exception as e:
            print(f"Error getting device info: {e}")
            return {"os": "unknown"}
    
    async def login(self) -> bool:
        """
        Login to central server.
        Returns True if successful, False otherwise.
        """
        try:
            client = await self._get_http_client()
            
            response = await client.post(
                f"{self.base_url}/api/v1/auth/login",
                json={
                    "client_name": self.client_name,
                    "password": self.client_password,
                    "device_info": self._get_device_info()
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.session_id = data["session_id"]
                self.client_info = data["client_info"]
                self.is_licensed = True
                
                print(f"✅ Successfully authenticated with Central Server")
                print(f"   Client: {self.client_name}")
                print(f"   Session ID: {self.session_id}")
                
                return True
            elif response.status_code == 401:
                print(f"❌ Authentication failed: Invalid credentials")
                return False
            elif response.status_code == 403:
                print(f"❌ Authentication failed: Account is disabled")
                return False
            else:
                print(f"❌ Authentication failed: {response.status_code} - {response.text}")
                return False
                
        except httpx.ConnectError:
            print(f"❌ Cannot connect to Central Server at {self.base_url}")
            print(f"   Please check:")
            print(f"   1. Central Server is running")
            print(f"   2. CENTRAL_SERVER_URL in .env is correct")
            print(f"   3. Network connection is available")
            return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    async def logout(self) -> bool:
        """Logout from central server"""
        if not self.auth_token:
            return True
        
        try:
            client = await self._get_http_client()
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            response = await client.post(
                f"{self.base_url}/api/v1/auth/logout",
                headers=headers
            )
            
            if response.status_code == 200:
                self.auth_token = None
                self.session_id = None
                self.is_licensed = False
                print("✅ Logged out from Central Server")
                return True
            else:
                print(f"⚠️ Logout warning: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"⚠️ Logout error: {e}")
            return False
    
    async def check_session(self) -> bool:
        """
        Check if current session is still valid.
        Returns False if session was invalidated (login from another device).
        """
        if not self.auth_token or not self.session_id:
            return False
        
        try:
            client = await self._get_http_client()
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            response = await client.post(
                f"{self.base_url}/api/v1/auth/check-session",
                json={"session_id": self.session_id},
                headers=headers
            )
            
            if response.status_code == 200:
                return True
            elif response.status_code == 401:
                print("⚠️ Session invalidated - another device logged in")
                self.is_licensed = False
                return False
            else:
                return False
                
        except Exception as e:
            print(f"⚠️ Session check error: {e}")
            return True  # Assume valid if can't reach server
    
    async def send_heartbeat(self, stats: Optional[Dict[str, int]] = None) -> bool:
        """
        Send heartbeat to central server with optional stats.
        This updates last_active timestamp on server.
        """
        if not self.auth_token:
            return False
        
        try:
            client = await self._get_http_client()
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            heartbeat_data = stats or {}
            
            response = await client.post(
                f"{self.base_url}/api/v1/auth/heartbeat",
                json=heartbeat_data,
                headers=headers
            )
            
            if response.status_code == 200:
                return True
            else:
                print(f"⚠️ Heartbeat warning: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"⚠️ Heartbeat error: {e}")
            return False
    
    async def report_activity(
        self,
        activity_type: str,
        activity_data: Optional[Dict] = None,
        total_accounts: Optional[int] = None,
        active_accounts: Optional[int] = None,
        total_proxies: Optional[int] = None
    ) -> bool:
        """
        Report activity to central server.
        Called when important events happen (account created, task completed, etc.)
        """
        if not self.auth_token:
            return False
        
        try:
            client = await self._get_http_client()
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            payload = {
                "activity_type": activity_type,
                "activity_data": activity_data,
                "total_accounts": total_accounts,
                "active_accounts": active_accounts,
                "total_proxies": total_proxies
            }
            
            response = await client.post(
                f"{self.base_url}/api/v1/activity/report",
                json=payload,
                headers=headers
            )
            
            if response.status_code == 200:
                return True
            elif response.status_code == 401:
                # Session might be invalidated
                print(f"⚠️ Activity report failed: Session invalidated")
                self.is_licensed = False
                return False
            else:
                print(f"⚠️ Activity report warning: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"⚠️ Activity report error: {e}")
            return False
    
    async def close(self):
        """Close HTTP client"""
        if self._http_client:
            await self._http_client.aclose()


# Singleton instance
_central_client: Optional[CentralServerClient] = None


def get_central_client() -> CentralServerClient:
    """Get singleton instance of CentralServerClient"""
    global _central_client
    if _central_client is None:
        _central_client = CentralServerClient()
    return _central_client
