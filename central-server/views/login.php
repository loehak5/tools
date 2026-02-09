<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IG Tools - Automation & Management Console</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <style>
        :root {
            --bg: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.5);
            --primary-gradient: linear-gradient(to right, #6366f1, #a855f7);
            --input-bg: rgba(15, 23, 42, 0.5);
            --text-main: #f8fafc;
            --text-dim: #94a3b8;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
        }

        .login-wrap {
            max-width: 450px;
            width: 100%;
            padding: 20px;
            text-align: center;
        }

        .header-title {
            margin-bottom: 40px;
            animation: fadeInDown 0.8s ease-out;
        }

        .header-title h1 {
            font-size: 3rem;
            font-weight: 800;
            margin: 0;
            background: linear-gradient(to right, #818cf8, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .header-title p {
            color: var(--text-dim);
            font-size: 1.1rem;
            margin-top: 8px;
        }

        .login-card {
            background: var(--card-bg);
            backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 30px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: fadeInUp 0.8s ease-out;
        }

        .form-group {
            text-align: left;
            margin-bottom: 24px;
        }

        .form-group label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-dim);
            margin-bottom: 8px;
            margin-left: 4px;
        }

        .form-group input {
            width: 100%;
            background: var(--input-bg);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 16px;
            box-sizing: border-box;
            color: white;
            font-size: 1rem;
            transition: all 0.2s;
            outline: none;
        }

        .form-group input:focus {
            border-color: #6366f1;
            background: rgba(15, 23, 42, 0.8);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
        }

        .btn-signin {
            width: 100%;
            background: var(--primary-gradient);
            color: white;
            border: none;
            border-radius: 16px;
            padding: 16px;
            font-size: 1.125rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
        }

        .btn-signin:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.5);
        }

        .divider {
            position: relative;
            margin: 32px 0;
            text-align: center;
        }

        .divider::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
        }

        .divider span {
            background: #1e293b;
            padding: 0 12px;
            color: var(--text-dim);
            font-size: 0.875rem;
            position: relative;
        }

        #google-login-btn {
            display: flex;
            justify-content: center;
        }

        .footer-text {
            margin-top: 32px;
            color: var(--text-dim);
            font-size: 0.875rem;
            font-style: italic;
        }

        @keyframes fadeInDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>

<body>
    <div class="login-wrap">
        <div class="header-title">
            <h1>IG Tools</h1>
            <p>Automation & Management Console</p>
        </div>

        <div class="login-card">
            <form id="loginForm">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" placeholder="Masukkan username" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" placeholder="••••••••" required>
                </div>
                <button type="submit" class="btn-signin">Sign In</button>
            </form>

            <div class="divider">
                <span>Or continue with</span>
            </div>

            <div id="g_id_onload"
                data-client_id="826952988399-b1tqd1vc3v7miel3sjqmojmgsbetc17a.apps.googleusercontent.com"
                data-callback="handleGoogleResponse" data-auto_prompt="true">
            </div>

            <div class="g_id_signin" data-type="standard" data-shape="pill" data-theme="outline" data-size="large"
                data-text="signin_with" data-width="320"></div>
        </div>

        <p class="footer-text">Secure Access Gateway v1.0</p>
    </div>

    <script>
        // --- Zero-Click SSO Handshake ---
        window.onload = function () {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('error')) {
                console.warn("⚠️ SSO Handshake failed:", urlParams.get('msg'));
                return;
            }
            const lastAttempt = sessionStorage.getItem('sso_last_attempt');
            if (lastAttempt && (Date.now() - parseInt(lastAttempt) < 5000)) return;
            sessionStorage.setItem('sso_last_attempt', Date.now());

            console.log("🔍 Looking for local session...");
            const backendUrls = [
                'http://127.0.0.1:8000/health',
                'http://localhost:8000/health',
                'http://localhost:5001/health'
            ];

            const tryDiscovery = async () => {
                for (const url of backendUrls) {
                    if (url.includes(window.location.host)) continue;

                    try {
                        const controller = new AbortController();
                        setTimeout(() => controller.abort(), 800);

                        const res = await fetch(url, { signal: controller.signal });
                        if (res.ok) {
                            const data = await res.json();
                            // CRITICAL: Must be the REAL backend, not just some 200 OK HTML
                            if (data && data.status === "healthy") {
                                console.log(`🚀 Real backend found at ${url}!`);
                                const currentUrl = window.location.origin;
                                window.location.href = `http://localhost:5173/sso-handshake?return_to=${encodeURIComponent(currentUrl + '/api/auth.php?action=sso')}`;
                                return;
                            }
                        }
                    } catch (e) { }
                }
                console.log("ℹ️ Auto-login backend not reachable.");
            };
            tryDiscovery();
        };

        // Traditional Login
        document.getElementById('loginForm').addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            fetch('api/auth.php?action=login', {
                method: 'POST',
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        window.location.href = '/';
                    } else {
                        alert(data.message);
                    }
                })
                .catch(err => console.error(err));
        });

        // Google Login Callback
        function handleGoogleResponse(response) {
            const formData = new FormData();
            formData.append('credential', response.credential);

            fetch('api/auth.php?action=verify', {
                method: 'POST',
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        window.location.href = '/';
                    } else {
                        alert('Login gagal: ' + data.message);
                    }
                })
                .catch(err => console.error(err));
        }
    </script>
</body>

</html>