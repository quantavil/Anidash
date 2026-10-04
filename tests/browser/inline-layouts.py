"""Verify related titles and discovery remain side by side on phones and desktop."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4173'
CASE=sys.argv[2] if len(sys.argv)>2 else 'all'
OUT=Path('/tmp/anidash-inline-checks');OUT.mkdir(exist_ok=True)
COVER='https://cdn.myanimelist.net/images/anime/4/19644.jpg'
DETAIL={'id':52991,'title':'Sousou no Frieren','related_anime':[{'node':{'id':1,'title':'Prequel title that wraps to two lines','main_picture':{'medium':COVER,'large':COVER}},'relation_type':'prequel'},{'node':{'id':2,'title':'Sequel title that wraps to two lines','main_picture':{'medium':COVER,'large':COVER}},'relation_type':'sequel'}]}
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844})
    context.route(BASE+'/api/**',lambda r:r.fulfill(status=503,json={'error':'Isolated verification'}))
    context.route(BASE+'/api/anime/52991?**',lambda r:r.fulfill(json=DETAIL))
    context.route('https://graphql.anilist.co/**',lambda r:r.fulfill(status=404,json={'data':{'Media':None}}))
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    for case in ['related','discovery']:
        if CASE not in [case,'all']:continue
        page.goto(BASE+('/anime/52991' if case=='related' else '/browse'))
        if case=='related':
            expect(page.get_by_role('heading',name='Related Anime',exact=True)).to_be_visible()
            links=[page.get_by_role('link',name='Prequel title that wraps to two lines',exact=False),page.get_by_role('link',name='Sequel title that wraps to two lines',exact=False)]
        else:
            links=[page.get_by_role('button',name='Pick from your planned list',exact=True),page.get_by_role('button',name='Pick an airing anime',exact=True)]
        for width,height in [(320,760),(390,844),(820,1180),(1440,1000)]:
            page.set_viewport_size({'width':width,'height':height})
            expect(links[0]).to_be_visible();expect(links[1]).to_be_visible()
            a,b=[el.bounding_box() for el in links]
            assert abs(a['y']-b['y'])<1,f'{case} stacked at {width}: {a}, {b}'
            assert a['x']+a['width']<=b['x'],f'{case} overlap {width}'
            assert abs(a['height']-b['height'])<1,f'{case} unequal heights {width}'
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{case} overflow {width}'
            if case=='discovery':
                settings=page.get_by_role('button',name='Filter planned picks',exact=True)
                sb=settings.bounding_box()
                assert sb['width']>=44 and sb['height']>=44
                assert sb['x']>=a['x'] and sb['x']+sb['width']<=b['x']
                settings.click();expect(page.get_by_role('dialog')).to_be_visible()
                page.get_by_role('button',name='Close filters',exact=True).click()
                expect(page.get_by_role('dialog')).not_to_be_visible()
            region=page.get_by_role('region',name='Related Anime',exact=True) if case=='related' else page.locator('.discovery-actions')
            region.evaluate('(el)=>window.scrollTo(0,scrollY+el.getBoundingClientRect().top-100)')
            region.screenshot(path=str(OUT/f'{case}-cards-{width}.png'))
            page.screenshot(path=str(OUT/f'{case}-{width}.png'),full_page=True)
        print('PASS',case,'inline at 320, 390, 820, 1440px')
    assert not errors,errors
    browser.close()
