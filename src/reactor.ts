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

program
  .command('init')
  .description(`initialize folder to use ${packageName}`)
  .action(async () => {
    await npm.load()

    await printAndExec('npm', 'install', '--save-dev', packageName)

    const targetPackage = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf-8' })).name

    const installTemplateIfNotExists = (templateName: string, dest: string) => {
      const contents = renderTemplate(templateName, { targetPackage, packageName })
      if (!fs.existsSync(dest)) {
        fs.writeFileSync(dest, contents, { encoding: 'utf-8' })
        pass(`wrote ${dest}`)
      }
    }

    installTemplateIfNotExists('gitignore.mustache', '.gitignore')
    installTemplateIfNotExists('prettierrc.mustache', '.prettierrc')
    installTemplateIfNotExists('editorconfig.mustache', '.editorconfig')
    installTemplateIfNotExists('tsconfig.json.mustache', 'tsconfig.json')
    ensureFolderExists('src')
    installTemplateIfNotExists('index.simple.ts.mustache', path.join('src', 'index.ts'))
    installTemplateIfNotExists('App.tsx.mustache', path.join('src', 'App.tsx'))
  })

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
        const stateSlice = renderTemplate('stateSlice.ts.mustache', { name, capName })
        fs.writeFileSync(slicePath, stateSlice, { encoding: 'utf-8' })
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

    const index = renderTemplate('state.ts.mustache', { slices })
    const indexPath = path.join('src', 'state', `index.ts`)
    fs.writeFileSync(indexPath, index, { encoding: 'utf-8' })
    pass(`wrote ${indexPath}`)

    const appIndex = renderTemplate('index.ts.mustache', { slices })
    const appIndexPath = path.join('src', `index.ts`)
    fs.writeFileSync(appIndexPath, appIndex, { encoding: 'utf-8' })
    pass(`wrote ${appIndexPath}`)
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
        const component = renderTemplate('component.tsx.mustache', { name })
        fs.writeFileSync(componentPath, component, { encoding: 'utf-8' })
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
      dependencies: pkg.dependencies || {},
    }
    fs.writeFileSync(path.join(buildFolder, 'package.json'), JSON.stringify(newpkg, null, '  '))

    const cwd = process.cwd()
    process.chdir(buildFolder)
    await printAndExec('npm', 'install')
    process.chdir(cwd)

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

const renderTemplate = (templateName: string, partials?: Record<string, string | string[]>) => {
  const templatePath = fs.readFileSync(path.join(reactor_tpl, templateName), { encoding: 'utf-8' })
  return Mustache.render(templatePath, partials)
}

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
