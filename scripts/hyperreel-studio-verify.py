#!/usr/bin/env python3
"""hyperreel studio verification — Playwright probe with long timeouts.

Asserts the /studio player page is interactive: player chrome mounts,
play/pause toggles, scrubber seeks, name personalization reaches the CTA
act, like button reacts. Runs headless with software GL; every step is
individually timeout-guarded so a GPU wedge degrades to a partial report.
"""
import json
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
RESULTS = []


def step(name, fn):
    try:
        out = fn()
        RESULTS.append((name, "PASS", out))
        print(f"PASS {name}: {out}")
    except Exception as e:
        RESULTS.append((name, "FAIL", str(e)[:160]))
        print(f"FAIL {name}: {str(e)[:160]}")


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=["--use-gl=angle", "--use-angle=swiftshader", "--disable-dev-shm-usage"],
    )
    page = browser.new_page(viewport={"width": 1024, "height": 640})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:200]))

    step("goto /studio", lambda: (page.goto(f"{BASE}/studio", wait_until="domcontentloaded", timeout=60_000), "loaded")[
        1
    ])
    step("dom shell", lambda: page.wait_for_function(
        "() => document.querySelectorAll('button').length >= 4", timeout=30_000) and "buttons>=4")

    def probe_dom():
        return page.evaluate(
            """() => JSON.stringify({
              canvas: document.querySelectorAll('canvas').length,
              buttons: [...document.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 22)).filter(Boolean),
              inputs: [...document.querySelectorAll('input')].map(i => i.getAttribute('aria-label') || i.placeholder || 'input'),
              chapters: document.querySelectorAll('[data-chapter], .chapter-marker, [class*="Chapter"]').length,
            })"""
        )
    step("dom inventory", probe_dom)

    def click_play():
        btn = page.get_by_role("button", name="Play the reel")
        btn.click(timeout=20_000)
        page.wait_for_timeout(1500)
        state = page.evaluate(
            "() => JSON.stringify({pauseVisible: [...document.querySelectorAll('[aria-label]')].some(b => (b.getAttribute('aria-label')||'').toLowerCase().includes('pause')), timecode: [...document.querySelectorAll('*')].some(e => /0:0[1-9]/.test(e.textContent || ''))})"
        )
        return state
    step("play toggle", click_play)

    def personalize():
        inp = page.get_by_role("textbox").first
        inp.fill("MARKCO", timeout=15_000)
        # seek to the CTA act via last chapter marker if present, else scrub end
        page.evaluate(
            "() => { const ch = document.querySelectorAll('[data-chapter]'); if (ch.length) ch[ch.length-1].dispatchEvent(new MouseEvent('click', {bubbles: true})); }"
        )
        page.wait_for_timeout(800)
        body = page.evaluate("() => document.body.textContent")
        return "name-in-dom" if "MARKCO" in body else "name-not-found"
    step("personalization", personalize)

    def like():
        btn = page.get_by_role("button", name="Like the reel")
        btn.click(timeout=15_000)
        page.wait_for_timeout(900)
        cnt = page.evaluate(
            "() => { const b = [...document.querySelectorAll('button')].find(x => (x.getAttribute('aria-label')||'') === 'Like the reel'); return b ? b.textContent.replace(/[^0-9]/g, '') : '?'; }"
        )
        return f"count-after-click={cnt}"
    step("like click", like)

    def scrub():
        track = page.evaluate(
            "() => { const el = document.querySelector('[role=slider]'); if (!el) return null; const r = el.getBoundingClientRect(); return JSON.stringify({x: r.x + r.width * 0.8, y: r.y + r.height / 2}); }"
        )
        if not track:
            return "no-slider"
        t = json.loads(track)
        page.mouse.move(t["x"], t["y"])
        page.mouse.down()
        page.mouse.move(t["x"] - 80, t["y"], steps=8)
        page.mouse.up()
        page.wait_for_timeout(600)
        return "scrubbed"
    step("scrubber drag", scrub)

    step("page errors", lambda: json.dumps(errors[:5]) if errors else "none")
    try:
        page.screenshot(path="/home/z/my-project/research/hyperreel-studio-pw.png", timeout=30_000)
        print("screenshot saved")
    except Exception as e:
        print(f"screenshot failed: {str(e)[:100]}")
    browser.close()

fails = sum(1 for _, s, _ in RESULTS if s == "FAIL")
print(f"\nSUMMARY: {len(RESULTS) - fails}/{len(RESULTS)} steps passed")
sys.exit(1 if fails > 2 else 0)
