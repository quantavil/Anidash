"""Run with a local server: python tests/browser/watch-journal.py [base_url].
Uses isolated browser storage and intercepted MAL requests, never a real account.
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5173'
OUT = Path('/tmp/anidash-ui-checks')
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
    context.route('**/raw.githubusercontent.com/**', lambda route: route.fulfill(json={'dubbed':[]}))
    page = context.new_page()
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
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
    # Regression: editing a score must be available without entering a detail page.
    rating=page.get_by_role('combobox',name='Your rating for Sousou no Frieren')
    expect(rating).to_be_visible(timeout=5000)
    for width,height,label in [(1440,1000,'desktop'),(820,1180,'tablet'),(390,844,'phone'),(320,760,'narrow')]:
        page.set_viewport_size({'width':width,'height':height})
        for offset in range(0,page.evaluate('document.documentElement.scrollHeight'),500):
            page.evaluate('(offset)=>scrollTo(0,offset)',offset)
            page.wait_for_timeout(100)
        page.wait_for_timeout(700)
        page.evaluate('scrollTo(0,0)')
        page.screenshot(path=str(OUT/f'{label}.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'Overflow at {width}'
        expect(rating).to_be_visible()
        for button in page.locator('.journal-entry .step').all():
            box=button.bounding_box()
            assert box['width']>=44 and box['height']>=44,box
    page.set_viewport_size({'width':1440,'height':1000})
    rating.select_option('10')
    expect(rating).to_have_value('10')
    expect(page.get_by_role('heading',name='Watching',exact=True)).to_be_visible()
    page.get_by_role('button',name='Mark episode 19 watched').click()
    expect(page.get_by_role('button',name='Mark episode 20 watched')).to_be_visible()
    page.get_by_role('button',name='Decrease episode count for Sousou no Frieren').click()
    expect(page.get_by_role('button',name='Mark episode 19 watched')).to_be_visible()
    # Native select must preserve keyboard access and store persistence.
    page.wait_for_timeout(300)
    saved=page.evaluate("""async()=>{const req=indexedDB.open('anidash',2);const db=await new Promise(r=>req.onsuccess=()=>r(req.result));const q=db.transaction('userList').objectStore('userList').get(52991);const value=await new Promise(r=>q.onsuccess=()=>r(q.result));db.close();return value;}""")
    assert saved['score']==10 and saved['numWatchedEpisodes']==18,saved
    page.set_viewport_size({'width':320,'height':760})
    page.get_by_role('button',name='Poster grid').click()
    expect(page).to_have_url(__import__('re').compile('view=grid'))
    for button in page.locator('.pill-base.compact .pill-btn').all():
        box=button.bounding_box()
        assert box['width']>=44 and box['height']>=44,box
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'Grid overflow'
    page.get_by_role('combobox',name='Your rating for Sousou no Frieren').select_option('8')
    expect(page.get_by_role('combobox',name='Your rating for Sousou no Frieren')).to_have_value('8')
    page.screenshot(path=str(OUT/'grid-phone.png'),full_page=True)
    page.get_by_role('button',name='Journal view').click()
    page.get_by_role('textbox',name='Search your list').fill('nothing-matches')
    expect(page.get_by_text('No matches',exact=True)).to_be_visible()
    page.get_by_role('button',name='Clear search').click()
    expect(rating).to_be_visible()
    page.get_by_role('tab',name=__import__('re').compile('Plan')).click()
    cowboy=page.get_by_role('combobox',name='Status for Cowboy Bebop').locator('xpath=ancestor::article')
    cowboy.get_by_role('button',name='Mark episode 1 watched').click()
    page.get_by_role('tab',name=__import__('re').compile('Watching')).click()
    expect(page.get_by_role('combobox',name='Your rating for Cowboy Bebop')).to_be_visible()
    cowboy=page.get_by_role('combobox',name='Status for Cowboy Bebop').locator('xpath=ancestor::article')
    expect(cowboy.get_by_role('button',name='Mark episode 2 watched')).to_be_visible()
    page.get_by_role('combobox',name='Status for Sousou no Frieren').select_option('on_hold')
    expect(page.get_by_role('combobox',name='Your rating for Sousou no Frieren')).to_have_count(0)
    page.get_by_role('tab',name=__import__('re').compile('On Hold')).click()
    expect(page.get_by_role('combobox',name='Your rating for Sousou no Frieren')).to_have_value('8')
    page.get_by_role('button',name='Settings and account').click()
    expect(page.get_by_role('region',name='Your preferences')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.get_by_role('region',name='Your preferences')).to_have_count(0)
    # Boundary cases: full progress, unknown totals, missing ratings, and long titles.
    page.evaluate("""async()=>{
      const req=indexedDB.open('anidash',2);const db=await new Promise(r=>req.onsuccess=()=>r(req.result));
      const tx=db.transaction('userList','readwrite');const store=tx.objectStore('userList');
      const a=store.get(52991);a.onsuccess=()=>store.put({...a.result,status:'watching',numWatchedEpisodes:28});
      const b=store.get(37521);b.onsuccess=()=>store.put({...b.result,numEpisodes:0,mean:null,titleEnglish:'A very long anime title about a traveller finding a home among unfamiliar stars and returning to the places they once loved'});
      await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=reject});db.close();
    }""")
    page.goto(BASE)
    expect(page.get_by_role('button',name='Sousou no Frieren: all episodes watched')).to_be_disabled()
    unknown=page.get_by_role('combobox',name='Status for Vinland Saga').locator('xpath=ancestor::article')
    expect(unknown.get_by_role('progressbar')).not_to_have_attribute('aria-valuemax')
    unknown.get_by_role('button',name='Mark episode 10 watched').click()
    expect(unknown.get_by_role('button',name='Mark episode 11 watched')).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'Long-title overflow'
    page.get_by_role('combobox',name='Status for Sousou no Frieren').select_option('completed')
    expect(page.get_by_role('combobox',name='Status for Sousou no Frieren')).to_have_count(0)
    # Browse cards use the same real-record mapping, with a controlled MAL response.
    ranking={'data':[{'node':{'id':r['malId'],'title':r['title'],'alternative_titles':{'en':r['titleEnglish']},'main_picture':r['mainPicture'],'mean':r['mean'],'num_episodes':r['numEpisodes'],'genres':r['genres'],'media_type':r['mediaType'],'start_season':r['startSeason']}} for r in records],'paging':{}}
    context.route(BASE+'/api/anime/ranking**',lambda route:route.fulfill(json=ranking))
    page.goto(BASE+'/browse')
    expect(page.get_by_role('link',name='View Sousou no Frieren details')).to_be_visible()
    for width,height in [(1440,1000),(820,1180),(390,844),(320,760)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'Browse overflow at {width}'
        for control in page.locator('[aria-haspopup="menu"]').all():
            box=control.bounding_box()
            assert box['width']>=44 and box['height']>=44,box
        page.screenshot(path=str(OUT/f'browse-{width}.png'),full_page=True)
    page.get_by_role('button',name='Status: Completed',exact=True).first.click()
    expect(page.get_by_role('menuitem',name='Remove',exact=True)).to_be_visible()
    page.get_by_role('menuitem',name='Remove',exact=True).click(timeout=3000)
    expect(page.get_by_role('button',name='Add Sousou no Frieren to Plan to Watch')).to_be_visible()
    # The seasonal helper must not seed the season cache from a truncated response.
    seasonal_requests=[]
    def seasonal_response(route):
        seasonal_requests.append(route.request.url)
        route.fulfill(json=ranking)
    context.route(BASE+'/api/anime/season/**',seasonal_response)
    page.get_by_role('button',name='Roll Seasonal Surprise').click()
    page.wait_for_url(__import__('re').compile('/anime/'))
    assert len(seasonal_requests)==1 and 'limit=500' in seasonal_requests[0],seasonal_requests
    assert not errors,errors
    print(json.dumps({'result':'PASS','viewports':[1440,820,390,320],'screenshots':str(OUT),'errors':errors}))
    browser.close()
