"""Isolated public detail-page content regressions; no real account or data changes."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:4173'
OUT=Path('/tmp/anidash-detail-content');OUT.mkdir(exist_ok=True)
BODY='A careful review of the story and its characters. '*40+'The final paragraph must remain readable.'
MEDIA={'id':154587,'idMal':52991,'tags':[{'name':f'Long descriptive anime tag number {i}', 'rank':None if i==0 else 90,'isAdult':False} for i in range(40)],'characters':{'edges':[]},'recommendations':{'nodes':[]},'reviews':{'nodes':[{'summary':'A thoughtful review','rating':92,'body':BODY,'user':{'name':'Reviewer'}}]},'trailer':None,'nextAiringEpisode':None}
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844})
    context.route(BASE+'/api/**',lambda r:r.fulfill(status=503,json={'error':'Isolated verification'}))
    context.route(BASE+'/api/anime/52991?**',lambda r:r.fulfill(json={'id':52991,'title':'Sousou no Frieren','synopsis':'A journey after the final battle.','recommendations':[{'node':{'id':99999,'title':'MAL-only recommendation'},'num_recommendations':5}]}))
    requests=[]
    def enrichment(route):
        requests.append(route.request.post_data_json)
        route.fulfill(json={'data':{'Media':MEDIA}})
    context.route('https://graphql.anilist.co/**',enrichment)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'/anime/52991')
    expect(page.get_by_role('heading',name='Tags',exact=True)).to_be_visible()
    # A large tag collection must scroll inside a bounded panel, not stretch the page.
    tags=page.get_by_role('heading',name='Tags',exact=True).locator('..').locator(':scope > div').first
    for width,height in [(320,760),(390,844),(820,1180),(1440,1000)]:
        page.set_viewport_size({'width':width,'height':height})
        expect(tags).to_be_visible()
        metrics=tags.evaluate('(el)=>({height:el.clientHeight,scroll:el.scrollHeight,overflow:getComputedStyle(el).overflowY})')
        assert 0<metrics['height']<=160 and metrics['scroll']>metrics['height'] and metrics['overflow']=='auto',metrics
        expect(tags.get_by_text('Long descriptive anime tag number 39',exact=False)).to_have_count(1)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        page.screenshot(path=str(OUT/f'detail-{width}.png'),full_page=True)
    tags.focus()
    page.keyboard.press('End')
    page.wait_for_function('(el)=>el.scrollTop>0',arg=tags.element_handle())
    expect(page.get_by_text('MAL-only recommendation',exact=True)).to_have_count(0)
    expect(page.get_by_role('region',name='Recommendations',exact=True)).to_have_count(0)
    read=page.get_by_role('button',name='Read full review',exact=True)
    expect(read).to_have_attribute('aria-expanded','false')
    read.focus();page.keyboard.press('Enter')
    full=page.locator('.review-body')
    expect(full).to_contain_text('The final paragraph must remain readable.')
    expect(full).to_have_text(BODY.strip())
    page.get_by_role('button',name='Show less',exact=True).click()
    expect(read).to_have_attribute('aria-expanded','false')
    assert 'The final paragraph' not in full.inner_text()
    assert len(requests)==1,requests
    assert not errors,errors
    print('PASS bounded scrollable tags, complete review expansion/collapse, MAL-only recs hidden, one enrichment request')
    browser.close()
