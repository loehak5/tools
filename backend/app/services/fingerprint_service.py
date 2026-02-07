import random
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.account import Fingerprint

# Constants for generating realistic fingerprints
ANDROID_VERSIONS = [29, 30, 31, 32, 33, 34]
MANUFACTURERS = ["Samsung", "Xiaomi", "Google", "OnePlus", "Oppo", "Vivo"]
MODELS = {
    "Samsung": ["Galaxy S22", "Galaxy S23", "Galaxy S24", "Galaxy A54", "Galaxy Ultra S23"],
    "Xiaomi": ["Mi 12", "Mi 13", "Redmi Note 12", "Redmi Note 13", "POCO F5"],
    "Google": ["Pixel 7", "Pixel 7 Pro", "Pixel 8", "Pixel 8 Pro"],
    "OnePlus": ["OnePlus 10 Pro", "OnePlus 11", "OnePlus 12"],
    "Oppo": ["Find X6", "Reno 10", "A98"],
    "Vivo": ["X90", "V27", "Y100"]
}
RESOLUTIONS = ["1080x2400", "1440x3120", "1080x2340", "1440x2560"]

# App versions and their corresponding version codes (late 2024)
STABLE_VERSIONS = [
    {"version": "316.0.0.38.109", "code": "561498679"},
    {"version": "323.0.0.37.108", "code": "582522774"},
    {"version": "330.0.0.38.107", "code": "603812733"},
]

class FingerprintService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def generate_new_fingerprint_data(self):
        """
        Generates a new random device fingerprint without requiring instagrapi.
        """
        manufacturer = random.choice(MANUFACTURERS)
        model = random.choice(MODELS.get(manufacturer, ["Generic Model"]))
        android_version = random.choice(ANDROID_VERSIONS)
        android_release = str(random.randint(11, 14))
        resolution = random.choice(RESOLUTIONS)
        
        # Select a stable app version and its code
        version_data = random.choice(STABLE_VERSIONS)
        app_version = version_data["version"]
        version_code = version_data["code"]
        
        # Generate a unique device ID
        device_id = str(uuid.uuid4())
        phone_id = str(uuid.uuid4())
        
        device_settings = {
            "app_version": app_version,
            "android_version": android_version,
            "android_release": android_release,
            "dpi": "440dpi",
            "resolution": resolution,
            "manufacturer": manufacturer,
            "model": model,
            "device": model.lower().replace(" ", "_"),
            "cpu": "qcom",
            "version_code": version_code
        }
        
        user_agent = f"Instagram {app_version} Android ({android_version}/{android_release}; 440dpi; {resolution}; {manufacturer}; {model}; {model.lower().replace(' ', '_')}; qcom; en_US; {version_code})"
        
        return {
            "user_agent": user_agent,
            "device_settings": device_settings,
            "screen_resolution": resolution,
            "timezone_offset": random.randint(-12, 12) * 3600,
            "device_id": device_id,
            "phone_id": phone_id
        }

    async def create_fingerprint(self, user_id: int = None) -> Fingerprint:
        try:
            print(f"FingerprintService: Generating fingerprint data for user_id={user_id}...")
            data = self.generate_new_fingerprint_data()
            print(f"FingerprintService: Generated data for {data['device_settings']['manufacturer']} {data['device_settings']['model']}")
            
            fp = Fingerprint(
                user_agent=data["user_agent"],
                screen_resolution=data["screen_resolution"],
                browser_version=data["device_settings"].get("app_version", "unknown"),
                os_type=f"Android {data['device_settings'].get('android_release')}",
                raw_fingerprint=data,
                user_id=user_id
            )
            
            print("FingerprintService: Adding to database...")
            self.db.add(fp)
            await self.db.commit()
            await self.db.refresh(fp)
            print(f"FingerprintService: Fingerprint created with ID: {fp.id}")
            return fp
        except Exception as e:
            print(f"FingerprintService ERROR: {e}")
            import traceback
            traceback.print_exc()
            raise e

    async def get_fingerprint(self, fingerprint_id: int) -> Fingerprint:
        stmt = select(Fingerprint).where(Fingerprint.id == fingerprint_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()
