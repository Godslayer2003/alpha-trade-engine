async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let signedIn = false, linked = true, failDisconnect = true, chatPayload;
  const candles = Array.from({length:60},(_,i)=>({time:new Date(Date.UTC(2026,0,i+1)).toISOString(),open:100+i,high:102+i,low:99+i,close:101+i,volume:1000}));
  await page.route('**/backend/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let status=200, data=[];
    if(path.endsWith('/auth/session')) {status=signedIn?200:401;data=signedIn?{user:{id:'privacy-fixture',email:'fixture@example.invalid'}}:{message:'Unauthorized'};}
    else if(path.endsWith('/profile')) data={riskTolerance:'MODERATE',timeHorizonYears:5,age:null,profilePictureUrl:null,dailyReportEnabled:false,dailyReportTime:'08:00',dailyReportChannels:[]};
    else if(path.endsWith('/payments/status')) data={paid:true,admin:false};
    else if(path.endsWith('/market/candles')) data=candles;
    else if(path.endsWith('/reports')) data={content:'Synthetic market report.',citations:[],grounded:false,generatedAt:new Date().toISOString()};
    else if(path.endsWith('/portfolio')) data={cashBalance:10000,totalValue:10000,holdings:[],trades:[]};
    else if(path.endsWith('/telegram/status')) data={linked,linkedAt:linked?new Date().toISOString():null};
    else if(path.endsWith('/telegram/link')) {if(failDisconnect){status=503;data={message:'Fixture disconnect error'};failDisconnect=false;}else{linked=false;data={ok:true};}}
    else if(path.endsWith('/telegram/link-code')) data={code:'a'.repeat(32)};
    else if(path.endsWith('/assistant/chat')) {chatPayload=route.request().postDataJSON();data={reply:'Synthetic educational response',citations:[],model:'fixture',inputTokens:1,outputTokens:1,responseTimeMs:1};}
    return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  const results=[];
  for(const theme of ['dark','light']) for(const width of [320,390,1280]) {
    await page.goto('http://127.0.0.1:3010/privacy');
    await page.evaluate(value=>localStorage.setItem('alpha-trade-theme',value),theme);
    await page.setViewportSize({width,height:900});
    await page.reload();
    await page.getByRole('heading',{name:'Privacy policy',exact:true}).waitFor();
    check(await page.getByText('Neon stores account data',{exact:false}).count()>0,'Neon disclosure missing');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Privacy overflow');
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await page.getByRole('button',{name:'Need an account?',exact:true}).click();
    check(await page.getByRole('link',{name:'Read the Privacy policy',exact:true}).isVisible(),'Signup privacy notice missing');
    check(!await page.getByRole('checkbox').isChecked(),'Terms must start unchecked');
    await page.keyboard.press('Escape');
    await page.goto('http://127.0.0.1:3010/disclaimer');
    check(await page.getByText('The separate AI Guide',{exact:false}).count()>0,'Payment distinction missing');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Terms overflow');
    results.push({theme,width,privacy:true,terms:true,signup:true});
  }
  signedIn=true;
  await page.goto('http://127.0.0.1:3010/settings');
  const disconnect=page.getByRole('button',{name:'Disconnect Telegram',exact:true});
  await disconnect.click();
  await page.getByRole('alert').filter({hasText:'Fixture disconnect error'}).waitFor();
  await disconnect.click();
  await page.getByRole('button',{name:'Connect Telegram',exact:true}).click();
  await page.getByRole('button',{name:'Generate a new code',exact:true}).waitFor();
  await page.getByRole('button',{name:'Generate a new code',exact:true}).click();
  check(await page.getByText('it expires in ten minutes',{exact:false}).isVisible(),'Link expiry notice missing');
  await page.goto('http://127.0.0.1:3010/dashboard');
  await page.setViewportSize({width:320,height:900});
  await page.getByRole('button',{name:'Open AI guide',exact:true}).click();
  await page.getByRole('textbox',{name:'Message for AI Guide',exact:true}).waitFor();
  check(await page.getByRole('link',{name:'Privacy details',exact:true}).isVisible(),'AI privacy notice missing');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Chat overflow');
  await page.getByRole('textbox',{name:'Message for AI Guide',exact:true}).fill('Explain simulated trading');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await page.getByText('Synthetic educational response',{exact:true}).waitFor();
  check(chatPayload && !Object.hasOwn(chatPayload.context,'portfolio'),'Portfolio was automatically sent to AI');
  check(!Object.hasOwn(chatPayload.context,'userId'),'Account identity was sent to AI');
  await page.screenshot({path:'.security-scan/privacy-chat-mobile.png'});
  await page.getByRole('button',{name:'Close AI guide',exact:true}).click();
  await page.setViewportSize({width:1280,height:900});
  await page.goto('http://127.0.0.1:3010/privacy');
  await page.screenshot({path:'.security-scan/privacy-desktop.png',fullPage:true});
  check(errors.length===0,errors.join('\n'));
  return {results,telegram:{disconnectError:true,disconnect:true,regenerate:true},chat:{privacyNotice:true,noPortfolio:true},pageErrors:errors,data:'Synthetic local responses only'};
}
