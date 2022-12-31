const fs = require('fs')
const puppeteer = require('puppeteer-extra')
const output = require('./output')
const { executablePath } = require('puppeteer')

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const CapSolver = require('capsolver-npm')
const handler = new CapSolver(process.env.API_KEY, 0)

class account {
  constructor(email, password, birthday, proxy, name = { first, last }) {
    this.proxy = proxy
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
    output.info('Initializing new account...')

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

    output.info('Navigating to signup page...')
    await page.goto('https://signup.live.com/signup', {
      waitUntil: 'domcontentloaded'
    })

    output.info('Entering email...', `${this.email.formatted}`)

    await page.waitForSelector('#liveSwitch');
    await page.click('#liveSwitch')

    await page.type('#MemberName', this.email.raw);
    await page.click('#iSignupAction');

    output.info('Entering password...', this.password.censored)
    await page.waitForSelector('#PasswordInput');
    await page.type('#PasswordInput', this.password.raw);
    await page.click('#iSignupAction');

    output.info('Entering name...', `${this.name.first} ${this.name.last}`)

    await page.waitForSelector('#FirstName');
    await page.type('#FirstName', this.name.first)
    await page.type('#LastName', this.name.last);
    await page.click('#iSignupAction');
    
    output.info('Entering birthday...', this.birthday.formatted)

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
      output.error('Blocked by Microsoft!', 'Error: Phone verification required')
      output.warn('Try switching your proxies!')

      return browser.close()
    }

    try {
      await page.waitForSelector('#enforcementFrame');
      output.info('Requesting FunCaptcha solution from server...')
      
      solvedFc = await handler.funcaptcha(
        'https://signup.live.com/signup', 
        'B7D8911C-5CC8-A9A3-35B0-554ACEE604DA',
        {
          proxyType: 'http',
          proxyAddress: this.proxy[0],
          proxyPort: Number(this.proxy[1]),
          proxyLogin: this.proxy[2],
          proxyPassword: this.proxy[3]
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
        timeout: 10 * 1000
      })
    } catch (e) {
      output.error('Captcha injection failed!', e)
      output.warn('Your proxy may have been blocked!', 'Must be HQ')
  
      return browser.close()
    }
    
    await page.click('#idSIButton9');
    output.success('Successfully registered!', `${this.name.first} ${this.name.last}`, this.email.formatted, this.password.censored, this.birthday.formatted)
    
    fs.appendFileSync('accounts.txt', `\n${email}@outlook.com:${password}`);

    const accounts = fs.readFileSync('accounts.txt', 'utf8').split('\n').length
    output.info('The account has been saved!', `You now have: ${accounts} accounts`)
  }
}

module.exports = account