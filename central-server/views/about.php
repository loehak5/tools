<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About Us — InstaTools</title>
    <meta name="description"
        content="Pelajari dedikasi di balik InstaTools oleh PT APPNESIA DIGITAL LABS dalam menghadirkan otomasi Instagram yang cerdas.">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://instatools.web.id/about">
    <meta name="theme-color" content="#050a18">

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
            --text: #f8fafc;
            --text-dim: #94a3b8;
            --border: rgba(129, 140, 248, 0.12);
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text);
            overflow-x: hidden;
            line-height: 1.6;
        }

        /* Nav */
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

        /* Hero */
        .hero {
            padding: 180px 24px 80px;
            text-align: center;
            position: relative;
        }

        .hero h1 {
            font-family: 'Outfit', sans-serif;
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 900;
            margin-bottom: 24px;
            background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .hero p {
            font-size: 1.25rem;
            color: var(--text-dim);
            max-width: 700px;
            margin: 0 auto;
        }

        /* Content Sections */
        .content-section {
            padding: 80px 24px;
            max-width: 1000px;
            margin: 0 auto;
        }

        .glass-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 32px;
            padding: 48px;
            backdrop-filter: blur(10px);
            margin-bottom: 40px;
        }

        .section-label {
            display: inline-block;
            color: var(--primary);
            font-weight: 700;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 16px;
        }

        h2 {
            font-family: 'Outfit', sans-serif;
            font-size: 2rem;
            margin-bottom: 24px;
        }

        .vision-box {
            font-size: 1.5rem;
            font-weight: 500;
            color: var(--text);
            border-left: 4px solid var(--primary);
            padding-left: 32px;
            margin: 40px 0;
        }

        /* Why Grid */
        .why-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
            margin-top: 40px;
        }

        .why-item {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            padding: 32px;
            border-radius: 24px;
            transition: all 0.3s;
        }

        .why-item:hover {
            transform: translateY(-5px);
            border-color: var(--primary);
            background: rgba(129, 140, 248, 0.05);
        }

        .why-item h3 {
            font-family: 'Outfit', sans-serif;
            color: var(--accent);
            margin-bottom: 12px;
        }

        .why-item p {
            font-size: 0.95rem;
            color: var(--text-dim);
        }

        /* Footer */
        footer {
            text-align: center;
            padding: 60px 24px;
            border-top: 1px solid var(--border);
            color: var(--text-dim);
            font-size: 0.85rem;
        }

        @media (max-width: 768px) {
            nav {
                padding: 12px 16px;
            }

            .hero {
                padding-top: 140px;
            }

            .glass-card {
                padding: 32px 24px;
            }
        }
    </style>
</head>

<body>
    <nav>
        <a href="/" class="nav-logo">InstaTools</a>
        <div class="nav-links">
            <a href="/" class="nav-link-ghost">Home</a>
            <a href="/about" class="nav-link-ghost" style="color: var(--text);">About</a>
            <a href="/docs" class="nav-link-ghost">Docs</a>
            <a href="/login" class="nav-link-ghost">Login</a>
        </div>
    </nav>

    <section class="hero">
        <h1>Empowering Your<br><span
                style="background: linear-gradient(135deg, var(--primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Digital
                Presence</span></h1>
        <p>Di balik InstaTools, terdapat dedikasi untuk menghadirkan solusi otomasi yang cerdas, aman, dan efisien.</p>
    </section>

    <main class="content-section">
        <div class="glass-card">
            <span class="section-label">Dedikasi Kami</span>
            <p style="font-size: 1.1rem; line-height: 1.8;">
                InstaTools dikembangkan oleh <strong>PT APPNESIA DIGITAL LABS</strong> untuk menjawab tantangan
                manajemen ekosistem digital yang kompleks.
                Kami percaya bahwa teknologi seharusnya mempermudah kreativitas, bukan membatasinya. Dengan fokus pada
                performa dan keamanan,
                kami menghadirkan instrumen yang memungkinkan Anda tumbuh lebih cepat tanpa mengorbankan kualitas.
            </p>
        </div>

        <div class="glass-card" style="background: linear-gradient(135deg, rgba(129, 140, 248, 0.1), transparent);">
            <span class="section-label">Visi Kami</span>
            <div class="vision-box">
                Menjadi laboratorium inovasi digital yang membantu kreator dan pebisnis mengoptimalkan ekosistem
                Instagram mereka melalui tools yang presisi dan mutakhir.
            </div>
        </div>

        <h2 style="text-align: center; margin-top: 80px;">Kenapa Instatools?</h2>
        <div class="why-grid">
            <div class="why-item">
                <h3>Precision</h3>
                <p>Dibangun dengan arsitektur teknologi terkini untuk memastikan setiap aksi berjalan dengan akurat
                    sesuai parameter yang Anda tentukan.</p>
            </div>
            <div class="why-item">
                <h3>Efficiency</h3>
                <p>Menghemat ribuan jam waktu operasional harian Anda dengan sistem penjadwalan dan otomasi yang handal
                    24/7.</p>
            </div>
            <div class="why-item">
                <h3>Growth</h3>
                <p>Fokus pada hasil yang nyata. Setiap fitur dikembangkan untuk memberikan dampak positif langsung pada
                    performa akun dan bisnis Anda.</p>
            </div>
        </div>
    </main>

    <footer>
        &copy; 2026 PT APPNESIA DIGITAL LABS. All rights reserved.
    </footer>
</body>

</html>