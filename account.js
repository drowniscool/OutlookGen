const fs = require('fs')
const puppeteer = require('puppeteer-extra')
const output = require('./output')
const { executablePath } = require('puppeteer')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const CapSolver = require('capsolver-npm')
const handler = new CapSolver(process.env.API_KEY, 0)

class account {
  constructor(email, password, birthday, proxy, captchaProxy, name = { first, last }) {
    this.proxy = proxy
    this.captchaProxy = captchaProxy
    this.name = name

    this.birthday = {
      formatted: `${(birthday.getMonth() + 1 ).toString()}/${birthday.getDate().toString()}/${birthday.getFullYear().toString()}`,
      raw: birthday
    }

    this.email = {
      formatted: `${email}@outlook.com`,
      raw: email
    }

    this.password = {
      censored: password.replace(/./g, '*'),
      raw: password
    }
  }

  async getBalance() {
    const balance = await handler.balance()
    this.balance = balance

    return balance
  }

  async init(options = { headless, slowMo }) {
    output.info(this.name.first, 'Initializing...')

    const browser = await puppeteer.launch({ 
      args: [
        '--no-sandbox',
        '--disable-web-security',
        '--disable-site-isolation-trials',
        '--disable-application-cache',
        `--proxy-server=${this.proxy[0]}:${this.proxy[1]}`
      ],
      headless: options.headless,
      executablePath: executablePath(),
      slowMo: options.slowMo
    })

    this.browser = browser

    const page = await browser.newPage()

    await page.authenticate({
      username: this.proxy[2],
      password: this.proxy[3]
    })

    output.info(this.name.first, 'Navigating to signup page...')
    await page.goto('https://signup.live.com/signup', {
      waitUntil: 'domcontentloaded'
    })

    output.info(this.name.first, 'Entering email...', `${this.email.formatted}`)

    await page.waitForSelector('#liveSwitch');
    await page.click('#liveSwitch')

    await page.type('#MemberName', this.email.raw);
    await page.click('#iSignupAction');

    output.info(this.name.first, 'Entering password...', this.password.censored)
    await page.waitForSelector('#PasswordInput');
    await page.type('#PasswordInput', this.password.raw);
    await page.click('#iSignupAction');

    output.info(this.name.first, 'Entering name...', `${this.name.first} ${this.name.last}`)

    await page.waitForSelector('#FirstName');
    await page.type('#FirstName', this.name.first)
    await page.type('#LastName', this.name.last);
    await page.click('#iSignupAction');
    
    output.info(this.name.first, 'Entering birthday...', this.birthday.formatted)

    await page.waitForSelector('#BirthMonth');
    await page.select('select#BirthMonth', (this.birthday.raw.getMonth() + 1).toString())
    await page.waitForSelector('#BirthDay');
    await page.select('select#BirthDay', this.birthday.raw.getDate().toString())
    await page.click('#BirthYear')
    await page.keyboard.type(this.birthday.raw.getFullYear().toString());
    await page.click('#iSignupAction')

    var solvedFc;

    const phoneLocked = await page.waitForSelector('#HipPaneForm > div.text-title.forSmsHip', {
      timeout: 3 * 1000
    }).catch(e => {})

    if (phoneLocked) {
      output.error(this.name.first, 'Blocked by Microsoft!', 'Error: Phone verification required')
      output.warn(this.name.first, 'Try switching your proxies!')

      browser.close()

      return false
    }

    try {
      await page.waitForSelector('#enforcementFrame');
      output.info(this.name.first, 'Requesting FunCaptcha solution from server...')
      
      solvedFc = await handler.funcaptcha(
        'https://signup.live.com/signup', 
        'B7D8911C-5CC8-A9A3-35B0-554ACEE604DA',
        {
          proxyType: 'http',
          proxyAddress: this.captchaProxy[2],
          proxyPort: Number(this.captchaProxy[3]),
          proxyLogin: this.captchaProxy[0],
          proxyPassword: this.captchaProxy[1]
        },
        'client-api.arkoselabs.com', 
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:108.0) Gecko/20100101 Firefox/108.0'
      )
  
      if (solvedFc.error == -1) throw new Error(solvedFc.apiResponse.errorDescription)
    } catch (e) {
      output.error(this.name.first, 'Captcha failed!', e)
      
      browser.close()
      
      return false 
    }

    const balance = await this.getBalance()

    output.success(this.name.first, 'Received solution!', `$${balance}`)

    output.info(this.name.first, 'Injecting FunCaptcha solution to page source...')
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
        timeout: 10 * 1000
      })
    } catch (e) {
      output.error(this.name.first, 'Captcha injection failed!', e)
      output.warn(this.name.first, 'Your proxy may have been blocked!', 'Must be HQ')
      
      browser.close()
      
      return false
    }
    
    await page.click('#idSIButton9');
    output.success(this.name.first, 'Successfully registered!', `${this.name.first} ${this.name.last}`, this.email.formatted, this.password.censored, this.birthday.formatted)
    
    fs.appendFileSync('accounts.txt', `\n${this.email.formatted}:${this.password.raw}`);

    const accounts = fs.readFileSync('accounts.txt', 'utf8').split('\n').length
    output.info(this.name.first, 'The account has been saved!', `${accounts} accounts`)

    return true
  }
}

module.exports = account