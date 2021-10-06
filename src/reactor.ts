import 'source-map-support/register'

import capitalize from 'capitalize'
import chalk from 'chalk'
import { Command } from 'commander'
import fs from 'fs'
import Mustache from 'mustache'
import npm from 'npm'
import path from 'path'
import { isPresent } from 'ts-is-present'
import util from 'util'
import webpack from 'webpack'
import pkg from '../package.json'
import configFcn from './webpack.config.renderer'

const packageName = pkg.name as 'packageName'

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
const reactor_tpl = path.join(path.dirname(reactor_dist), 'templates')

const program = new Command()

program.version(pkg.version)

const debug = program
  .command('debug')
  .allowUnknownOption()
  .description('start development mode- runs electron with embedded webpack server')
  .action(async () => {
    await npm.load()
    validateLocation()

    const script = path.join(reactor_dist, 'main.dev.js')
    await printAndExec('electron', script, ...debug.args)
  })

program
  .command('state <add|remove> <name>')
  .description('add a slice to the state')
  .action((verb: string, name: string) => {
    validateLocation()
    const capName = capitalize(name, true)
    const slicePath = path.join('src', 'state', `${name}Slice.ts`)
    switch (verb) {
      case 'add': {
        ensureFolderExists(path.join('src', 'state'))
        const sliceTemplate = fs.readFileSync(path.join(reactor_tpl, 'stateSlice.ts.mustache'), { encoding: 'utf-8' })
        const code = Mustache.render(sliceTemplate, { name, capName })
        fs.writeFileSync(slicePath, code, { encoding: 'utf-8' })
        pass(`wrote ${slicePath}`)
        break
      }

      case 'remove':
      case 'rmv':
      case 'del':
      case 'delete': {
        if (!fs.existsSync(slicePath)) {
          fail(`${slicePath} not found`)
        }
        fs.unlinkSync(slicePath)
        pass(`${slicePath} removed`)
        break
      }

      case 'update':
        break

      default:
        fail(`unknown state verb '${verb}'`)
    }

    const slices = fs
      .readdirSync(path.join('src', 'state'))
      .map((name) => /(.*)Slice.ts/.exec(name)?.at(1))
      .filter(isPresent)

    const indexTemplate = fs.readFileSync(path.join(reactor_tpl, 'state.ts.mustache'), { encoding: 'utf-8' })
    const code = Mustache.render(indexTemplate, { slices })
    const outputPath = path.join('src', 'state', `index.ts`)
    fs.writeFileSync(outputPath, code, { encoding: 'utf-8' })
    pass(`wrote ${outputPath}`)
  })

program
  .command('component <add|remove> <name>')
  .description('add a component')
  .action((verb: string, name: string) => {
    validateLocation()
    const componentPath = path.join('src', 'components', `${name}.tsx`)
    switch (verb) {
      case 'add': {
        ensureFolderExists(path.join('src', 'components'))
        const componentTemplate = fs.readFileSync(path.join(reactor_tpl, 'component.tsx.mustache'), {
          encoding: 'utf-8',
        })
        const code = Mustache.render(componentTemplate, { name })
        fs.writeFileSync(componentPath, code, { encoding: 'utf-8' })
        pass(`wrote ${componentPath}`)
        break
      }

      case 'remove':
      case 'rmv':
      case 'del':
      case 'delete': {
        if (!fs.existsSync(componentPath)) {
          fail(`${componentPath} not found`)
        }
        fs.unlinkSync(componentPath)
        pass(`${componentPath} removed`)
        break
      }

      case 'update':
        break

      default:
        fail(`unknown state verb '${verb}'`)
    }
  })

const build = program
  .command('build')
  .allowUnknownOption()
  .description('builds package for distribution')
  .action(async () => {
    await npm.load()
    validateLocation()

    const buildFolder = path.join('build', 'prod')
    ensureFolderExists(buildFolder)
    updateFile(reactor_dist, buildFolder, 'main.js')

    // get config
    const config = configFcn(null, { mode: 'production' })
    const electronPackageJson = path.join(path.dirname(__non_webpack_require__.resolve('electron')), 'package.json')
    const ev = fs.readFileSync(electronPackageJson, { encoding: 'utf-8' })
    const electronVersion = JSON.parse(ev).version

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
          for (const error of info!.errors || []) {
            console.error(error.stack)
          }
          reject('compilation errors')
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
    await printAndExec(
      'electron-packager',
      buildFolder,
      `--electronVersion=${electronVersion}`,
      '--out=dist',
      '--overwrite',
      ...build.args,
    )
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

  if (fs.existsSync(dst)) {
    fs.unlinkSync(dst)
  }

  fs.linkSync(src, dst)

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
