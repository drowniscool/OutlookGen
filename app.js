// TODO:
//  - Fix birthdate month/day selection glitch
//  - Auto-redeem gamepass codes

require('dotenv').config()

const puppeteer = require('puppeteer-extra')
const Chance = require('chance')
const chance = new Chance()
const fs = require('fs');
const output = require('./output')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const CapsolverPlugin = require('puppeteer-extra-plugin-capsolver')();
CapsolverPlugin.setHandler(process.env.API_KEY, 0)
puppeteer.use(CapsolverPlugin);

const {executablePath} = require('puppeteer')

function getRandomProxy() {
  const fileContents = fs.readFileSync('proxies.txt', 'utf-8');
  const strippedFileContents = fileContents.replace(/\r/g, '');
  const proxies = strippedFileContents.split('\n');
  const randomIndex = Math.floor(Math.random() * proxies.length);

  return proxies[randomIndex].split(':');
}

const proxy = getRandomProxy()

output.info('Proxy loaded!', `${proxy[0]}:${proxy[1]}`)

puppeteer.launch({ 
  args: [
    '--no-sandbox',
    '--disable-web-security',
    '--disable-site-isolation-trials',
    '--disable-application-cache',
    `--proxy-server=${proxy[0]}:${proxy[1]}`
  ],
  //headless: false,
  executablePath: executablePath(),
  slowMo: 0
}).then(async browser => {
  const balance = await CapsolverPlugin.handler().balance()

  output.success('Successfully fetched account balance!', `$${balance}`)
  output.success('Starting...')

  const page = await browser.newPage()

  await page.authenticate({
    username: proxy[2],
    password: proxy[3]
  })

  output.info('Navigating to signup page...')
  await page.goto('https://signup.live.com/signup', {
    waitUntil: 'domcontentloaded'
  })

  var email = chance.letter() + chance.hash({ length: 14, casing: 'lower' })
  var password = 'PLACE' + chance.hash({ length: 15, casing: 'upper' })

  output.info('Entering email...', `${email}@outlook.com`)

  await page.waitForSelector('#liveSwitch');
  await page.click('#liveSwitch');
  await page.keyboard.type(email);
  await page.click('#iSignupAction');

  output.info('Entering password...', password.replace(/./g, '*'))
  await page.waitForSelector('#PasswordInput');
  await page.type('#PasswordInput', password);
  await page.click('#iSignupAction');

  var firstName = chance.first()
  var lastName = chance.last()

  output.info('Entering name...', `${firstName} ${lastName}`)

  await page.waitForSelector('#FirstName');
  await page.type('#FirstName', firstName)
  await page.type('#LastName', lastName);
  await page.click('#iSignupAction');

  var birthday = chance.birthday()

  output.info('Entering birthday...', `${birthday.getMonth().toString()}/${birthday.getDay().toString()}/${birthday.getFullYear().toString()}`)

  async function setBirthday(page, birthday) {
    await page.waitForSelector('#BirthMonth');
    await page.select('select#BirthMonth', birthday.getMonth().toString())
    await page.waitForSelector('#BirthDay');
    await page.select('select#BirthDay', birthday.getDay().toString())
    await page.click('#BirthYear')
    await page.keyboard.type(birthday.getFullYear().toString());
    await page.click('#iSignupAction')

    const failedInput = await page.$('#BirthDateError > div');
    if (failedInput) await setBirthday(page, birthday)
  }

  await setBirthday(page, birthday)

  const failedInput = await page.$('#BirthDateError > div');
  if (failedInput) await setBirthday(page, birthday)

  var solvedFc;

  try {
    output.info('Requesting FunCaptcha solution from server...')
    
    solvedFc = await CapsolverPlugin.handler().funcaptcha(
      'https://signup.live.com/signup', 
      'B7D8911C-5CC8-A9A3-35B0-554ACEE604DA',
      {
        proxyType: 'http',
        proxyAddress: proxy[0],
        proxyPort: Number(proxy[1]),
        proxyLogin: proxy[2],
        proxyPassword: proxy[3]
      },
      'client-api.arkoselabs.com', 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:108.0) Gecko/20100101 Firefox/108.0'
    )

    if (solvedFc.error == -1) throw new Error(solvedFc.apiResponse.errorDescription)
  } catch (e) {
    output.error('Captcha failed!', e)
    return browser.close()
  }

  output.success('Received solution!')

  await page.waitForSelector('#enforcementFrame');
  output.info('Injecting FunCaptcha solution to page source...')
  await page.evaluate(token => {
    var enc = document.getElementById('enforcementFrame');
    var encWin = enc.contentWindow || enc;
    var encDoc = enc.contentDocument || encWin.document;
    let script = encDoc.createElement('SCRIPT');
    script.append('function captchaSubmit(token) { parent.postMessage(JSON.stringify({ eventId: "challenge-complete", payload: { sessionToken: token } }), "*") }');
    encDoc.documentElement.appendChild(script);
    encWin.captchaSubmit(token);
  }, solvedFc.solution.token)

  try {
    await page.waitForSelector('#idSIButton9', {
      timeout: 15 * 1000
    })
  } catch (e) {
    output.error('Captcha injection failed!', 'Error: Solution invalidated', 'Proxy most likely blocked by FunCaptcha')

    return browser.close()
  }

  await page.click('#idSIButton9');
  fs.appendFileSync('accounts.txt', `\n${email}@outlook.com:${password}`);
  output.success('Successfully registered!', `${firstName} ${lastName}`, `${email}@outlook.com`, password.replace(/./g, '*'), `${birthday.getMonth().toString()}/${birthday.getDay().toString()}/${birthday.getFullYear().toString()}`, )
  browser.close()
})