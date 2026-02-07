
import sys
import os

print(f"CWD: {os.getcwd()}")
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)
print(f"Sys Path: {sys.path}")

try:
    from app.services.instagram_service import InstagramService
    print("Import InstagramService success")
except Exception as e:
    print(f"Import InstagramService failed: {e}")
    import traceback
    traceback.print_exc()

try:
    from app.db.session import AsyncSessionLocal
    print("Import AsyncSessionLocal success")
except Exception as e:
    print(f"Import AsyncSessionLocal failed: {e}")
    import traceback
    traceback.print_exc()
