"""Isolated detail-page ergonomics and editing regression; never touches a real account."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173'
OUT = Path('/tmp/anidash-original-checks')
OUT.mkdir(exist_ok=True)
# Reuse the isolated collection records, without executing that test's browser session.
source = Path(__file__).with_name('watch-journal.py').read_text()
fixtures = {}
exec(source.split('with sync_playwright() as p:')[0], fixtures)
record = fixtures['records'][0]
detail = dict(id=record['malId'], title=record['title'], alternative_titles={'en':record['titleEnglish']}, main_picture=record['mainPicture'], mean=record['mean'], num_episodes=record['numEpisodes'], media_type='tv', status='finished_airing', start_season=record['startSeason'], genres=record['genres'], studios=[{'id':11,'name':'Madhouse'}], num_list_users=1000000, num_scoring_users=500000, synopsis='A journey continues beyond the final battle. <b>This remains plain text.</b> ' * 10)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1000})
    context.route(BASE+'/api/**', lambda r:r.fulfill(status=503,json={'error':'Isolated check'}))
    context.route(BASE+f"/api/anime/{record['malId']}?**", lambda r:r.fulfill(json=detail))
    context.route('https://graphql.anilist.co/**', lambda r:r.fulfill(status=404,json={'data':{'Media':None}}))
    context.route('**/raw.githubusercontent.com/**',lambda r:r.fulfill(json={'dubbed':[]}))
    page = context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.evaluate("""async record=>{
      localStorage.setItem('anidash_tokens',JSON.stringify({accessToken:'isolated',refreshToken:'isolated',expiresAt:Date.now()+86400000}));
      localStorage.setItem('anidash_user_profile',JSON.stringify({id:123,name:'Yuki'}));
      localStorage.setItem('anidash_prefer_english','true');
      sessionStorage.setItem('anidash_has_synced_this_session','true');
      const req=indexedDB.open('anidash',2);const db=await new Promise(r=>req.onsuccess=()=>r(req.result));
      const tx=db.transaction(['userList','meta'],'readwrite');tx.objectStore('userList').put(record);
      tx.objectStore('meta').put({key:'lastSync',value:Date.now(),updatedAt:Date.now()});
      await new Promise(r=>tx.oncomplete=r);db.close();
    }""",record)
    page.goto(BASE+f"/anime/{record['malId']}")
    expect(page.get_by_role('heading',level=1)).to_contain_text(record['titleEnglish'])
    expect(page.get_by_text('MAL community',exact=True)).to_be_visible()
    for width,height in [(1440,1000),(820,1180),(390,844),(320,760)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(300)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'Overflow at {width}'
        cover=page.locator('.detail-cover').bounding_box()
        assert 1.35 <= cover['height']/cover['width'] <= 1.65,cover
        for control in page.locator('.detail-controls button:visible, .detail-controls select:visible, .detail-links a:visible, .detail-links button:visible').all():
            box=control.bounding_box()
            assert box['width']>=44 and box['height']>=44,box
        page.screenshot(path=str(OUT/f'detail-{width}.png'),full_page=True)
    page.get_by_role('button',name='Rate 8 out of 10: Very good',exact=True).click()
    expect(page.get_by_role('button',name='Rate 8 out of 10: Very good',exact=True)).to_have_attribute('aria-pressed','true')
    page.get_by_role('button',name='Mark episode 19 watched').click()
    expect(page.get_by_role('button',name='Mark episode 20 watched')).to_be_visible()
    page.reload()
    expect(page.get_by_role('button',name='Rate 8 out of 10: Very good',exact=True)).to_have_attribute('aria-pressed','true')
    expect(page.get_by_role('button',name='Mark episode 20 watched')).to_be_visible()
    page.get_by_role('button',name='Status: Watching',exact=True).click()
    expect(page.get_by_role('menuitem',name='On Hold',exact=True)).to_be_visible()
    page.get_by_role('menuitem',name='On Hold',exact=True).click()
    expect(page.get_by_role('button',name='Status: On Hold',exact=True)).to_be_visible()
    assert page.locator('.synopsis-copy b').count()==0,'Synopsis must remain plain text'
    assert not errors,errors
    print(json.dumps({'result':'PASS','viewports':[1440,820,390,320],'screenshots':str(OUT),'errors':errors}))
    browser.close()
