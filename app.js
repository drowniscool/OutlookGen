require('dotenv').config()

const fs = require('fs')
const Chance = require('chance')
const Account = require('./account')
const output = require('./output')
const chance = new Chance();

const CapSolver = require('capsolver-npm')
const handler = new CapSolver(process.env.API_KEY, 0)

let usedProxies = [];

function getUnusedProxy() {
  const fileContents = fs.readFileSync('proxies.txt', 'utf-8');
  const strippedFileContents = fileContents.replace(/\r/g, '');
  const proxies = strippedFileContents.split('\n');

  let proxy;
  do {
    const randomIndex = Math.floor(Math.random() * proxies.length);
    proxy = proxies[randomIndex].split(':');
  } while (usedProxies.includes(proxy));

  usedProxies.push(proxy);
  return proxy;
}


(async () => {
  const balance = await handler.balance()

  output.success('SYSTEM', 'Successfully accessed CapSolver account!', `$${balance}`)

  while (true) {
    const proxy = getUnusedProxy()
    const censoredProxy = proxy[0].split('.').map((section, i) => (i > 1 ? '*'.repeat(section.length) : section)).join('.');
    
    output.success('SYSTEM', 'Fetched unused proxy!', `${censoredProxy}:${proxy[1]}`)

    const promises = [];
    for (let i = 0; i < 5; i++) {
      output.info('SYSTEM', 'Generating random user data...')

      const email = chance.letter() + chance.hash({ length: 14, casing: 'lower' })
      const password = 'PLACE' + chance.hash({ length: 15, casing: 'upper' })
      const birthday = chance.birthday()
      const firstName = chance.first()
      const lastName = chance.last()
      const captchaProxy = process.env.CAPTCHA_PROXY.split(':')
    
      const account = new Account(
        email,
        password,
        birthday,
        proxy,
        captchaProxy,
        {
          first: firstName,
          last: lastName
        }
      )
    
      promises.push(account.init({
        headless: true
      }));
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    const results = await Promise.all(promises);
    const successCount = results.filter(result => result).length;
    output.success('SYSTEM', `Successfully created ${successCount} accounts!`);

    const index = usedProxies.indexOf(proxy)
    usedProxies.splice(index, 1)
  }
})();