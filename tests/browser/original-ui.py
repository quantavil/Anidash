"""Run with a local server: python tests/browser/watch-journal.py [base_url].
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
    page.goto(BASE+'/anime/52991')
    expect(page.get_by_role('slider')).to_have_attribute('aria-valuenow','9')
    page.get_by_role('slider').focus()
    page.keyboard.press('ArrowLeft')
    expect(page.get_by_role('slider')).to_have_attribute('aria-valuenow','8')
    page.reload()
    expect(page.get_by_role('slider')).to_have_attribute('aria-valuenow','8')
    for width,height in [(1440,1000),(820,1180),(390,844),(320,760)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(300)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'Detail overflow {width}'
        page.screenshot(path=str(OUT/f'detail-{width}.png'),full_page=True)
    assert not errors,errors
    print('PASS original screens, welcome, responsive widths, episode edits, filtering, sorting, rating persistence; errors',errors)
    browser.close()
