const chalk = require('chalk')

class output {
  static info(author, msg, ...args) {
    const argsString = args ? args.map(arg => `${chalk.gray(`(${chalk.bold.blue(arg)})`)}`).join(' ') : '';

    console.log(`${chalk.bold.gray(`[${chalk.bold.blue('~')}]`)} ${chalk.bold.gray(`[${chalk.whiteBright(author)}]`)} ${chalk.white(msg)} ${argsString}`)
  }

  static warn(author, msg, ...args) {
    const argsString = args ? args.map(arg => `${chalk.gray(`(${chalk.bold.yellow(arg)})`)}`).join(' ') : '';

    console.log(`${chalk.bold.bold.gray(`[${chalk.bold.yellow('!')}]`)} ${chalk.bold.gray(`[${chalk.whiteBright(author)}]`)} ${chalk.white(msg)} ${argsString}`)
  }

  static error(author, msg, ...args) {
    const argsString = args ? args.map(arg => `${chalk.gray(`(${chalk.bold.red(arg)})`)}`).join(' ') : '';

    console.log(`${chalk.bold.gray(`[${chalk.bold.red('-')}]`)} ${chalk.bold.gray(`[${chalk.whiteBright(author)}]`)} ${chalk.white(msg)} ${argsString}`)
  }

  static success(author, msg, ...args) {
    const argsString = args ? args.map(arg => `${chalk.gray(`(${chalk.bold.greenBright(arg)})`)}`).join(' ') : '';

    console.log(`${chalk.bold.gray(`[${chalk.bold.greenBright('+')}]`)} ${chalk.bold.gray(`[${chalk.whiteBright(author)}]`)} ${chalk.white(msg)} ${argsString}`)
  }
}

module.exports = output
