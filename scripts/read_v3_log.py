import sys

try:
    with open('export_v3_log.txt', 'rb') as f:
        content = f.read().decode('utf-16le', errors='ignore')
        print(content)
except Exception as e:
    print(f"Error reading log: {e}")
