async (page) => {
  const check=(value,message)=>{if(!value)throw new Error(message);};
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.unroute('**/backend/api/**');
  let signedIn=false, eligible=false, paid=false, operator=false, failContact=true, contactBody;
  const request={id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid',category:'privacy',message:'<img src=x onerror=alert(1)> Please explain retention.',createdAt:new Date().toISOString()};
  await page.route('**/backend/api/**',async route=>{
    const path=new URL(route.request().url()).pathname, method=route.request().method();let status=200,data=[];
    if(path.endsWith('/auth/session')){status=signedIn?200:401;data=signedIn?{user:{id:'launch-fixture',email:'fixture@example.invalid'}}:{message:'Unauthorized'};}
    else if(path.endsWith('/auth/ai-eligibility')){if(method==='POST'){eligible=true;check(JSON.stringify(route.request().postDataJSON())===JSON.stringify({country:'CA',adult:true}),'Unexpected AI declaration');}else if(method==='DELETE')eligible=false;data={eligible};}
    else if(path.endsWith('/payments/status'))data={paid,admin:false,checkoutAvailable:false};
    else if(path.endsWith('/contact')&&method==='POST'){contactBody=route.request().postDataJSON();if(failContact){failContact=false;status=503;data={message:'Synthetic submission error'};}else data={receipt:request.id};}
    else if(path.endsWith('/contact')){status=operator?200:403;data=operator?[request]:{message:'Admin access required'};}
    else if(path.endsWith('/resolve'))data={ok:true};
    else if(path.endsWith('/market/candles'))data=[];
    else if(path.endsWith('/reports')){status=403;data={message:'Confirm AI eligibility'};}
    return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  const layouts=[];
  for(const theme of ['dark','light'])for(const width of [320,390,1280]){
    await page.goto('http://127.0.0.1:3010/contact');await page.evaluate(theme=>localStorage.setItem('alpha-trade-theme',theme),theme);await page.setViewportSize({width,height:900});await page.reload();
    await page.getByRole('heading',{name:'Privacy and support',exact:true}).waitFor();
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Contact overflow');
    check(await page.getByLabel('Message',{exact:true}).isVisible(),'Missing message control');
    layouts.push({theme,width});
  }
  await page.getByLabel('Reply email',{exact:true}).fill('fixture@example.invalid');
  await page.getByLabel('Message',{exact:true}).fill('Please explain retention of my account.');
  await page.getByRole('button',{name:'Submit request',exact:true}).click();await page.getByRole('alert').filter({hasText:'Synthetic submission error'}).waitFor();
  await page.getByRole('button',{name:'Submit request',exact:true}).click();await page.getByRole('status').filter({hasText:'Request recorded'}).waitFor();
  check(contactBody.email==='fixture@example.invalid'&&contactBody.category==='privacy','Invalid contact payload');
  await page.screenshot({path:'.security-scan/contact-desktop.png'});
  signedIn=true;await page.goto('http://127.0.0.1:3010/ai-access');
  const confirm=page.getByRole('button',{name:'Confirm eligibility',exact:true});check(await confirm.isDisabled(),'Eligibility must require an unchecked declaration');
  await page.getByRole('checkbox').check();await confirm.click();await page.getByRole('status').filter({hasText:'Eligibility recorded'}).waitFor();
  await page.getByRole('button',{name:'Withdraw AI eligibility',exact:true}).click();await page.getByRole('status').filter({hasText:'AI eligibility withdrawn'}).waitFor();check(await confirm.isDisabled(),'Withdrawal must reset declaration');
  await page.getByRole('checkbox').check();await confirm.click();await page.getByRole('status').filter({hasText:'Eligibility recorded'}).waitFor();
  await page.goto('http://127.0.0.1:3010/dashboard');await page.setViewportSize({width:320,height:900});await page.getByRole('button',{name:'Open AI guide',exact:true}).click();
  await page.getByText('New purchases are currently unavailable.',{exact:false}).waitFor();check(await page.getByRole('button',{name:'Unlock AI Guide — US$5',exact:true}).isDisabled(),'Unavailable checkout must be disabled');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'AI payment notice overflow');await page.screenshot({path:'.security-scan/launch-mobile.png'});
  await page.goto('http://127.0.0.1:3010/settings/requests');await page.getByRole('alert').filter({hasText:'Admin access required'}).waitFor();check(await page.getByText(request.message,{exact:true}).count()===0,'Inbox exposed without authorization');
  operator=true;await page.reload();await page.getByText(request.message,{exact:true}).waitFor();check(await page.locator('article img').count()===0,'Contact text interpreted as HTML');
  await page.getByRole('button',{name:'Log out',exact:true}).click();await page.getByText('Sign in to continue.',{exact:true}).waitFor();check(await page.getByText(request.message,{exact:true}).count()===0,'Inbox retained private requests after logout');
  await page.reload();await page.getByText(request.message,{exact:true}).waitFor();
  await page.getByRole('button',{name:'Mark resolved',exact:true}).click();await page.getByText('No open requests.',{exact:true}).waitFor();
  check(errors.length===0,errors.join('\n'));return{layouts,contact:{failure:true,receipt:true},eligibility:{unchecked:true,confirmed:true},checkoutDisabled:true,inbox:{denied:true,escaped:true,resolved:true},pageErrors:errors,data:'Synthetic local responses only'};
}
