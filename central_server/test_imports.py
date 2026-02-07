"""
Test if central server can import modules correctly
"""

import sys
try:
    print("Testing imports...")
    
    print("  - Importing settings...", end="")
    from app.core.config import settings
    print(" ✅")
    
    print("  - Importing security...", end="")
    from app.core.security import get_password_hash, generate_api_key
    print(" ✅")
    
    print("  - Importing models...", end="")
    from app.models.client import Client
    print(" ✅")
    
    print("  - Importing routers...", end="")
    from app.routers import clients, auth
    print(" ✅")
    
    print("\n✅ All imports successful!")
    print(f"\nDatabase URL: {settings.get_database_url().split('@')[-1]}")
    
except Exception as e:
    print(f" ❌\n\nError: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
