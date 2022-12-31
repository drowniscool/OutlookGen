require('dotenv').config()

const fs = require('fs')
const Chance = require('chance')
const Account = require('./account')
const output = require('./output')
const chance = new Chance();

function getRandomProxy() {
  const fileContents = fs.readFileSync('proxies.txt', 'utf-8');
  const strippedFileContents = fileContents.replace(/\r/g, '');
  const proxies = strippedFileContents.split('\n');
  const randomIndex = Math.floor(Math.random() * proxies.length);

  return proxies[randomIndex].split(':');
}

(async () => {
  const proxy = getRandomProxy()
  const email = chance.letter() + chance.hash({ length: 14, casing: 'lower' })
  const password = 'PLACE' + chance.hash({ length: 15, casing: 'upper' })
  const birthday = chance.birthday()
  const firstName = chance.first()
  const lastName = chance.last()

  const account = new Account(
    email,
    password,
    birthday,
    proxy,
    {
      first: firstName,
      last: lastName
    }
  )

  const balance = await account.getBalance()

  output.success('Successfully accessed CapSolver account!', `$${balance}`)

  await account.init({
    headless: false
  })
})();