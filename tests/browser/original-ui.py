"""Run with a local server: python tests/browser/original-ui.py [base_url].
Uses isolated browser storage and intercepted MAL requests, never a real account.
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5173'
OUT = Path('/tmp/anidash-restored-checks')
OUT.mkdir(exist_ok=True)
ENTRIES = [
    (52991, 'Sousou no Frieren', 'Frieren: Beyond Journey’s End', 18, 28, 9, 9.3, 'watching', 'https://cdn.myanimelist.net/images/anime/1015/138006.jpg'),
    (57334, 'Dandadan', 'DAN DA DAN', 7, 12, 8, 8.5, 'watching', 'https://cdn.myanimelist.net/images/anime/1587/143487.jpg'),
    (54492, 'Kusuriya no Hitorigoto', 'The Apothecary Diaries', 16, 24, 0, 8.8, 'watching', 'https://cdn.myanimelist.net/images/anime/1708/138033.jpg'),
    (37521, 'Vinland Saga', 'Vinland Saga', 9, 24, 8, 8.8, 'watching', 'https://cdn.myanimelist.net/images/anime/1500/103005.jpg'),
    (1, 'Cowboy Bebop', 'Cowboy Bebop', 0, 26, 0, 8.8, 'plan_to_watch', 'https://cdn.myanimelist.net/images/anime/4/19644.jpg'),
    (28851, 'Koe no Katachi', 'A Silent Voice', 0, 1, 0, 8.9, 'plan_to_watch', 'https://cdn.myanimelist.net/images/anime/1122/96435.jpg'),
]
records = [dict(malId=i,title=t,titleEnglish=en,numWatchedEpisodes=w,numEpisodes=n,score=s,mean=m,status=st,mainPicture={'medium':im,'large':im},genres=[{'id':10,'name':'Fantasy'}],studios=[],startSeason={'year':2023,'season':'fall'},mediaType='tv',animeStatus='finished_airing',numListUsers=10000,numScoringUsers=5000,isRewatching=False,updatedAt=f'2026-10-04T{23-k:02d}:00:00Z',startDate=None,finishDate=None) for k,(i,t,en,w,n,s,m,st,im) in enumerate(ENTRIES)]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1000})
    context.route(BASE + '/api/**', lambda route: route.fulfill(status=503,json={'error':'Isolated browser verification'}))
    context.route('https://graphql.anilist.co/**', lambda route: route.fulfill(status=404,json={'data':{'Media':None}}))
    context.route('**/raw.githubusercontent.com/**', lambda route: route.fulfill(json={'dubbed':[52991,54492,1]}))
    page = context.new_page()
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading',name='Great stories. A place to keep them.')).to_be_visible()
    expect(page.locator('.story-window')).to_be_visible()
    expect(page.get_by_role('dialog')).to_have_count(0)
    for width,height in [(1440,1000),(820,1180),(390,844),(320,760)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(250)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'Welcome overflow {width}'
        expect(page.get_by_role('button',name='Connect with MyAnimeList')).to_be_visible()
        page.screenshot(path=str(OUT/f'welcome-{width}.png'),full_page=True)
    page.evaluate("""async records => {
      localStorage.setItem('anidash_tokens',JSON.stringify({accessToken:'browser-test',refreshToken:'browser-test',expiresAt:Date.now()+86400000}));
      localStorage.setItem('anidash_user_profile',JSON.stringify({id:123,name:'Yuki'}));
      localStorage.setItem('anidash_prefer_english','true');
      sessionStorage.setItem('anidash_has_synced_this_session','true');
      const req=indexedDB.open('anidash',2);
      req.onupgradeneeded=()=>{const db=req.result;db.createObjectStore('anime',{keyPath:'malId'});db.createObjectStore('userList',{keyPath:'malId'});db.createObjectStore('meta',{keyPath:'key'});db.createObjectStore('syncQueue',{keyPath:'malId'});};
      const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
      const tx=db.transaction(['userList','meta'],'readwrite');
      records.forEach(r=>tx.objectStore('userList').put(r));
      tx.objectStore('meta').put({key:'lastSync',value:Date.now(),updatedAt:Date.now()});
      await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=reject});db.close();
    }""", records)
    page.reload()
    page.wait_for_load_state('domcontentloaded')
    expect(page.get_by_role('heading',name='My Anime List')).to_be_visible()
    for width,height in [(1440,1000),(820,1180),(390,844),(320,760)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(400)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'List overflow {width}'
        expect(page.get_by_role('link',name='View Sousou no Frieren details')).to_be_visible()
        expect(page.locator('.journal-entry')).to_have_count(0)
        page.screenshot(path=str(OUT/f'list-{width}.png'),full_page=True)
    page.goto(BASE+'?tab=all')
    card_status=page.get_by_role('button',name='Status: Watching',exact=True).first
    expect(card_status.locator('.status-square')).to_have_text('W')
    square=card_status.locator('.status-square').bounding_box()
    target=card_status.bounding_box()
    assert square['width']==20 and square['height']==20
    assert target['width']>=44 and target['height']>=44
    assert card_status.evaluate('(el)=>el.closest(".feed-card-contain").querySelector("img").getBoundingClientRect().bottom<=el.getBoundingClientRect().top'), 'Status still overlays artwork'
    card_status.click()
    menu=page.get_by_role('menu',name='Change status')
    expect(menu).to_be_visible()
    page.screenshot(path=str(OUT/'status-menu-320.png'))
    bounds=menu.bounding_box()
    assert bounds['x']>=0 and bounds['x']+bounds['width']<=320 and bounds['y']>=0 and bounds['y']+bounds['height']<=760, bounds
    page.keyboard.press('ArrowDown')
    page.keyboard.press('Enter')
    expect(page.get_by_role('button',name='Status: PTW',exact=True).first.locator('.status-square')).to_have_text('P')
    page.get_by_role('button',name='Status: PTW',exact=True).first.click()
    page.keyboard.press('Home')
    page.keyboard.press('Enter')
    expect(page.get_by_role('button',name='Status: Watching',exact=True).first.locator('.status-square')).to_have_text('W')
    page.goto(BASE)
    page.get_by_role('button',name='Increase episode count',exact=True).first.click()
    expect(page.locator('.watched-num').first).to_have_text('19')
    page.get_by_role('button',name='Decrease episode count',exact=True).first.click()
    expect(page.locator('.watched-num').first).to_have_text('18')
    page.get_by_placeholder('Search your list…').fill('Frieren')
    expect(page.get_by_role('link',name=__import__('re').compile('^View .* details$'))).to_have_count(1)
    page.reload()
    expect(page.locator('.watched-num').first).to_have_text('18')
    page.get_by_role('button',name=__import__('re').compile('^Sort anime list')).click()
    page.get_by_role('menuitem',name='Title',exact=True).click()
    expect(page).to_have_url(__import__('re').compile('sort=title'))
    # Isolate MAL detail response to verify original rating control persists edits.
    record=records[0]
    detail=dict(id=record['malId'],title=record['title'],alternative_titles={'en':record['titleEnglish']},main_picture=record['mainPicture'],mean=record['mean'],num_episodes=record['numEpisodes'],media_type='tv',status='finished_airing',start_season=record['startSeason'],genres=record['genres'],studios=[],num_list_users=1000000,num_scoring_users=500000,synopsis='A journey after the final battle.')
    context.route(BASE+f"/api/anime/{record['malId']}?**",lambda r:r.fulfill(json=detail))
    detail['recommendations']=[{'node':{'id':99999,'title':'MAL-only recommendation'},'num_recommendations':5}]
    rec_nodes=[{'rating':92-i,'mediaRecommendation':{'id':20000+i,'idMal':1000+i if i<5 else None,'title':{'romaji':f'Recommended anime {i+1} with a long title that must remain readable','english':None},'coverImage':{'large':records[4]['mainPicture']['large'],'medium':None}}} for i in range(6)]
    anilist_requests=[]
    def detail_enrichment(route):
        anilist_requests.append(route.request.post_data_json)
        route.fulfill(json={'data':{'Media':{'id':154587,'idMal':52991,'tags':[],'characters':{'edges':[]},'recommendations':{'nodes':rec_nodes},'reviews':{'nodes':[]},'nextAiringEpisode':None,'trailer':None}}})
    context.route('https://graphql.anilist.co/**',detail_enrichment)
    page.goto(BASE+'/anime/52991')
    rec_section=page.get_by_role('region',name='Recommendations')
    expect(rec_section.get_by_role('link')).to_have_count(6)
    expect(page.get_by_text('MAL-only recommendation',exact=True)).to_have_count(0)
    expect(rec_section.get_by_text('Support 92',exact=True)).to_be_visible()
    expect(rec_section.get_by_role('link').last).to_have_attribute('href','https://anilist.co/anime/20005')
    expect(rec_section.get_by_role('link').last).to_have_attribute('rel','noopener noreferrer')
    rating = page.get_by_role('group',name='Your rating')
    expect(rating.get_by_role('button',name='Rate 9 out of 10',exact=True)).to_have_attribute('aria-pressed','true')
    rating.get_by_role('button',name='Rate 8 out of 10',exact=True).click()
    expect(rating.get_by_role('button',name='Rate 8 out of 10',exact=True)).to_have_attribute('aria-pressed','true')
    page.reload()
    expect(rating.get_by_role('button',name='Rate 8 out of 10',exact=True)).to_have_attribute('aria-pressed','true')
    rating.get_by_role('button',name='Clear rating',exact=True).click()
    expect(rating.get_by_role('button',name='Rate 8 out of 10',exact=True)).to_have_attribute('aria-pressed','false')
    assert all(button.evaluate('(el)=>getComputedStyle(el).backgroundImage')=='none' for button in rating.locator('.rating-options button').all()), 'Cleared rating still has filled cells'
    rating.get_by_role('button',name='Rate 8 out of 10',exact=True).focus()
    page.keyboard.press('Enter')
    expect(rating.get_by_role('button',name='Rate 8 out of 10',exact=True)).to_have_attribute('aria-pressed','true')
    for value in range(1,11):
        background=rating.get_by_role('button',name=f'Rate {value} out of 10',exact=True).evaluate('(el)=>getComputedStyle(el).backgroundImage')
        assert ('linear-gradient' in background)==(value<=8), f'Incorrect cumulative fill at {value}'
    assert 'linear-gradient' in rating.get_by_role('button',name='Rate 8 out of 10',exact=True).evaluate('(el)=>getComputedStyle(el).backgroundImage'), 'Selected rating has no gradient'
    assert rating.get_by_role('button',name='Rate 1 out of 10',exact=True).evaluate('(el)=>getComputedStyle(el).backgroundImage') != rating.get_by_role('button',name='Rate 10 out of 10',exact=True).evaluate('(el)=>getComputedStyle(el).backgroundImage'), 'Rating cells have no tint progression'
    for width,height in [(1440,1000),(820,1180),(390,844),(320,760)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(300)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'Detail overflow {width}'
        for button in rating.get_by_role('button').all():
            box=button.bounding_box()
            assert box['width']>=44 and box['height']>=44, f'Rating target too small {width}: {box}'
            assert box['x']>=0 and box['x']+box['width']<=width,f'Clipped rating button {width}: {box}'
        minus=page.get_by_role('button',name='Decrease episode count',exact=True).bounding_box()
        plus=page.get_by_role('button',name='Increase episode count',exact=True).bounding_box()
        assert minus['width']>=44 and minus['height']>=44 and plus['width']>=44 and plus['height']>=44
        status=page.get_by_role('button',name='Status: Watching',exact=True).bounding_box()
        assert status['x']+status['width']<=minus['x'] or status['y']+status['height']<=minus['y'],f'Overlapping status and progress {width}'
        rec_links=rec_section.get_by_role('link')
        first,second=rec_links.nth(0).bounding_box(),rec_links.nth(1).bounding_box()
        assert abs(first['y']-second['y'])<1,f'Recommendations not inline {width}'
        assert second['x']>=first['x']+first['width'],f'Recommendations overlap {width}'
        rec_section.screenshot(path=str(OUT/f'recommendations-{width}.png'))
        page.locator('.detail-controls').evaluate('(el)=>window.scrollTo(0,scrollY+el.getBoundingClientRect().top-100)')
        page.locator('.detail-controls').screenshot(path=str(OUT/f'controls-{width}.png'))
        page.screenshot(path=str(OUT/f'detail-{width}.png'),full_page=True)
    page.get_by_role('button',name='Status: Watching',exact=True).click()
    page.get_by_role('menuitem',name='On Hold',exact=True).click()
    page.reload()
    expect(page.get_by_role('button',name='Status: On Hold',exact=True)).to_be_visible()
    page.get_by_role('button',name='Status: On Hold',exact=True).click()
    page.get_by_role('menuitem',name='Watching',exact=True).click()
    assert len(anilist_requests)==1,anilist_requests
    # Browse uses stable discovery actions even when ranking is loading or empty.
    nodes=[dict(id=r['malId'],title=r['title'],main_picture=r['mainPicture'],mean=r['mean'],num_episodes=r['numEpisodes'],media_type=r['mediaType'],status=r['animeStatus'],genres=r['genres'],start_season=r['startSeason']) for r in records]
    context.route(BASE+'/api/anime/ranking?**',lambda r:r.fulfill(json={'data':[{'node':n} for n in nodes],'paging':{}}))
    page.goto(BASE+'/browse')
    planned=page.get_by_role('button',name='Pick from your planned list',exact=True)
    expect(planned).to_be_visible()
    for width,height in [(1440,1000),(820,1180),(390,844),(320,760)]:
        page.set_viewport_size({'width':width,'height':height})
        expect(planned).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'Browse overflow {width}'
        box=planned.bounding_box()
        assert 72<=box['height']<=144,f'Discovery action too tall {width}: {box}'
        seasonal=page.get_by_role('button',name='Pick an airing anime',exact=True).bounding_box()
        assert abs(box['y']-seasonal['y'])<1,f'Discovery actions are stacked at {width}'
        assert abs(box['height']-seasonal['height'])<1,f'Discovery action heights differ at {width}'
        settings=page.get_by_role('button',name='Filter planned picks',exact=True)
        sb=settings.bounding_box()
        assert sb['width']>=44 and sb['height']>=44
        genres=page.get_by_role('group',name='Genres')
        assert genres.bounding_box()['width']>=page.get_by_role('group',name='Formats').bounding_box()['width']*.9
        page.screenshot(path=str(OUT/f'browse-{width}.png'),full_page=True)
    short_search_requests=[]
    context.route(BASE+'/api/anime?**',lambda route:(short_search_requests.append(route.request.url),route.fulfill(status=503,json={'error':'Unexpected short-query request'})))
    page.get_by_placeholder('Search anime by title…').fill('So')
    expect(page).to_have_url(__import__('re').compile('q=So'))
    expect(page.get_by_role('link',name=__import__('re').compile('^View .* details$'))).to_have_count(1)
    expect(page.get_by_text('Loading titles…',exact=True)).to_have_count(0)
    assert not short_search_requests,short_search_requests
    page.goto(BASE+'/browse')
    expect(planned).to_be_visible()
    settings.click()
    expect(page.get_by_role('dialog')).to_be_visible()
    page.get_by_role('button',name='Close filters',exact=True).click()
    # A cold seasonal pick must fetch the complete season before sharing the cache.
    seasonal_requests=[]
    def seasonal_response(route):
        seasonal_requests.append(route.request.url)
        route.fulfill(json={'data':[{'node':dict(n,status='currently_airing' if n['id']==57334 else 'finished_airing')} for n in nodes],'paging':{}})
    context.route(BASE+'/api/anime/season/**',seasonal_response)
    page.evaluate('Math.random = () => 0')
    page.get_by_role('button',name='Pick an airing anime',exact=True).click()
    page.wait_for_url(__import__('re').compile('/anime/'))
    expect(page).to_have_url(__import__('re').compile('/anime/57334$'))
    assert len(seasonal_requests)==1 and 'limit=500' in seasonal_requests[0],seasonal_requests
    assert not errors,errors
    print('PASS welcome, list/detail/Browse at four widths, episode/status edits, rating persistence and clearing, short local searches, complete seasonal picks; errors',errors)
    browser.close()
