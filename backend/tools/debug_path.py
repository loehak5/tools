import os
import sys

def get_absolute_media_path(media_path: str) -> str:
    # Simulation of config.settings.MEDIA_PATH
    # In Docker, __file__ for config.py is /app/app/core/config.py -> base /app -> /app/media/scheduled
    MEDIA_PATH = "/app/media/scheduled"
    
    if not media_path:
        return ""
        
    if os.path.sep not in media_path and "/" not in media_path and "\\" not in media_path:
        return os.path.join(MEDIA_PATH, media_path)
        
    if media_path.replace("\\", "/").startswith("/app/"):
        return media_path
        
    return media_path

def debug_path():
    # The filename from logs (simulated param)
    filename = "14_1769106705_610881398_17958470487050780_1116313438260687979_n.jpg"
    
    resolved_path = get_absolute_media_path(filename)
    print(f"Filename: '{filename}'")
    print(f"Resolved: '{resolved_path}'")
    
    exists = os.path.exists(resolved_path)
    print(f"EXISTS? {exists}")
    
    # Check directory list again briefly
    d = "/app/media/scheduled"
    if os.path.exists(d):
        files = os.listdir(d)
        if filename in files:
            print("File is IN listdir")
        else:
            print("File is NOT in listdir")
    else:
        print("Dir missing")

if __name__ == "__main__":
    debug_path()
