import { Command } from 'commander'
import fs from 'fs'
import chalk from 'chalk'
import path from 'path'
import npm from 'npm'
import util from 'util'
import webpack from 'webpack'
import configFcn from './webpack.config.renderer'

const packageName = '@ar0/reactor'

interface PackageJson {
  devDependencies?: {
    [packageName]?: string
  }
}

const log = console.log
const err = console.error

const pass = (msg: string) => log(`${chalk.green('✓')} ${msg}`)
const fail = (msg: string) => {
  err(`${chalk.red('✖')} ${msg}`)
  process.exit(1)
}

const exec = util.promisify(npm.commands.exec)

const reactor_dist = path.dirname(__filename)

const program = new Command()
program
  .command('debug')
  .description('start development mode- runs electron with embedded webpack server')
  .action(async () => {
    await npm.load()
    validateLocation()

    const script = path.join(reactor_dist, 'main.dev.js')
    await printAndExec('electron', script)
  })

program
  .command('build')
  .description('builds package for distribution')
  .action(async () => {
    await npm.load()
    validateLocation()

    const buildFolder = path.join('build', 'prod')
    ensureFolderExists(buildFolder)
    updateFile(reactor_dist, buildFolder, 'main.js')

    // get config
    const config = configFcn(null, { mode: 'production' })
    config.output!.path = path.resolve(process.cwd(), buildFolder)

    // run compiler
    log(chalk.blue('compiling sources'))
    await new Promise<void>((resolve, reject) =>
      webpack(config, (err, stats) => {
        if (err) {
          reject(err)
          return
        }

        const info = stats?.toJson()

        if (stats?.hasErrors()) {
          info!.errors?.map(console.error)
          reject("compilation errors")
          return
        }

        if (stats?.hasWarnings()) {
          console.warn(info!.warnings)
        }

        resolve()
      }),
    )

    // create package.json
    log(chalk.blue('creating package.json'))
    const pkg = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf-8' }))
    const newpkg = {
      name: pkg.name,
      productName: pkg.productName || pkg.name,
      version: pkg.version,
      description: pkg.description,
      author: pkg.author,
      license: pkg.license,
      main: 'main.js',
    }
    fs.writeFileSync(path.join(buildFolder, 'package.json'), JSON.stringify(newpkg, null, '  '))

    log(chalk.blue('packaging app'))
    await printAndExec('electron-packager', buildFolder, '--out=dist', '--overwrite')
  })

const validateLocation = () => {
  if (!fs.existsSync('package.json')) {
    fail('did not find package.json')
  }

  const json = fs.readFileSync('package.json', { encoding: 'utf-8' })
  if (!json) {
    fail('error reading package.json')
  }
  pass('found package.json')

  const cfg = JSON.parse(json) as PackageJson
  if (!cfg.devDependencies || !cfg.devDependencies[packageName]) {
    fail(`${packageName} is not a dependency`)
  }
  pass(`${packageName} is a dependency`)
}

const ensureFolderExists = (dir: string) => {
  let isdir = fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()
  if (!isdir) {
    fs.mkdirSync(dir, { recursive: true })
    isdir = fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()
    if (!isdir) {
      fail(`couldn't create folder ${dir}`)
    }
  }

  pass(`directory '${dir}' exists`)
}

const updateFile = (srcdir: string, dstdir: string, file: string) => {
  const src = path.join(srcdir, file)
  const dst = path.join(dstdir, file)

  if (!fs.existsSync(src)) {
    fail(`${src} doesn't exist`)
  }

  if (!fs.existsSync(dst)) {
    fs.linkSync(src, dst)
  }

  if (!fs.existsSync(dst)) {
    fail(`${dst} doesn't exist`)
  }
  pass(`${dst} exists`)
}

const printAndExec = async (...args: string[]) => {
  log(chalk.cyanBright(args.join(' ')))
  await exec(args)
}

program.parse(process.argv)
