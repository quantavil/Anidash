"""Verify built app shell in a real browser; run against npm run preview."""
import sys
from playwright.sync_api import sync_playwright, expect
base=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4173'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context()
    context.route(base+'/api/**',lambda r:r.fulfill(status=503,json={'error':'Isolated offline shell check'}))
    page=context.new_page()
    page.goto(base)
    page.evaluate('navigator.serviceWorker.ready.then(() => true)')
    page.reload()
    assert page.evaluate('!!navigator.serviceWorker.controller'),'No controlling service worker'
    for route in ['/browse','/stats']:
        page.goto(base+route)
        expect(page.locator('header > a[href="/"]:visible')).to_be_visible()
    context.unroute(base+'/api/**')
    context.set_offline(True)
    for route in ['/','/browse','/stats']:
        page.goto(base+route)
        page.reload()
        expect(page.locator('header > a[href="/"]:visible')).to_be_visible()
        expect(page.locator('main')).to_be_visible()
        assert 'Internal Error' not in page.locator('body').inner_text()
        print('PASS offline navigation and reload',route)
    keys=page.evaluate('caches.keys()')
    cached=page.evaluate('''async()=>{const out=[];for(const name of await caches.keys()){const cache=await caches.open(name);for(const req of await cache.keys())out.push(req.url)}return out}''')
    assert not any('/api/' in url or '/auth/token' in url or '/auth/refresh' in url or not url.startswith(base) for url in cached),cached
    print('PASS cache boundary:',len(cached),'same-origin shell resources')
    browser.close()
