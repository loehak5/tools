<?php
// /instatools/central-server/views/landing.php
if (!isset($_SESSION['user_id'])) {
    header('Location: /');
    exit;
}

require_once __DIR__ . '/../config/database.php';
$db = Database::getConnection();

// Fetch current active subscription
$stmt = $db->prepare("SELECT s.*, p.price_idr, p.name as plan_name FROM subscriptions s JOIN subscription_plans p ON s.plan_id = p.id WHERE s.user_id = ? AND s.status = 'active' AND s.end_date > NOW() ORDER BY s.end_date DESC LIMIT 1");
$stmt->execute([$_SESSION['user_id']]);
$currentSub = $stmt->fetch();

function isPlanRestricted($newPlanId, $newPlanPrice, $currentSub)
{
    if (!$currentSub)
        return [false, ""];

    $remSeconds = strtotime($currentSub['end_date']) - time();
    $remDays = $remSeconds / (24 * 3600);
    $remHours = $remSeconds / 3600;

    $newPrice = (float) $newPlanPrice;
    $currPrice = (float) $currentSub['price_idr'];

    // Rule A: Downgrade
    if ($newPrice < $currPrice) {
        return [true, "Downgrade Locked"];
    }

    // Rule B: Same-Tier Cooldown
    if ($newPlanId === $currentSub['plan_id']) {
        if (strtolower($currentSub['plan_name']) === 'prematur') {
            if ($remHours > 1)
                return [true, "Cooldown (" . round($remHours, 1) . "h)"];
        } else {
            if ($remDays > 3)
                return [true, "Cooldown (" . round($remDays, 1) . "d)"];
        }
        return [false, "Renew Plan"]; // It's same tier but within renewal window
    }

    // It's an upgrade
    return [false, "Upgrade Now"];
}
?>
<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Plans — InstaTools Automation Platform</title>
    <meta name="description"
        content="Pilih paket langganan InstaTools sesuai kebutuhan. Dari Prematur hingga Supreme, kelola akun Instagram dengan fitur premium.">
    <meta name="robots" content="noindex, nofollow">
    <link rel="canonical" href="https://instatools.web.id/billing">
    <meta name="theme-color" content="#030712">

    <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Inter:wght@400;500;700&display=swap"
        rel="stylesheet">
    <style>
        :root {
            --primary: #818cf8;
            --primary-glow: rgba(129, 140, 248, 0.4);
            --secondary: #c084fc;
            --accent: #22d3ee;
            --bg: #030712;
            --card-bg: rgba(30, 41, 59, 0.5);
            --card-border: rgba(255, 255, 255, 0.1);
            --text: #f8fafc;
            --text-dim: #94a3b8;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: radial-gradient(circle at top left, #1e1b4b, var(--bg));
            color: var(--text);
            line-height: 1.6;
            min-height: 100vh;
            overflow-x: hidden;
        }

        .container {
            max-width: 1300px;
            margin: 0 auto;
            padding: 40px 24px;
        }

        /* Nav */
        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 60px;
        }

        .logo {
            font-family: 'Outfit', sans-serif;
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(to right, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -1px;
        }

        .user-status {
            background: rgba(255, 255, 255, 0.05);
            padding: 8px 20px;
            border-radius: 99px;
            border: 1px solid var(--card-border);
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 0.9rem;
        }

        .logout-link {
            color: #f87171;
            text-decoration: none;
            font-weight: 600;
        }

        /* Hero */
        .hero {
            text-align: center;
            margin-bottom: 80px;
        }

        .hero h2 {
            font-family: 'Outfit', sans-serif;
            font-size: 3.5rem;
            font-weight: 700;
            margin-bottom: 20px;
            letter-spacing: -2px;
        }

        .hero p {
            color: var(--text-dim);
            font-size: 1.25rem;
            max-width: 600px;
            margin: 0 auto;
        }

        /* Pricing Grid */
        .pricing-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
        }

        .plan-card {
            background: var(--card-bg);
            backdrop-filter: blur(12px);
            border-radius: 32px;
            padding: 40px;
            border: 1px solid var(--card-border);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
        }

        .plan-card:hover {
            transform: translateY(-10px);
            border-color: rgba(129, 140, 248, 0.5);
            box-shadow: 0 20px 40px -20px var(--primary-glow);
        }

        .plan-card.highlight {
            background: linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.7));
            border: 2px solid var(--primary);
        }

        .plan-card.highlight::before {
            content: "BEST VALUE";
            position: absolute;
            top: 20px;
            right: -30px;
            background: var(--primary);
            color: #030712;
            font-size: 0.7rem;
            font-weight: 800;
            padding: 4px 40px;
            transform: rotate(45deg);
        }

        .plan-header {
            margin-bottom: 30px;
        }

        .plan-name {
            font-family: 'Outfit', sans-serif;
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 8px;
        }

        .plan-price {
            font-size: 2.5rem;
            font-weight: 700;
            display: flex;
            align-items: baseline;
            gap: 4px;
        }

        .currency {
            font-size: 1.25rem;
            font-weight: 500;
            color: var(--text-dim);
        }

        .plan-duration {
            font-size: 1rem;
            color: var(--text-dim);
            font-weight: 400;
        }

        .plan-features {
            list-style: none;
            margin-bottom: 40px;
            flex-grow: 1;
        }

        .plan-features li {
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 0.95rem;
        }

        .plan-features li svg {
            color: #10b981;
            flex-shrink: 0;
        }

        .plan-features li.off {
            color: var(--text-dim);
            opacity: 0.5;
        }

        .plan-features li.off svg {
            color: #64748b;
        }

        .purchase-btn {
            display: block;
            width: 100%;
            padding: 16px;
            border-radius: 16px;
            border: none;
            background: #fff;
            color: #030712;
            font-weight: 700;
            font-size: 1rem;
            text-align: center;
            text-decoration: none;
            transition: all 0.3s;
            cursor: pointer;
        }

        .highlight .purchase-btn {
            background: linear-gradient(to right, var(--primary), var(--secondary));
            color: #fff;
        }

        .purchase-btn:hover {
            transform: scale(1.02);
            filter: brightness(1.1);
        }

        /* Add-ons Section */
        .addons-section {
            margin-top: 100px;
            padding: 60px;
            background: rgba(30, 41, 59, 0.3);
            border-radius: 48px;
            border: 1px solid var(--card-border);
        }

        .addons-header {
            margin-bottom: 40px;
        }

        .addons-header h3 {
            font-family: 'Outfit', sans-serif;
            font-size: 2rem;
            margin-bottom: 10px;
        }

        .addons-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 32px;
        }

        .addon-category h4 {
            color: var(--primary);
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 2px;
            margin-bottom: 20px;
        }

        .addon-list {
            list-style: none;
        }

        .addon-item {
            background: rgba(255, 255, 255, 0.03);
            padding: 16px;
            border-radius: 16px;
            margin-bottom: 12px;
            border: 1px solid transparent;
            transition: all 0.2s;
        }

        .addon-item:hover {
            border-color: var(--card-border);
            background: rgba(255, 255, 255, 0.05);
        }

        .addon-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .addon-label {
            font-weight: 600;
            font-size: 0.95rem;
        }

        .addon-price {
            color: var(--accent);
            font-weight: 700;
        }

        .addon-desc {
            font-size: 0.8rem;
            color: var(--text-dim);
            margin-top: 4px;
        }

        @media (max-width: 768px) {
            .hero h2 {
                font-size: 2.5rem;
            }

            .pricing-grid {
                grid-template-columns: 1fr;
            }

            .addons-section {
                padding: 30px;
            }
        }
    </style>
</head>

<body>
    <div class="container">
        <nav>
            <div class="logo">INSTATOOLS</div>
            <div class="user-status">
                <span>Account Control Center</span>
                <span style="opacity: 0.3">|</span>
                <a href="/api/auth.php?action=redirect_sso" class="logout-link">Exit Console</a>
            </div>
        </nav>

        <header class="hero">
            <h2>Powering the next generation <br> of Instagram automation.</h2>
            <p>Select a specialized tier to unlock high-frequency botting pipelines and elite residential proxies.</p>
        </header>

        <div class="pricing-grid">
            <!-- Prematur -->
            <div class="plan-card">
                <div class="plan-header">
                    <div class="plan-name">Premature</div>
                    <div class="plan-price"><span class="currency">Rp</span>50.000<span class="plan-duration">/24
                            JAM</span></div>
                </div>
                <ul class="plan-features">
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> 100 Akun IG</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> follow / like / post / reels / story</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Cross Threads Post</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> 10 Proxy Slots</li>
                    <li class="off"><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M10 8V5c0-.6-.4-1-1-1s-1 .4-1 1v3H5c-.6 0-1 .4-1 1s.4 1 1 1h3v3c0 .6.4 1 1 1s1-.4 1-1v-3h3c.6 0 1-.4 1-1s-.4-1-1-1h-3z" />
                        </svg> NO Addons allowed</li>
                </ul>
                <button class="purchase-btn" onclick="buy('prematur')">Activate Pass</button>
            </div>

            <!-- Starter -->
            <div class="plan-card">
                <div class="plan-header">
                    <div class="plan-name">Starter</div>
                    <div class="plan-price"><span class="currency">Rp</span>60.000<span class="plan-duration">/7
                            HARI</span></div>
                </div>
                <ul class="plan-features">
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> 100 Akun IG</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Post / Like / Reels</li>
                    <li class="off"><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M10 8V5c0-.6-.4-1-1-1s-1 .4-1 1v3H5c-.6 0-1 .4-1 1s.4 1 1 1h3v3c0 .6.4 1 1 1s1-.4 1-1v-3h3c.6 0 1-.4 1-1s-.4-1-1-1h-3z" />
                        </svg> NO Addons allowed</li>
                </ul>
                <button class="purchase-btn" onclick="buy('starter')">Get Started</button>
            </div>

            <!-- Basic -->
            <div class="plan-card">
                <div class="plan-header">
                    <div class="plan-name">Basic</div>
                    <div class="plan-price"><span class="currency">Rp</span>100.000<span class="plan-duration">/7
                            HARI</span></div>
                </div>
                <ul class="plan-features">
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> 50 Akun IG</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Post / Like / Reels / Story</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Special Add-on</li>
                </ul>
                <button class="purchase-btn" onclick="buy('basic')">Choose Basic</button>
            </div>

            <!-- Pro -->
            <div class="plan-card highlight">
                <div class="plan-header">
                    <div class="plan-name">Pro</div>
                    <div class="plan-price"><span class="currency">Rp</span>300.000<span class="plan-duration">/30
                            HARI</span></div>
                </div>
                <ul class="plan-features">
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> 300 Akun IG</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Follow / Post / Like / Reels / Story</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> 15 Proxy Slots</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Add-on Support</li>
                </ul>
                <button class="purchase-btn" onclick="buy('pro')">Go Pro</button>
            </div>

            <!-- Advanced -->
            <div class="plan-card">
                <div class="plan-header">
                    <div class="plan-name">Advanced</div>
                    <div class="plan-price"><span class="currency">Rp</span>650.000<span class="plan-duration">/30
                            HARI</span></div>
                </div>
                <ul class="plan-features">
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> 500 Akun IG</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Follow / Post / Like / Reels / Story / View</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Cross Threads Post</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> 30 Proxy Slots</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Add-on Support</li>
                </ul>
                <button class="purchase-btn" onclick="buy('advanced')">Unlock Advanced</button>
            </div>

            <!-- Supreme -->
            <div class="plan-card">
                <div class="plan-header">
                    <div class="plan-name">Supreme</div>
                    <div class="plan-price"><span class="currency">Rp</span>1.8JT<span class="plan-duration">/60
                            HARI</span></div>
                </div>
                <ul class="plan-features">
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> 1500 Akun IG</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Follow / Post / Like / Reels / Story / View</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Cross Threads Post</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> UNLIMITED Proxies</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> Add-on Support</li>
                    <li><svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg> VIP Direct Line</li>
                </ul>
                <button class="purchase-btn" onclick="buy('supreme')">Elite Access</button>
            </div>
        </div>

        <section class="addons-section">
            <div class="addons-header">
                <h3>Add-on Marketplace</h3>
                <p style="color: var(--text-dim)">Scale your automation with high-performance independent modules.</p>
            </div>
            <div class="addons-grid">
                <div class="addon-category">
                    <h4>STATIS RESIDENSIAL PROXY</h4>
                    <div class="addon-list">
                        <div class="addon-item" onclick="buyAddon('proxy', 'shared', 15)">
                            <div class="addon-info"><span class="addon-label">Shared Bundle (15 IP)</span><span
                                    class="addon-price">150k/bln</span></div>
                            <div class="addon-desc">15 Shared Residential Static IPs</div>
                        </div>
                        <div class="addon-item" onclick="buyAddon('proxy', 'private', 20)">
                            <div class="addon-info"><span class="addon-label">Private Elite (20 IP)</span><span
                                    class="addon-price">450k/bln</span></div>
                            <div class="addon-desc">20 Private Residential Static IPs</div>
                        </div>
                        <div class="addon-item" onclick="buyAddon('proxy', 'dedicated', 25)">
                            <div class="addon-info"><span class="addon-label">Dedicated VIP (25 IP)</span><span
                                    class="addon-price">1.1M/bln</span></div>
                            <div class="addon-desc">25 Dedicated Data Center IPs</div>
                        </div>
                        <div class="addon-item" onclick="openCustomOrder()">
                            <div class="addon-info"><span class="addon-label">Custom Order</span><span
                                    class="addon-price">Custom</span></div>
                            <div class="addon-desc">Pilih tipe & jumlah IP sesuai kebutuhan</div>
                        </div>
                    </div>
                </div>

                <div class="addon-category">
                    <h4>LAYANAN KUOTA</h4>
                    <div class="addon-list">
                        <div class="addon-item" onclick="openQuotaOrder()">
                            <div class="addon-info"><span class="addon-label">Kuota Proxy</span><span
                                    class="addon-price">Rp 500/IP</span></div>
                            <div class="addon-desc">Tambah kuota request per IP proxy</div>
                        </div>
                        <div class="addon-item" onclick="openQuotaOrder('account')">
                            <div class="addon-info"><span class="addon-label">Kuota Akun IG</span><span
                                    class="addon-price">Rp 1.000/akun</span></div>
                            <div class="addon-desc">Tambah kuota aksi per akun Instagram</div>
                        </div>
                    </div>
                </div>

                <div class="addon-category">
                    <h4>SPECIAL FEATURES</h4>
                    <div class="addon-list">
                        <div class="addon-item" onclick="buyAddon('cross_threads', null, 1)">
                            <div class="addon-info"><span class="addon-label">Cross Posting Threads</span><span
                                    class="addon-price">100k - 200k</span></div>
                            <div class="addon-desc">Basic: 100k (1x promo) · Pro: 200k (prorated)</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <!-- Quota Order Modal -->
    <div id="quotaOrderModal"
        style="display:none; position:fixed; inset:0; z-index:9998; align-items:center; justify-content:center; padding:24px; background:rgba(3,7,18,0.85); backdrop-filter:blur(12px);">
        <div
            style="background:linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98)); border:1px solid rgba(129,140,248,0.2); border-radius:28px; padding:40px 36px 32px; max-width:480px; width:100%; box-shadow:0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(129,140,248,0.1); animation:modalIn 0.3s ease-out;">
            <div
                style="width:64px; height:64px; border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:28px; background:linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1)); border:1px solid rgba(16,185,129,0.3);">
                ⚡</div>
            <h3
                style="color:#f8fafc; font-size:1.35rem; font-weight:700; text-align:center; margin-bottom:6px; font-family:'Outfit',sans-serif;">
                Beli Kuota</h3>
            <p id="qoSubtitle" style="color:#64748b; font-size:0.8rem; text-align:center; margin-bottom:24px;">Tentukan
                jumlah kuota yang dibutuhkan</p>

            <label style="color:#94a3b8; font-size:0.85rem; font-weight:600; display:block; margin-bottom:8px;">Tipe
                Kuota</label>
            <div style="display:flex; gap:8px; margin-bottom:20px;">
                <button type="button" onclick="selectQoType('proxy')" id="qo-proxy"
                    style="flex:1; padding:10px 0; border-radius:12px; border:1px solid rgba(129,140,248,0.4); background:rgba(129,140,248,0.15); color:#818cf8; font-size:0.8rem; font-weight:700; cursor:pointer; transition:all 0.2s;">Proxy</button>
                <button type="button" onclick="selectQoType('account')" id="qo-account"
                    style="flex:1; padding:10px 0; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-size:0.8rem; font-weight:700; cursor:pointer; transition:all 0.2s;">Akun
                    IG</button>
            </div>

            <label style="color:#94a3b8; font-size:0.85rem; font-weight:600; display:block; margin-bottom:8px;">Jumlah
                Unit</label>
            <input type="number" id="qoQty" min="1" value="100" oninput="updateQoPrice()"
                style="width:100%; padding:12px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(15,23,42,0.6); color:#f8fafc; font-size:1rem; font-family:'Inter',sans-serif; outline:none; margin-bottom:20px; -moz-appearance:textfield;" />

            <div
                style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-radius:16px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.15); margin-bottom:24px;">
                <span style="color:#94a3b8; font-size:0.85rem;">Total Harga</span>
                <span id="qoTotalPrice"
                    style="color:#10b981; font-size:1.3rem; font-weight:700; font-family:'Outfit',sans-serif;">Rp
                    50.000</span>
            </div>

            <div style="display:flex; gap:10px;">
                <button onclick="closeQuotaOrder()"
                    style="flex:1; padding:14px; border-radius:16px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-size:0.85rem; font-weight:600; cursor:pointer; transition:all 0.2s;">Batal</button>
                <button onclick="submitQuotaOrder()"
                    style="flex:2; padding:14px; border-radius:16px; border:none; background:linear-gradient(135deg, #10b981, #059669); color:#fff; font-size:0.85rem; font-weight:700; cursor:pointer; transition:all 0.2s; letter-spacing:0.5px;">Beli
                    Sekarang</button>
            </div>
        </div>
    </div>

    <!-- Custom Order Modal -->
    <div id="customOrderModal"
        style="display:none; position:fixed; inset:0; z-index:9998; align-items:center; justify-content:center; padding:24px; background:rgba(3,7,18,0.85); backdrop-filter:blur(12px);">
        <div
            style="background:linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98)); border:1px solid rgba(129,140,248,0.2); border-radius:28px; padding:40px 36px 32px; max-width:480px; width:100%; box-shadow:0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(129,140,248,0.1); animation:modalIn 0.3s ease-out;">
            <div
                style="width:64px; height:64px; border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:28px; background:linear-gradient(135deg, rgba(34,211,238,0.2), rgba(34,211,238,0.1)); border:1px solid rgba(34,211,238,0.3);">
                🌐</div>
            <h3
                style="color:#f8fafc; font-size:1.35rem; font-weight:700; text-align:center; margin-bottom:6px; font-family:'Outfit',sans-serif;">
                Custom Proxy Order</h3>
            <p style="color:#64748b; font-size:0.8rem; text-align:center; margin-bottom:24px;">Minimal 10 IP per pesanan
            </p>

            <label style="color:#94a3b8; font-size:0.85rem; font-weight:600; display:block; margin-bottom:8px;">Tipe
                Proxy</label>
            <div id="coTypeSelect" style="display:flex; gap:8px; margin-bottom:20px;">
                <button type="button" onclick="selectCoType('shared')" id="co-shared" class="co-type-btn co-active"
                    style="flex:1; padding:10px 0; border-radius:12px; border:1px solid rgba(129,140,248,0.4); background:rgba(129,140,248,0.15); color:#818cf8; font-size:0.8rem; font-weight:700; cursor:pointer; transition:all 0.2s;">Shared</button>
                <button type="button" onclick="selectCoType('private')" id="co-private" class="co-type-btn"
                    style="flex:1; padding:10px 0; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-size:0.8rem; font-weight:700; cursor:pointer; transition:all 0.2s;">Private</button>
                <button type="button" onclick="selectCoType('dedicated')" id="co-dedicated" class="co-type-btn"
                    style="flex:1; padding:10px 0; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-size:0.8rem; font-weight:700; cursor:pointer; transition:all 0.2s;">Dedicated</button>
            </div>

            <label style="color:#94a3b8; font-size:0.85rem; font-weight:600; display:block; margin-bottom:8px;">Jumlah
                IP</label>
            <input type="number" id="coQty" min="10" value="10" oninput="updateCoPrice()"
                style="width:100%; padding:12px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(15,23,42,0.6); color:#f8fafc; font-size:1rem; font-family:'Inter',sans-serif; outline:none; margin-bottom:20px; -moz-appearance:textfield;" />

            <div
                style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-radius:16px; background:rgba(129,140,248,0.08); border:1px solid rgba(129,140,248,0.15); margin-bottom:24px;">
                <span style="color:#94a3b8; font-size:0.85rem;">Total Harga</span>
                <span id="coTotalPrice"
                    style="color:#22d3ee; font-size:1.3rem; font-weight:700; font-family:'Outfit',sans-serif;">Rp
                    100.000</span>
            </div>

            <div style="display:flex; gap:10px;">
                <button onclick="closeCustomOrder()"
                    style="flex:1; padding:14px; border-radius:16px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-size:0.85rem; font-weight:600; cursor:pointer; transition:all 0.2s;">Batal</button>
                <button onclick="submitCustomOrder()"
                    style="flex:2; padding:14px; border-radius:16px; border:none; background:linear-gradient(135deg, #818cf8, #6366f1); color:#fff; font-size:0.85rem; font-weight:700; cursor:pointer; transition:all 0.2s; letter-spacing:0.5px;">Beli
                    Sekarang</button>
            </div>
        </div>
    </div>

    <!-- Restriction Modal -->
    <div id="restrictionModal"
        style="display:none; position:fixed; inset:0; z-index:9999; align-items:center; justify-content:center; padding:24px; background:rgba(3,7,18,0.85); backdrop-filter:blur(12px);">
        <div id="modalContent"
            style="background:linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98)); border:1px solid rgba(129,140,248,0.2); border-radius:28px; padding:40px 36px 32px; max-width:440px; width:100%; box-shadow:0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(129,140,248,0.1); position:relative; animation:modalIn 0.3s ease-out;">
            <div id="modalIcon"
                style="width:64px; height:64px; border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 24px; font-size:28px;">
            </div>
            <h3 id="modalTitle"
                style="color:#f8fafc; font-size:1.35rem; font-weight:700; text-align:center; margin-bottom:12px; font-family:'Outfit',sans-serif;">
            </h3>
            <p id="modalMessage"
                style="color:#94a3b8; font-size:0.95rem; text-align:center; line-height:1.7; margin-bottom:32px; white-space:pre-line;">
            </p>
            <button onclick="closeModal()"
                style="display:block; width:100%; padding:14px; border-radius:16px; border:1px solid rgba(129,140,248,0.3); background:rgba(129,140,248,0.1); color:#818cf8; font-size:0.9rem; font-weight:700; cursor:pointer; transition:all 0.2s; text-transform:uppercase; letter-spacing:1.5px; font-family:'Outfit',sans-serif;"
                onmouseover="this.style.background='rgba(129,140,248,0.2)'; this.style.borderColor='rgba(129,140,248,0.5)'"
                onmouseout="this.style.background='rgba(129,140,248,0.1)'; this.style.borderColor='rgba(129,140,248,0.3)'">Mengerti</button>
        </div>
    </div>
    <style>
        @keyframes modalIn {
            from {
                opacity: 0;
                transform: scale(0.9) translateY(20px);
            }

            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
    </style>

    <script>
        // =============================================
        // SUBSCRIPTION DATA (injected by server-side PHP)
        // =============================================
        const CURRENT_SUB = <?= json_encode($currentSub ? [
            'plan_id' => $currentSub['plan_id'],
            'plan_name' => $currentSub['plan_name'],
            'price' => (float) $currentSub['price_idr'],
            'end_date' => $currentSub['end_date'],
        ] : null) ?>;

        const PLAN_PRICES = {
            'prematur': 50000,
            'starter': 60000,
            'basic': 100000,
            'pro': 300000,
            'advanced': 650000,
            'supreme': 1800000
        };

        /**
         * Client-side purchase restriction check.
         * Returns { allowed: boolean, reason: string }
         */
        function checkPurchaseRestriction(planId) {
            if (!CURRENT_SUB) return { allowed: true, reason: '' };

            const newPrice = PLAN_PRICES[planId] || 0;
            const curPrice = CURRENT_SUB.price || 0;
            const endDate = new Date(CURRENT_SUB.end_date);
            const now = new Date();
            const remMs = endDate.getTime() - now.getTime();
            const remDays = remMs / (1000 * 60 * 60 * 24);
            const remHours = remMs / (1000 * 60 * 60);

            // Rule A: Downgrade Protection
            if (newPrice < curPrice) {
                return {
                    allowed: false,
                    reason: `Downgrade tidak diperbolehkan.\nPaket aktif Anda (${CURRENT_SUB.plan_name}) memiliki tier lebih tinggi.\nTunggu masa aktif habis terlebih dahulu.`
                };
            }

            // Rule B: Same-Tier Repurchase Cooldown
            if (planId === CURRENT_SUB.plan_id) {
                if (CURRENT_SUB.plan_id === 'prematur') {
                    if (remHours > 1) {
                        return {
                            allowed: false,
                            reason: `Paket Prematur hanya dapat dibeli ulang 1 jam sebelum habis.\nSisa masa aktif: ${remHours.toFixed(1)} jam.`
                        };
                    }
                } else {
                    if (remDays > 3) {
                        return {
                            allowed: false,
                            reason: `Paket ${CURRENT_SUB.plan_name} hanya dapat dibeli ulang 3 hari sebelum masa aktif habis.\nSisa masa aktif: ${remDays.toFixed(1)} hari.`
                        };
                    }
                }
            }

            return { allowed: true, reason: '' };
        }

        async function buy(id) {
            console.log("Purchasing Plan:", id);

            // ========== CLIENT-SIDE RESTRICTION CHECK ==========
            const restriction = checkPurchaseRestriction(id);
            if (!restriction.allowed) {
                showModal('restriction', 'Akses Ditolak', restriction.reason);
                return;
            }
            // ===================================================

            const btn = event.target;
            const originalText = btn.innerText;
            btn.innerText = "Processing...";
            btn.disabled = true;

            const action = 'create_invoice';

            const formData = new FormData();
            formData.append('plan_id', id);

            try {
                const res = await fetch('/api/billing?action=' + action, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (data.status === 'success') {
                    window.location.href = data.data.invoice_url;
                } else {
                    showModal('error', 'Transaksi Gagal', data.message || 'Gagal membuat invoice.');
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            } catch (err) {
                console.error(err);
                showModal('error', 'Koneksi Gagal', 'Gagal menghubungi server pembayar. Coba lagi nanti.');
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }
        async function buyAddon(type, subType, qty) {
            const item = event.currentTarget;
            item.style.opacity = "0.5";
            item.style.pointerEvents = "none";

            const formData = new FormData();
            formData.append('addon_type', type);
            if (subType) formData.append('sub_type', subType);
            formData.append('qty', qty);

            try {
                const res = await fetch('/api/billing?action=create_addon_invoice', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (data.status === 'success') {
                    window.location.href = data.data.invoice_url;
                } else {
                    showModal('error', 'Transaksi Gagal', data.message || 'Gagal membuat invoice addon.');
                    item.style.opacity = "1";
                    item.style.pointerEvents = "auto";
                }
            } catch (err) {
                console.error(err);
                showModal('error', 'Koneksi Gagal', 'Gagal menghubungi server pembayar. Coba lagi nanti.');
                item.style.opacity = "1";
                item.style.pointerEvents = "auto";
            }
        }

        // ===== CUSTOM ORDER MODAL =====
        let coSelectedType = 'shared';
        const CO_UNIT_PRICES = { shared: 10000, private: 22500, dedicated: 44000 };

        function openCustomOrder() {
            coSelectedType = 'shared';
            document.getElementById('coQty').value = 10;
            selectCoType('shared');
            document.getElementById('customOrderModal').style.display = 'flex';
            document.getElementById('customOrderModal').onclick = function (e) {
                if (e.target === document.getElementById('customOrderModal')) closeCustomOrder();
            };
        }

        function closeCustomOrder() {
            document.getElementById('customOrderModal').style.display = 'none';
        }

        function selectCoType(type) {
            coSelectedType = type;
            ['shared', 'private', 'dedicated'].forEach(t => {
                const btn = document.getElementById('co-' + t);
                if (t === type) {
                    btn.style.borderColor = 'rgba(129,140,248,0.4)';
                    btn.style.background = 'rgba(129,140,248,0.15)';
                    btn.style.color = '#818cf8';
                } else {
                    btn.style.borderColor = 'rgba(255,255,255,0.1)';
                    btn.style.background = 'transparent';
                    btn.style.color = '#94a3b8';
                }
            });
            updateCoPrice();
        }

        function updateCoPrice() {
            const qty = Math.max(10, parseInt(document.getElementById('coQty').value) || 10);
            const total = CO_UNIT_PRICES[coSelectedType] * qty;
            document.getElementById('coTotalPrice').textContent = 'Rp ' + total.toLocaleString('id-ID');
        }

        function submitCustomOrder() {
            const qty = parseInt(document.getElementById('coQty').value) || 0;
            if (qty < 10) {
                showModal('error', 'Jumlah Tidak Valid', 'Minimal pemesanan custom order adalah 10 IP.');
                return;
            }
            closeCustomOrder();
            buyAddon('proxy', coSelectedType, qty);
        }

        // ===== QUOTA ORDER MODAL =====
        let qoSelectedType = 'proxy';
        const QO_UNIT_PRICES = { proxy: 500, account: 1000 };

        function openQuotaOrder(preselect) {
            qoSelectedType = preselect || 'proxy';
            document.getElementById('qoQty').value = 100;
            selectQoType(qoSelectedType);
            document.getElementById('quotaOrderModal').style.display = 'flex';
            document.getElementById('quotaOrderModal').onclick = function (e) {
                if (e.target === document.getElementById('quotaOrderModal')) closeQuotaOrder();
            };
        }

        function closeQuotaOrder() {
            document.getElementById('quotaOrderModal').style.display = 'none';
        }

        function selectQoType(type) {
            qoSelectedType = type;
            ['proxy', 'account'].forEach(t => {
                const btn = document.getElementById('qo-' + t);
                if (t === type) {
                    btn.style.borderColor = 'rgba(129,140,248,0.4)';
                    btn.style.background = 'rgba(129,140,248,0.15)';
                    btn.style.color = '#818cf8';
                } else {
                    btn.style.borderColor = 'rgba(255,255,255,0.1)';
                    btn.style.background = 'transparent';
                    btn.style.color = '#94a3b8';
                }
            });
            updateQoPrice();
        }

        function updateQoPrice() {
            const qty = Math.max(1, parseInt(document.getElementById('qoQty').value) || 1);
            const total = QO_UNIT_PRICES[qoSelectedType] * qty;
            document.getElementById('qoTotalPrice').textContent = 'Rp ' + total.toLocaleString('id-ID');
        }

        function submitQuotaOrder() {
            const qty = parseInt(document.getElementById('qoQty').value) || 0;
            if (qty < 1) {
                showModal('error', 'Jumlah Tidak Valid', 'Minimal pembelian kuota adalah 1 unit.');
                return;
            }
            closeQuotaOrder();
            buyAddon('quota', qoSelectedType, qty);
        }

        function showModal(type, title, message) {
            const modal = document.getElementById('restrictionModal');
            const icon = document.getElementById('modalIcon');
            const titleEl = document.getElementById('modalTitle');
            const msgEl = document.getElementById('modalMessage');

            if (type === 'restriction') {
                icon.innerHTML = '🛡️';
                icon.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))';
                icon.style.border = '1px solid rgba(239,68,68,0.3)';
            } else if (type === 'info') {
                icon.innerHTML = 'ℹ️';
                icon.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.1))';
                icon.style.border = '1px solid rgba(99,102,241,0.3)';
            } else {
                icon.innerHTML = '⚠️';
                icon.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))';
                icon.style.border = '1px solid rgba(245,158,11,0.3)';
            }

            titleEl.textContent = title;
            msgEl.textContent = message;
            modal.style.display = 'flex';

            // Close on backdrop click
            modal.onclick = function (e) {
                if (e.target === modal) closeModal();
            };
        }

        function closeModal() {
            document.getElementById('restrictionModal').style.display = 'none';
        }

        // Close modal on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeModal();
        });
    </script>
</body>

</html>