import requests

def test_proxy(proxy_url):
    print(f"Testing proxy: {proxy_url}")
    proxies = {
        "http": proxy_url,
        "https": proxy_url
    }
    try:
        # Use a short timeout
        resp = requests.get("https://www.instagram.com/accounts/login/", proxies=proxies, timeout=15.0)
        print(f"  Response Status: {resp.status_code}")
        if resp.status_code == 200:
            print("  SUCCESS: Proxy can reach Instagram.")
        else:
            print(f"  FAILURE: Received status {resp.status_code}")
    except Exception as e:
        print(f"  ERROR: {e}")

if __name__ == "__main__":
    # Testing several failing proxies
    proxies_to_test = [
        "socks5://kuyangkayang:asukayang@23.95.150.145:6114",
        "socks5://kuyangkayang:asukayang@64.137.96.74:6641",
        "socks5://kuyangkayang:asukayang@216.10.27.159:6837"
    ]
    for p in proxies_to_test:
        test_proxy(p)
