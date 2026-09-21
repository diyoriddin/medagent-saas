import os
import httpx

def run():
    url = "http://127.0.0.1:8000/api/v1/auth/login"
    email = os.getenv("SEED_ADMIN_EMAIL") or os.getenv("ADMIN_EMAIL") or "admin@demo.com"
    password = os.getenv("SEED_ADMIN_PASSWORD") or os.getenv("ADMIN_PASSWORD") or "password123"
    payload = {"email": email, "password": password}
    try:
        r = httpx.post(url, json=payload, timeout=10.0)
        print(r.status_code)
        print(r.text)
    except Exception as e:
        print("Request error:", e)


if __name__ == '__main__':
    run()
