require('dotenv').config()

const puppeteer = require('puppeteer-extra')
const Chance = require('chance')
const chance = new Chance()
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const CapsolverPlugin = require('puppeteer-extra-plugin-capsolver')();
CapsolverPlugin.setHandler('CAI-7AD251B2C234BDF682FCF6C609AD5493', 0)
puppeteer.use(CapsolverPlugin);

const {executablePath} = require('puppeteer')

puppeteer.launch({ 
  args: [
    '--no-sandbox',
    '--disable-web-security',
    '--disable-site-isolation-trials',
    '--disable-application-cache'
  ],
  headless: false,
  executablePath: executablePath(),
  slowMo: 75
}).then(async browser => {
  const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));
  const balance = await CapsolverPlugin.handler().balance()

  console.log(`[+] Balance: $${balance} | Starting...`)

  const page = await browser.newPage()

  console.log('[~] Navigating to signup page...')
  await page.goto('https://signup.live.com/signup', {
    waitUntil: 'networkidle0'
  })

  console.log('[~] Entering authentication details... (email, password)')
  var email = chance.letter() + chance.hash({ length: 14, casing: 'lower' })
  var password = 'PLACE' + chance.hash({ length: 15, casing: 'upper' })

  await page.click('#liveSwitch');
  await page.keyboard.type(email);
  await page.click('#iSignupAction');

  await sleep(1000)
  await page.keyboard.type(password);
  await page.click('#iSignupAction');

  var firstName = chance.first()
  var lastName = chance.last()

  console.log(`[~] Entering first and last name... (${firstName} ${lastName})`)

  await sleep(1000)
  await page.keyboard.type(firstName);
  await page.click('#LastName');
  await page.keyboard.type(lastName);
  await page.click('#iSignupAction');

  var birthday = chance.birthday()

  console.log(`[~] Entering birthday details... (${birthday.getMonth().toString()}/${birthday.getDay().toString()}/${birthday.getFullYear().toString()})`)

  await sleep(2000)
  await page.select('select#BirthMonth', birthday.getMonth().toString())
  await page.select('select#BirthDay', birthday.getDay().toString())
  await page.click('#BirthYear')
  await page.keyboard.type(birthday.getFullYear().toString());
  await page.click('#iSignupAction')

  var solvedFc;

  try {
    console.log('[~] Submitting captcha to solver...')
    
    solvedFc = await CapsolverPlugin.handler().funcaptcha(
      'https://signup.live.com/signup', 
      'B7D8911C-5CC8-A9A3-35B0-554ACEE604DA',
      {
        proxyType: 'http',
        proxyAddress: '52.3.95.147',
        proxyPort: 31112,
        proxyLogin: 'xixmen',
        proxyPassword: 'lOoUm3MYfX2oDMLj_country-UnitedStates'
      },
      'client-api.arkoselabs.com', 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:108.0) Gecko/20100101 Firefox/108.0'
    )

    if (solvedFc.error == -1) throw new Error(solvedFc.apiResponse.errorDescription)
  } catch (e) {
    console.log(`[-] Captcha Failed: ${e}`)
    return browser.close()
  }

  console.log('[+] Received captcha solution!')

  await page.waitForSelector('#enforcementFrame');

  console.log('[~] Injecting captcha solution to page src...')

  await page.evaluate(token => {
    var enc = document.getElementById('enforcementFrame');
    var encWin = enc.contentWindow || enc;
    var encDoc = enc.contentDocument || encWin.document;
    let script = encDoc.createElement('SCRIPT');
    script.append('function captchaSubmit(token) { parent.postMessage(JSON.stringify({ eventId: "challenge-complete", payload: { sessionToken: token } }), "*") }');
    encDoc.documentElement.appendChild(script);
    encWin.captchaSubmit(token);
  }, solvedFc.solution.token)

  await page.waitForNavigation();
  await page.click('#idSIButton9');

  console.log(`[+] Successfully registered ${firstName} ${lastName} | ${email}@outlook.com:${password} | ${birthday.toDateString()}`)
})