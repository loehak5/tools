import json
from instagrapi import Client
from instagrapi.exceptions import TwoFactorRequired, ChallengeRequired, LoginRequired
from app.models.account import Account, Fingerprint
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

class InstagramService:
    def __init__(self, account: Account, fingerprint: Fingerprint):
        self.account = account
        self.fingerprint = fingerprint
        self.client = Client()
        self._setup_client()

    def _setup_client(self):
        """Configures the client with the account's fingerprint and proxy."""
        
        # 1. Set Proxy FIRST (consistent environment)
        if self.account.proxy:
            self.client.set_proxy(self.account.proxy)
            print(f"Proxy set for {self.account.username}: {self.account.proxy[:30]}...")

        # 2. Load Session Cookies if available
        session_loaded = False
        if self.account.cookies:
            try:
                self.client.set_settings(self.account.cookies)
                print(f"Loaded existing session cookies for {self.account.username}")
                session_loaded = True
            except Exception as e:
                print(f"Failed to load cookies for {self.account.username}: {e}")
        
        # 3. Apply Fingerprint only if no session loaded or session load failed
        # This prevents session/device mismatch which triggers checkpoints.
        if not session_loaded:
            fp_data = self.fingerprint.raw_fingerprint
            if fp_data:
                print(f"Applying fingerprint settings for {self.account.username}")
                if "device_settings" in fp_data:
                    self.client.set_device(fp_data["device_settings"])
                
                if "user_agent" in fp_data:
                    self.client.set_user_agent(fp_data["user_agent"])
                
                # if "device_id" in fp_data:
                #     self.client.device_id = fp_data["device_id"]
                # if "phone_id" in fp_data:
                #     self.client.phone_id = fp_data["phone_id"]
                # if "uuid" in fp_data:
                #     self.client.uuid = fp_data["uuid"]
        else:
            print(f"Skipping fingerprint application for {self.account.username} (using settings from session)")

        # Final Verification Log
        print(f"Client configured for {self.account.username}:")
        print(f"  - User-Agent: {self.client.user_agent}")

    def _clean_2fa_seed(self, seed: str) -> str:
        """Clean the 2FA seed - remove spaces and convert to uppercase."""
        if not seed:
            return ""
        return seed.replace(" ", "").replace("-", "").upper()

    def _generate_2fa_code(self) -> str:
        """Generate current TOTP code from seed."""
        import pyotp
        clean_seed = self._clean_2fa_seed(self.account.seed_2fa)
        if not clean_seed:
            raise ValueError("No 2FA seed provided")
        
        totp = pyotp.TOTP(clean_seed)
        code = totp.now()
        print(f"Generated 2FA code: {code} for user {self.account.username}")
        return code

    def login(self, force_full_login: bool = False) -> Dict[str, Any]:
        """
        Attempts to login using the configured method.
        Returns updates for the account session and status.
        Args:
            force_full_login: If True, skip greedy cookie reuse and perform a fresh login.
        """
        updates = {}
        try:
            import random
            import time
            # Add a small random jitter to avoid burst connections
            jitter = random.uniform(1.0, 3.0)
            time.sleep(jitter)
            
            print(f"Starting login for {self.account.username}, method: {self.account.login_method} (jitter: {jitter:.2f}s, force: {force_full_login})")
            
            # GREEDY SESSION REUSE: Always try cookies first if available
            # Unless we are forcing a full login
            if self.account.cookies and not force_full_login:
                try:
                    print("Attempting greedy cookie-based login...")
                    # Settings are already loaded in _setup_client
                    # We just need to verify it with a simple request or login_by_sessionid
                    session_id = self.account.cookies.get("sessionid")
                    if session_id:
                        # login_by_sessionid is fast and doesn't trigger 2FA
                        if self.client.login_by_sessionid(session_id):
                            print(f"Session successfully reused for {self.account.username}")
                            updates["status"] = "active"
                            # Refresh settings in case they updated
                            updates["cookies"] = self.client.get_settings()
                            updates["last_login_state"] = updates["cookies"]
                            return updates
                except Exception as e:
                    print(f"Greedy cookie login failed: {e}. Falling back to configured method.")
                    # Fallback to password/2FA

            # Get password
            password = self.account.password_encrypted
            if not password:
                # If cookie login failed and no password, we are stuck
                raise ValueError("No password provided and session expired/missing")

            # Method 2: 2FA Login
            if self.account.login_method == 2 and self.account.seed_2fa:
                print("Attempting 2FA login...")
                try:
                    verification_code = self._generate_2fa_code()
                    self.client.login(
                        self.account.username, 
                        password,
                        verification_code=verification_code
                    )
                except TwoFactorRequired:
                    print("2FA required, generating new code...")
                    time.sleep(1)
                    verification_code = self._generate_2fa_code()
                    self.client.login(
                        self.account.username, 
                        password,
                        verification_code=verification_code
                    )
            else:
                # Default: Password only
                print("Attempting password login...")
                try:
                    self.client.login(self.account.username, password)
                except TwoFactorRequired:
                    print("Account requires 2FA but no seed provided!")
                    updates["status"] = "challenge"
                    raise ValueError("Account requires 2FA authentication. Please provide 2FA seed.")
            
            # Save new settings/cookies
            print(f"Login successful for {self.account.username}!")
            new_settings = self.client.get_settings()
            updates["cookies"] = new_settings
            updates["last_login_state"] = new_settings
            updates["status"] = "active"
            
            # Threads Detection
            try:
                user_id = self.client.user_id
                user_info = self.client.user_info_v1(user_id)
                threads_id = user_info.get("threads_profile_id")
                if threads_id and str(threads_id) != "0":
                    updates["threads_profile_id"] = str(threads_id)
                    updates["has_threads"] = True
                    print(f"Threads detected for {self.account.username}: {threads_id}")
                else:
                    updates["has_threads"] = False
            except Exception as e:
                print(f"Failed to detect Threads for {self.account.username}: {e}")

            # Post-login warmup
            self.warmup()
            
            return updates
            
        except ChallengeRequired as e:
            updates["status"] = "challenge"
            print(f"Challenge required for {self.account.username}: {e}")
            raise e
        except Exception as e:
            error_msg = str(e)
            if "EOF when reading a line" in error_msg:
                print(f"Connection reset (EOF) for {self.account.username}. Retrying once...")
                import time
                time.sleep(5)
                # Recurse once with a flag to avoid infinite loops? 
                # For simplicity, we can just re-execute the core login logic once
                try:
                    self.client.login(self.account.username, self.account.password_encrypted)
                    print(f"Login successful for {self.account.username} after EOF retry!")
                    updates["cookies"] = self.client.get_settings()
                    updates["last_login_state"] = self.client.get_settings()
                    updates["status"] = "active"
                    return updates
                except Exception as retry_e:
                    print(f"Retry failed for {self.account.username}: {retry_e}")
                    raise retry_e

            updates["status"] = "failed"
            print(f"Login failed for {self.account.username}: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            raise e

    def check_session(self) -> Dict[str, Any]:
        """
        Checks if the current session is valid.
        Returns updates status.
        """
        updates = {}
        try:
            print(f"Checking session for {self.account.username}...")
            # Try to fetch some private data to verify session
            self.client.get_timeline_feed()
            updates["status"] = "active"
            print(f"Session valid for {self.account.username}")
            
            # Threads Detection during check
            try:
                user_info = self.client.user_info_v1(self.client.user_id)
                threads_id = user_info.get("threads_profile_id")
                if threads_id and str(threads_id) != "0":
                    updates["threads_profile_id"] = str(threads_id)
                    updates["has_threads"] = True
                else:
                    updates["has_threads"] = False
            except: pass

            return updates
        except LoginRequired:
            updates["status"] = "expired"
            print(f"Session expired for {self.account.username}")
            return updates
        except Exception as e:
            updates["status"] = "failed"
            print(f"Session check failed for {self.account.username}: {e}")
            return updates

    def reconnect(self):
        """Full reset of the client to clear any stale state/attachments."""
        print(f"Reconnecting client for {self.account.username}...")
        self.client = Client()
        self._setup_client()

    def warmup(self):
        """Perform light requests to stabilize the session before hard actions."""
        try:
            print(f"Performing warm-up for {self.account.username}...")
            # Use timeline feed as it's a standard home-page action
            self.client.get_timeline_feed()
            return True
        except Exception as e:
            print(f"Warm-up failed for {self.account.username}: {e}")
            return False

    def post_photo(self, path: str, caption: str, share_to_threads: bool = False):
        extra_data = {}
        if share_to_threads:
            extra_data["share_to_threads"] = True
        return self.client.photo_upload(path, caption, extra_data=extra_data)
        
    def post_reel(self, path: str, caption: str, share_to_threads: bool = False):
        """Upload a video as a Reel."""
        extra_data = {}
        if share_to_threads:
            extra_data["share_to_threads"] = True
        return self.client.clip_upload(path, caption, extra_data=extra_data)

    def post_story(self, path: str, caption: str = "", link: str = None):
        """Upload a photo or video as a Story, optionally with a link."""
        from instagrapi.types import StoryLink
        
        links = []
        if link:
            # Note: instagrapi 2.2.1 uses 'webUri' for StoryLink
            links.append(StoryLink(webUri=link))
            
        # Determine if file is video or image
        is_video = path.lower().endswith(('.mp4', '.mov', '.avi'))
        
        try:
            if is_video:
                result = self.client.video_upload_to_story(path, caption, links=links)
            else:
                result = self.client.photo_upload_to_story(path, caption, links=links)
            
            with open("task_debug.log", "a") as f:
                f.write(f"Story upload successful for {self.account.username}. Result: {result}\n")
            return result
        except Exception as e:
            error_data = getattr(e, 'response', None)
            error_text = error_data.text if error_data else str(e)
            with open("task_debug.log", "a") as f:
                f.write(f"Story upload failed for {self.account.username}. Exception: {type(e).__name__}, Error: {error_text}\n")
            raise e
        
    def like_media(self, media_id: str):
        return self.client.media_like(media_id)

    def share_to_threads(self, media_id: str):
        """Share an existing Instagram post to Threads."""
        # Using instagrapi's internal share method if available, 
        # or a custom implementation if needed.
        # Based on research, the private API uses 'share_to_threads' flag during upload,
        # but for existing media we might need a different endpoint.
        # For now, we will focus on cross-posting during upload.
        print(f"Request to share media {media_id} to Threads (Not yet implemented for separate action)")
        pass
