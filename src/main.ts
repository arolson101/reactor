import { app, BrowserWindow, shell } from 'electron'
import electronServe from 'electron-serve'

const loadURL = electronServe({ directory: '.' })

async function createWindow() {
  if (process.env.NODE_ENV === 'development') {
    const {
      default: installExtension,
      REDUX_DEVTOOLS,
      REACT_DEVELOPER_TOOLS,
    } = await import('electron-devtools-installer')

    await installExtension([REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS])
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 1200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open urls in the user's browser
  // mainWindow.webContents.setWindowOpenHandler(({url}) => {
  //   shell.openExternal(url)
  //   return { action: 'deny' }
  // })
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault()
    shell.openExternal(url)
  })

  if (process.env.NODE_ENV === 'development') {
    const { default: express } = await import('express')
    const { default: webpack } = await import('webpack')
    const { default: middleware } = await import('webpack-dev-middleware')
    const { default: configFcn } = await import('./webpack.config.renderer')

    const config = configFcn(null, { mode: 'development' })
    const compiler = webpack(config)

    const app = express()
    const port = 3000

    app.use(
      middleware(compiler, {
        writeToDisk: true,
      }),
    )

    app.listen(port, () => {
      const url = `http://localhost:${port}`
      console.log(`Example app listening at ${url}`)
      mainWindow.loadURL(url)
    })
  } else {
    await loadURL(mainWindow)
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow).catch(console.log)

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
