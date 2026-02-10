<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panduan Instalasi — InstaTools</title>
    <meta name="description"
        content="Panduan lengkap instalasi dan penggunaan InstaTools. Install Git, Python, Node.js, clone repository, dan jalankan aplikasi setiap hari dengan mudah.">
    <meta name="keywords"
        content="panduan instalasi instatools, install git, install python, install nodejs, cara pakai instatools, setup instatools">
    <meta name="author" content="InstaTools">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://instatools.web.id/docs">
    <meta name="theme-color" content="#050a18">

    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://instatools.web.id/docs">
    <meta property="og:title" content="Panduan Instalasi — InstaTools">
    <meta property="og:description"
        content="Panduan lengkap instalasi InstaTools. Dari install Git, Python, Node.js hingga menjalankan aplikasi setiap hari.">
    <meta property="og:site_name" content="InstaTools">
    <meta property="og:locale" content="id_ID">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="Panduan Instalasi — InstaTools">
    <meta name="twitter:description"
        content="Panduan lengkap instalasi InstaTools. Dari install Git, Python, Node.js hingga menjalankan aplikasi.">

    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "Cara Install InstaTools",
        "description": "Panduan lengkap instalasi dan penggunaan InstaTools di Windows",
        "step": [
            {"@type": "HowToStep", "name": "Install Git", "text": "Download dan install Git dari git-scm.com"},
            {"@type": "HowToStep", "name": "Install Python", "text": "Download Python 3.12.7, centang Add Python to PATH saat install"},
            {"@type": "HowToStep", "name": "Install Node.js", "text": "Download dan install Node.js v24.13.0"},
            {"@type": "HowToStep", "name": "Clone Repository", "text": "Buka Git Bash, ketik: git clone https://github.com/loehak5/instatools.git"},
            {"@type": "HowToStep", "name": "Jalankan Maintenance", "text": "Klik 2x file Aktifkan-Maintenance.bat"},
            {"@type": "HowToStep", "name": "Jalankan Aplikasi", "text": "Klik 2x file Mulai-tools.bat"}
        ]
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://instatools.web.id/"},
            {"@type": "ListItem", "position": 2, "name": "Dokumentasi", "item": "https://instatools.web.id/docs"}
        ]
    }
    </script>

    <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap">
    <style>
        *,
        *::before,
        *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg: #050a18;
            --bg-card: rgba(15, 23, 42, 0.6);
            --bg-code: rgba(10, 17, 35, 0.8);
            --primary: #818cf8;
            --primary-bright: #a5b4fc;
            --accent: #22d3ee;
            --accent-green: #10b981;
            --accent-amber: #f59e0b;
            --text: #f8fafc;
            --text-dim: #94a3b8;
            --text-muted: #64748b;
            --border: rgba(129, 140, 248, 0.12);
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.7;
            overflow-x: hidden;
        }

        /* ========== NAVBAR ========== */
        nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
            padding: 16px 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(5, 10, 24, 0.7);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
        }

        .nav-logo {
            font-family: 'Outfit', sans-serif;
            font-size: 1.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-decoration: none;
        }

        .nav-links {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .nav-links a {
            font-size: 0.85rem;
            font-weight: 600;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 12px;
            transition: all 0.3s;
        }

        .nav-link-ghost {
            color: var(--text-dim);
        }

        .nav-link-ghost:hover {
            color: var(--text);
            background: rgba(255, 255, 255, 0.05);
        }

        .nav-link-primary {
            background: linear-gradient(135deg, #6366f1, #818cf8);
            color: #fff;
        }

        .nav-link-primary:hover {
            box-shadow: 0 4px 24px rgba(99, 102, 241, 0.4);
        }

        /* ========== CONTENT ========== */
        .doc-container {
            max-width: 780px;
            margin: 0 auto;
            padding: 120px 24px 80px;
        }

        .doc-header {
            text-align: center;
            margin-bottom: 56px;
        }

        .doc-header h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 2.4rem;
            font-weight: 900;
            margin-bottom: 12px;
        }

        .doc-header h1 span {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .doc-header p {
            color: var(--text-dim);
            font-size: 1rem;
        }

        /* ========== STEPS ========== */
        .step {
            margin-bottom: 40px;
            position: relative;
            padding-left: 36px;
        }

        .step::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 36px;
            bottom: -40px;
            width: 1px;
            background: linear-gradient(to bottom, rgba(129, 140, 248, 0.3), transparent);
        }

        .step:last-child::before {
            display: none;
        }

        .step-marker {
            position: absolute;
            left: 0;
            top: 4px;
            width: 22px;
            height: 22px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            background: rgba(129, 140, 248, 0.15);
            border: 1px solid rgba(129, 140, 248, 0.3);
            color: var(--primary);
        }

        .step h2 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.3rem;
            font-weight: 700;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .step h2 .version {
            font-size: 0.7rem;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 100px;
            background: rgba(34, 211, 238, 0.1);
            border: 1px solid rgba(34, 211, 238, 0.2);
            color: var(--accent);
            font-family: 'JetBrains Mono', monospace;
        }

        .step p {
            color: var(--text-dim);
            font-size: 0.9rem;
            margin-bottom: 12px;
        }

        .step ul {
            list-style: none;
            margin-bottom: 16px;
        }

        .step ul li {
            color: var(--text-dim);
            font-size: 0.88rem;
            padding: 4px 0;
            padding-left: 20px;
            position: relative;
        }

        .step ul li::before {
            content: '→';
            position: absolute;
            left: 0;
            color: var(--primary);
            font-weight: 600;
        }

        /* ========== ALERT ========== */
        .alert {
            padding: 14px 20px;
            border-radius: 14px;
            font-size: 0.85rem;
            font-weight: 500;
            margin-bottom: 16px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }

        .alert-warning {
            background: rgba(245, 158, 11, 0.08);
            border: 1px solid rgba(245, 158, 11, 0.2);
            color: var(--accent-amber);
        }

        .alert-info {
            background: rgba(34, 211, 238, 0.06);
            border: 1px solid rgba(34, 211, 238, 0.15);
            color: var(--accent);
        }

        .alert-icon {
            font-size: 16px;
            flex-shrink: 0;
            margin-top: 1px;
        }

        /* ========== DOWNLOAD BTN ========== */
        .download-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            border-radius: 14px;
            font-size: 0.85rem;
            font-weight: 700;
            text-decoration: none;
            color: #fff;
            transition: all 0.3s;
            border: none;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            margin-bottom: 8px;
            margin-right: 8px;
        }

        .download-btn:hover {
            transform: translateY(-2px);
        }

        .download-git {
            background: linear-gradient(135deg, #f05033, #e44c2a);
            box-shadow: 0 4px 16px rgba(240, 80, 51, 0.3);
        }

        .download-python {
            background: linear-gradient(135deg, #3776ab, #4b8bbe);
            box-shadow: 0 4px 16px rgba(55, 118, 171, 0.3);
        }

        .download-node {
            background: linear-gradient(135deg, #339933, #43853d);
            box-shadow: 0 4px 16px rgba(51, 153, 51, 0.3);
        }

        /* ========== CODE BLOCK ========== */
        .code-block {
            background: var(--bg-code);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 16px 20px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.82rem;
            color: var(--accent);
            overflow-x: auto;
            margin-bottom: 16px;
            position: relative;
        }

        .code-block .code-label {
            position: absolute;
            top: 8px;
            right: 52px;
            font-size: 0.65rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.04);
            color: var(--text-muted);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .copy-btn:hover {
            background: rgba(129, 140, 248, 0.15);
            border-color: rgba(129, 140, 248, 0.3);
            color: var(--primary);
        }

        .copy-btn.copied {
            background: rgba(16, 185, 129, 0.15);
            border-color: rgba(16, 185, 129, 0.3);
            color: var(--accent-green);
        }

        /* ========== SECTION DIVIDER ========== */
        .section-divider {
            text-align: center;
            margin: 56px 0 48px;
            position: relative;
        }

        .section-divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--border), transparent);
        }

        .section-divider span {
            position: relative;
            background: var(--bg);
            padding: 0 24px;
            font-family: 'Outfit', sans-serif;
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--text-muted);
        }

        /* ========== BAT FILE CARD ========== */
        .bat-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 24px 28px;
            margin-bottom: 16px;
            transition: all 0.3s;
        }

        .bat-card:hover {
            border-color: rgba(129, 140, 248, 0.25);
        }

        .bat-card h3 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.05rem;
            font-weight: 700;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .bat-card h3 .bat-name {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            padding: 3px 10px;
            border-radius: 8px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: var(--accent-green);
        }

        .bat-card p {
            color: var(--text-dim);
            font-size: 0.88rem;
        }

        .bat-card ul {
            list-style: none;
            margin-top: 10px;
        }

        .bat-card ul li {
            color: var(--text-dim);
            font-size: 0.85rem;
            padding: 3px 0 3px 20px;
            position: relative;
        }

        .bat-card ul li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: var(--accent-green);
            font-weight: 700;
        }

        /* ========== FOOTER ========== */
        footer {
            text-align: center;
            padding: 40px 24px;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.8rem;
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 768px) {
            nav {
                padding: 12px 16px;
            }

            .nav-logo {
                font-size: 1.2rem;
            }

            .nav-links a {
                padding: 8px 14px;
                font-size: 0.8rem;
            }

            .doc-header h1 {
                font-size: 1.8rem;
            }

            .step {
                padding-left: 28px;
            }
        }
    </style>
</head>

<body>
    <!-- Navbar -->
    <nav>
        <a href="/" class="nav-logo">InstaTools</a>
        <div class="nav-links">
            <a href="/" class="nav-link-ghost">Home</a>
            <a href="/about" class="nav-link-ghost">About</a>
            <a href="/login" class="nav-link-ghost">Login</a>
            <a href="/billing" class="nav-link-primary">Get Started</a>
        </div>
    </nav>

    <div class="doc-container">
        <!-- Header -->
        <div class="doc-header">
            <h1>Panduan <span>Instalasi</span></h1>
            <p>Setup lengkap untuk menjalankan InstaTools di Windows</p>
        </div>

        <!-- Step 1: Git -->
        <div class="step">
            <div class="step-marker">1</div>
            <h2>Install Git <span class="version">v2.53.0</span></h2>
            <p>Git digunakan untuk mengambil dan mengupdate project dari repository.</p>
            <ul>
                <li>Download installer dari website resmi</li>
                <li>Jalankan installer, klik <strong>Next</strong> sampai selesai (default settings)</li>
            </ul>
            <a href="https://git-scm.com/downloads/win" target="_blank" class="download-btn download-git">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download Git for Windows
            </a>
        </div>

        <!-- Step 2: Python -->
        <div class="step">
            <div class="step-marker">2</div>
            <h2>Install Python <span class="version">v3.12.7</span></h2>
            <p>Python diperlukan untuk menjalankan backend automation engine.</p>

            <div class="alert alert-warning">
                <span class="alert-icon">⚠️</span>
                <span><strong>PENTING:</strong> Saat install, <strong>centang kotak "Add Python to PATH"</strong> di
                    bagian bawah layar pertama sebelum klik Install. Jika terlewat, aplikasi tidak akan berjalan.</span>
            </div>

            <ul>
                <li>Download installer dari website resmi</li>
                <li>Centang <strong>"Add Python to PATH"</strong></li>
                <li>Klik <strong>Install Now</strong></li>
            </ul>
            <a href="https://www.python.org/downloads/" target="_blank" class="download-btn download-python">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download Python
            </a>
        </div>

        <!-- Step 3: Node.js -->
        <div class="step">
            <div class="step-marker">3</div>
            <h2>Install Node.js <span class="version">v24.13.0</span></h2>
            <p>Node.js diperlukan untuk menjalankan web interface (frontend).</p>
            <ul>
                <li>Download LTS installer dari website resmi</li>
                <li>Jalankan installer, klik <strong>Next</strong> sampai selesai</li>
            </ul>
            <a href="https://nodejs.org/en/download/" target="_blank" class="download-btn download-node">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download Node.js
            </a>
        </div>

        <!-- Step 4: Clone -->
        <div class="step">
            <div class="step-marker">4</div>
            <h2>Ambil Project</h2>
            <p>Clone repository InstaTools ke komputer Anda.</p>
            <ul>
                <li>Buat folder baru di komputer (misalnya: <strong>Kerjaan</strong>)</li>
                <li>Buka folder tersebut</li>
                <li>Klik kanan di dalam folder → pilih <strong>"Open Git Bash Here"</strong></li>
                <li>Ketik perintah berikut, lalu tekan Enter:</li>
            </ul>
            <div class="code-block">
                <span class="code-label">Git Bash</span>
                <button class="copy-btn" onclick="copyCode(this)" title="Copy">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                </button>
                <span class="code-text">git clone https://github.com/loehak5/instatools.git</span>
            </div>
            <div class="alert alert-info">
                <span class="alert-icon">💡</span>
                <span>Tunggu proses clone selesai. Folder <strong>instatools</strong> akan otomatis terbuat di dalam
                    folder yang Anda pilih.</span>
            </div>
        </div>

        <!-- Divider -->
        <div class="section-divider">
            <span>CARA KERJA SETIAP HARI</span>
        </div>

        <!-- Maintenance -->
        <div class="bat-card">
            <h3>
                🔧 Maintenance
                <span class="bat-name">Aktifkan-Maintenance.bat</span>
            </h3>
            <p>Jalankan file ini <strong>sekali saja</strong> setiap kali menyalakan komputer.</p>
            <ul>
                <li>Buka folder <strong>instatools</strong></li>
                <li>Cari file <strong>Aktifkan-Maintenance.bat</strong></li>
                <li>Klik 2x file tersebut</li>
                <li>Tunggu sebentar — dia akan otomatis update project</li>
                <li>Setelah selesai, jendela akan menutup sendiri</li>
                <li>Tidak perlu dijalankan lagi sampai komputer dimatikan</li>
            </ul>
        </div>

        <!-- Running App -->
        <div class="bat-card">
            <h3>
                🚀 Jalankan Aplikasi
                <span class="bat-name">Mulai-tools.bat</span>
            </h3>
            <p>Jalankan file ini untuk membuka aplikasi InstaTools.</p>
            <ul>
                <li>Buka folder <strong>instatools</strong></li>
                <li>Cari file <strong>Mulai-tools.bat</strong></li>
                <li>Klik 2x file tersebut</li>
                <li>Tunggu sebentar — aplikasi akan otomatis update dan terbuka</li>
                <li>Browser akan terbuka dengan tampilan InstaTools</li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 48px;">
            <a href="/billing" class="download-btn"
                style="background: linear-gradient(135deg, #6366f1, #818cf8); box-shadow: 0 4px 16px rgba(99,102,241,0.3); font-size: 0.9rem; padding: 14px 32px;">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Lihat Subscription Plans
            </a>
        </div>
    </div>

    <!-- Footer -->
    <footer>
        &copy; 2026 InstaTools. All rights reserved.
    </footer>

    <script>
        function copyCode(btn) {
            const text = btn.parentElement.querySelector('.code-text').textContent.trim();
            navigator.clipboard.writeText(text).then(() => {
                btn.classList.add('copied');
                btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
                }, 2000);
            });
        }
    </script>
</body>

</html>