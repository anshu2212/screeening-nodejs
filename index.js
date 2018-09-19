const puppeteer = require('puppeteer');
const fs = require('fs');
const {username, password} = require('./config.js');

let currentCookies=[];

puppeteer.launch({'headless':true,slowMo:250,args: ["--disable-notifications"]}).then(async browser => {
	if(!fs.existsSync('screenshot')){
		fs.mkdirSync('screenshot');
	}
	const page = await browser.newPage();
	await restoreCokies(page).then(async ()=>{

		await browser.on('disconnected',()=>{storecookies(page)});
		// page.on('load',()=>{keepcookie(page);});
		await page.goto('https://www.facebook.com/find-friends/browser');
		await initialize(page);
	});

})


async function checkLoginPage(page){
	console.log('Attempting login');

	if(page.url().includes('login.php')){
		return Promise.resolve(true);
	}else{
		return await page.$('#pass').then((data)=>{
			if(data!==null){
				return true;
			}else{
				return false;
			}
		})
	}
}


async function storecookies(page){
		fs.writeFile('cookies.txt',JSON.stringify(currentCookies));

}


async function restoreCokies(page){
	console.log('Restoring Cookie from cookies.txt');
	return await fs.readFile('cookies.txt',(err,data)=>{
		if(!err){
			try{
				let cookies= JSON.parse(data);
				// console.log(cookies,currentCookies);
				// return page.setCookie(...cookies).then(async (data)=>{
				// 	// await page.cookies().then(async (newcookies)=>{ console.log(newcookies);});
				// 	return Promise.resolve(true);

				// }).catch((err)=>{
				// 	console.log(err);
				// 	return Promise.resolve(true);
				// });
				return Promise.resolve(true); 
			}catch(e){
				console.log(e);
				return Promise.resolve(true);
			}
		}else{
			return Promise.resolve(true);
		}
	});
}

const attemptLogin= async (page)=> {
	await page.focus('#email');
	// await page.reset('#email');
	await page.keyboard.type(username);
	await page.focus('#pass');
	await page.keyboard.type(password);
	await page.click('#loginbutton');
	return Promise.resolve(true);
}

async function keepcookie(page){
	await page.cookies().then((cookies)=>{
		currentCookies=cookies;
	});
}



async function initialize(page){
	await page.cookies().then((cookies)=>{
		currentCookies=cookies;
	});
	await checkLoginPage(page).then( async (isloginpage)=>{
		if(isloginpage){
			return await attemptLogin(page);
		}else{
			return true;
		}
	}).then(async(isLoggedin)=>{
		console.log('Login Succesfull');
		await browseFriendRequest(page);
	});
}

async function browseFriendRequest(page){
	await page.waitForSelector('div.friendBrowserCheckboxResults li.friendBrowserListUnit').then(async()=>{
		page.$$('div.friendBrowserCheckboxResults li.friendBrowserListUnit').then(async(list)=>{
			if(list.length>0){
				let max_length=5<list.length?5:list.length;
				for(i=0;i<max_length;i++){
					await list[i].$('a').then(async (a)=>{
						await a.getProperty('href').then(async (hrefHandle)=>{
							await hrefHandle.jsonValue().then(async (href)=>{
								await captureUrl(page.browser(),href,i+1);
							});
						});
					});
				}
				console.log('screens saved successfully');
				page.browser().close();
			}else{
				console.log('couldn\'t find any friend suggestion.');
				page.browser().close();
			}
		}).catch(async(error)=>{
			console.log(error);
			page.browser().close();
		})
	}).catch(async(err)=>{
		await page.goto('https://www.facebook.com/find-friends/browser');
		await initialize(page);
	});
}

async function captureUrl(browser, url,index){
	console.log('capturing friend #'+index);
	const page = await browser.newPage();
	await page.goto(url);
	await page.screenshot({path:'screenshot/'+index+'.png'});
	await page.close();
	return Promise.resolve(true);
}
