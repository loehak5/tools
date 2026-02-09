<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>InstaTools — Instagram Automation & Management Platform</title>
    <meta name="description"
        content="Platform otomasi dan manajemen Instagram terpercaya. Kelola ribuan akun IG dengan mudah, aman, dan efisien. Scheduling, proxy management, bulk import, dan cross posting.">
    <meta name="keywords"
        content="instagram automation, instagram bot, instagram management, bulk instagram, proxy management, auto post instagram, scheduling instagram, instatools">
    <meta name="author" content="InstaTools">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://instatools.web.id/">
    <meta name="theme-color" content="#050a18">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://instatools.web.id/">
    <meta property="og:title" content="InstaTools — Instagram Automation & Management Platform">
    <meta property="og:description"
        content="Platform otomasi dan manajemen Instagram terpercaya. Kelola ribuan akun IG dengan aman, cepat, dan efisien.">
    <meta property="og:site_name" content="InstaTools">
    <meta property="og:locale" content="id_ID">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="InstaTools — Instagram Automation & Management Platform">
    <meta name="twitter:description"
        content="Platform otomasi dan manajemen Instagram terpercaya. Kelola ribuan akun IG dengan aman, cepat, dan efisien.">

    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "InstaTools",
        "url": "https://instatools.web.id/",
        "description": "Platform otomasi dan manajemen Instagram terpercaya.",
        "potentialAction": {
            "@type": "SearchAction",
            "target": "https://instatools.web.id/?q={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    }
    </script>
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "InstaTools",
        "operatingSystem": "Windows",
        "applicationCategory": "BusinessApplication",
        "description": "Platform otomasi dan manajemen Instagram untuk mengelola ribuan akun secara bersamaan.",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "IDR"
        }
    }
    </script>

    <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap">
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
            --primary: #818cf8;
            --primary-bright: #a5b4fc;
            --accent: #22d3ee;
            --accent-green: #10b981;
            --text: #f8fafc;
            --text-dim: #94a3b8;
            --text-muted: #64748b;
            --border: rgba(129, 140, 248, 0.12);
            --glow: rgba(129, 140, 248, 0.08);
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text);
            overflow-x: hidden;
            line-height: 1.6;
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
            transform: translateY(-1px);
        }

        /* ========== HERO ========== */
        .hero {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 120px 24px 80px;
            position: relative;
        }

        .hero::before {
            content: '';
            position: absolute;
            top: -50%;
            left: 50%;
            transform: translateX(-50%);
            width: 800px;
            height: 800px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
            pointer-events: none;
        }

        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 20px;
            border-radius: 100px;
            background: rgba(129, 140, 248, 0.08);
            border: 1px solid rgba(129, 140, 248, 0.2);
            color: var(--primary-bright);
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 32px;
            animation: fadeInUp 0.6s ease-out;
        }

        .hero-badge::before {
            content: '';
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--accent-green);
            box-shadow: 0 0 8px var(--accent-green);
            animation: pulse 2s infinite;
        }

        .hero h1 {
            font-family: 'Outfit', sans-serif;
            font-size: clamp(2.8rem, 6vw, 5rem);
            font-weight: 900;
            line-height: 1.1;
            margin-bottom: 24px;
            animation: fadeInUp 0.8s ease-out 0.1s both;
        }

        .hero h1 .gradient-text {
            background: linear-gradient(135deg, #818cf8 0%, #22d3ee 50%, #a78bfa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-size: 200% auto;
            animation: gradientShift 4s ease infinite;
        }

        .hero p {
            font-size: 1.15rem;
            color: var(--text-dim);
            max-width: 580px;
            margin: 0 auto 40px;
            animation: fadeInUp 0.8s ease-out 0.2s both;
        }

        .hero-actions {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            justify-content: center;
            animation: fadeInUp 0.8s ease-out 0.3s both;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 16px 32px;
            border-radius: 16px;
            font-size: 0.95rem;
            font-weight: 700;
            text-decoration: none;
            cursor: pointer;
            border: none;
            transition: all 0.3s;
            font-family: 'Inter', sans-serif;
        }

        .btn-primary {
            background: linear-gradient(135deg, #6366f1, #818cf8);
            color: #fff;
            box-shadow: 0 4px 24px rgba(99, 102, 241, 0.3);
        }

        .btn-primary:hover {
            box-shadow: 0 8px 40px rgba(99, 102, 241, 0.5);
            transform: translateY(-2px);
        }

        .btn-ghost {
            background: rgba(255, 255, 255, 0.04);
            color: var(--text-dim);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-ghost:hover {
            background: rgba(255, 255, 255, 0.08);
            color: var(--text);
            border-color: rgba(255, 255, 255, 0.2);
        }

        /* ========== STATS BAR ========== */
        .stats-bar {
            display: flex;
            justify-content: center;
            gap: 48px;
            padding: 48px 24px;
            animation: fadeInUp 0.8s ease-out 0.4s both;
        }

        .stat-item {
            text-align: center;
        }

        .stat-number {
            font-family: 'Outfit', sans-serif;
            font-size: 2.2rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .stat-label {
            font-size: 0.8rem;
            color: var(--text-muted);
            font-weight: 500;
            margin-top: 4px;
        }

        /* ========== FEATURES ========== */
        .section {
            padding: 80px 24px;
            max-width: 1100px;
            margin: 0 auto;
        }

        .section-header {
            text-align: center;
            margin-bottom: 56px;
        }

        .section-header h2 {
            font-family: 'Outfit', sans-serif;
            font-size: 2.2rem;
            font-weight: 800;
            margin-bottom: 12px;
        }

        .section-header p {
            color: var(--text-dim);
            font-size: 1rem;
            max-width: 500px;
            margin: 0 auto;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .feature-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 32px 28px;
            transition: all 0.3s;
        }

        .feature-card:hover {
            border-color: rgba(129, 140, 248, 0.3);
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
        }

        .feature-icon {
            width: 52px;
            height: 52px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin-bottom: 20px;
        }

        .feature-card h3 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.15rem;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .feature-card p {
            font-size: 0.85rem;
            color: var(--text-dim);
            line-height: 1.7;
        }

        /* ========== INSTALL SECTION ========== */
        .install-section {
            max-width: 900px;
            margin: 0 auto;
            padding: 80px 24px;
        }

        .install-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.7));
            border: 1px solid var(--border);
            border-radius: 28px;
            padding: 56px 48px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .install-card::before {
            content: '';
            position: absolute;
            top: -1px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--primary), transparent);
        }

        .install-card h2 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.8rem;
            font-weight: 800;
            margin-bottom: 16px;
        }

        .install-card p {
            color: var(--text-dim);
            font-size: 0.95rem;
            max-width: 480px;
            margin: 0 auto 12px;
            line-height: 1.7;
        }

        .install-steps {
            display: flex;
            justify-content: center;
            gap: 32px;
            margin: 32px 0 36px;
            flex-wrap: wrap;
        }

        .install-step {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--text-dim);
            font-size: 0.85rem;
            font-weight: 500;
        }

        .install-step .step-num {
            width: 28px;
            height: 28px;
            border-radius: 10px;
            background: rgba(129, 140, 248, 0.15);
            border: 1px solid rgba(129, 140, 248, 0.3);
            color: var(--primary);
            font-size: 0.75rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* ========== FOOTER ========== */
        footer {
            text-align: center;
            padding: 40px 24px;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.8rem;
        }

        /* ========== ANIMATIONS ========== */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes gradientShift {

            0%,
            100% {
                background-position: 0% center;
            }

            50% {
                background-position: 200% center;
            }
        }

        @keyframes pulse {

            0%,
            100% {
                opacity: 1;
            }

            50% {
                opacity: 0.4;
            }
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

            .stats-bar {
                gap: 24px;
                flex-wrap: wrap;
            }

            .stat-number {
                font-size: 1.6rem;
            }

            .install-card {
                padding: 36px 24px;
            }

            .install-steps {
                gap: 16px;
            }
        }
    </style>
</head>

<body>
    <!-- Navbar -->
    <nav>
        <a href="/" class="nav-logo">InstaTools</a>
        <div class="nav-links">
            <a href="/docs" class="nav-link-ghost">Docs</a>
            <a href="/login" class="nav-link-ghost">Login</a>
            <a href="/billing" class="nav-link-primary">Get Started</a>
        </div>
    </nav>

    <!-- Hero -->
    <section class="hero">
        <div class="hero-badge">Platform Active</div>

        <h1>
            Automate Your<br>
            <span class="gradient-text">Instagram Empire</span>
        </h1>

        <p>Platform otomasi & manajemen Instagram terpercaya. Kelola ribuan akun secara bersamaan dengan aman, cepat,
            dan efisien.</p>

        <div class="hero-actions">
            <a href="/billing" class="btn btn-primary">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get Started
            </a>
            <a href="/docs" class="btn btn-ghost">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Documentation
            </a>
        </div>
    </section>

    <!-- Stats -->
    <div class="stats-bar">
        <div class="stat-item">
            <div class="stat-number">5000+</div>
            <div class="stat-label">Akun Terkelola</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">24/7</div>
            <div class="stat-label">Automation</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">99.9%</div>
            <div class="stat-label">Uptime</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">6</div>
            <div class="stat-label">Subscription Tiers</div>
        </div>
    </div>

    <!-- Features -->
    <section class="section">
        <div class="section-header">
            <h2>Kenapa InstaTools?</h2>
            <p>Solusi lengkap untuk manajemen Instagram skala besar</p>
        </div>

        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon"
                    style="background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25);">🤖</div>
                <h3>Full Automation</h3>
                <p>Post, Like, Reels, Story — semua dijadwalkan dan berjalan otomatis tanpa perlu buka Instagram manual.
                </p>
            </div>
            <div class="feature-card">
                <div class="feature-icon"
                    style="background: rgba(34,211,238,0.12); border: 1px solid rgba(34,211,238,0.25);">🔐</div>
                <h3>Secure Multi-Login</h3>
                <p>Login via username/password, 2FA bypass, atau session cookies. Setiap akun punya device fingerprint
                    unik.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon"
                    style="background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.25);">🌐</div>
                <h3>Proxy Management</h3>
                <p>Shared, Private, dan Dedicated residential proxy terintegrasi. Rotasi otomatis untuk keamanan
                    maksimal.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon"
                    style="background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25);">📊</div>
                <h3>Real-time Dashboard</h3>
                <p>Monitor semua akun, jadwal, status proxy, dan analytics dalam satu dashboard terpusat.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon"
                    style="background: rgba(168,85,247,0.12); border: 1px solid rgba(168,85,247,0.25);">🧵</div>
                <h3>Cross Posting Threads</h3>
                <p>Post ke Instagram dan Threads secara bersamaan. Tersedia sebagai add-on untuk Basic dan Pro tier.</p>
            </div>
            <div class="feature-card">
                <div class="feature-icon"
                    style="background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25);">⚡</div>
                <h3>Bulk Import</h3>
                <p>Import ribuan akun sekaligus via CSV atau text. Auto-login dengan session generator bawaan.</p>
            </div>
        </div>
    </section>

    <!-- Install Teaser -->
    <section class="install-section">
        <div class="install-card">
            <h2>Mulai Dalam 3 Langkah</h2>
            <p>Instalasi sederhana — hanya perlu Git, Python, dan Node.js. Setelah setup awal, cukup klik 2x file .bat
                untuk menjalankan setiap hari.</p>

            <div class="install-steps">
                <div class="install-step">
                    <span class="step-num">1</span>
                    Install Git & Python
                </div>
                <div class="install-step">
                    <span class="step-num">2</span>
                    Clone Repository
                </div>
                <div class="install-step">
                    <span class="step-num">3</span>
                    Jalankan .bat
                </div>
            </div>

            <a href="/docs" class="btn btn-primary">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Baca Panduan Instalasi
            </a>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        &copy; 2026 InstaTools. All rights reserved.
    </footer>
</body>

</html>