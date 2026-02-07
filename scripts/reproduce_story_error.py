import requests
import os

# Create a dummy image file
with open("test_image.jpg", "wb") as f:
    f.write(b"dummy image content")

url = "http://localhost:8000/api/v1/tasks/story"
files = {
    "media": ("test_image.jpg", open("test_image.jpg", "rb"), "image/jpeg")
}
data = {
    "account_id": "1", # Assuming account ID 1 exists, if not we might get 404 but checking for 500
    "scheduled_at": "2024-01-01T12:00:00",
    "caption": "test",
    "execute_now": "false"
}

try:
    response = requests.post(url, files=files, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
finally:
    if os.path.exists("test_image.jpg"):
        os.remove("test_image.jpg")
