const chalk = require('chalk')

class output {
  static info(msg, ...args) {
    const argsString = args ? args.map(arg => `${chalk.gray(`(${chalk.bold.blue(arg)})`)}`).join(' ') : '';

    console.log(`${chalk.bold.gray(`[${chalk.bold.blue('~')}]`)} ${chalk.white(msg)} ${argsString}`)
  }

  static warn(msg, ...args) {
    const argsString = args ? args.map(arg => `${chalk.gray(`(${chalk.bold.yellow(arg)})`)}`).join(' ') : '';

    console.log(`${chalk.bold.bold.gray(`[${chalk.bold.yellow('!')}]`)} ${chalk.white(msg)} ${argsString}`)
  }

  static error(msg, ...args) {
    const argsString = args ? args.map(arg => `${chalk.gray(`(${chalk.bold.red(arg)})`)}`).join(' ') : '';

    console.log(`${chalk.bold.gray(`[${chalk.bold.red('-')}]`)} ${chalk.white(msg)} ${argsString}`)
  }

  static success(msg, ...args) {
    const argsString = args ? args.map(arg => `${chalk.gray(`(${chalk.bold.greenBright(arg)})`)}`).join(' ') : '';

    console.log(`${chalk.bold.gray(`[${chalk.bold.greenBright('+')}]`)} ${chalk.white(msg)} ${argsString}`)
  }
}

module.exports = output
