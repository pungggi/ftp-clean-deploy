const fs = require('fs')
const ftp = require('ftp')
const klawSync = require('klaw-sync')

class FtpClient {
  constructor(
    config = {
      host: 'ftp.host.com',
      port: 21,
      user: 'uploader',
      password: '1234',
      localRoot: './public',
      remoteRoot: '/htdocs',
      deleteRemoteAll: false,
      deleteRemoteNever: false
    }
  )
  {
    this.config = config
    this.verbose = false
  }

  run(){
    this.verbose && console.log(this.config)  
    this._connect()
  }

  stop(){
    this.Ftp.destroy()
  }
  
  _connect(){
    this.Ftp = new ftp()
    this.Ftp.on('greeting', message => { this._greeting(message) })
    this.Ftp.on('ready', () => { this._ready() })
    this.Ftp.on('error', message => { this._error(message) })
    this.Ftp.on('end', message => { console.log(`Connection closed.`) })
    this.Ftp.connect(this.config)
  }

  _greeting(message) {
    console.log(message)
  }

  _ready(){
    
    let pathsLocal
    try {
      pathsLocal = klawSync(this.config.localRoot)
    } catch (er) {
      console.error(er)
    }
    console.dir(pathsLocal)

    this.verbose && console.log('Ready..')
    this.Ftp.cwd(this.config.remoteRoot, (error) => {
      if(error){
        this._error(error)
      }
    })

    

    this.Ftp.list( (error, list) => {
      if(error){
        this._error(error)
      }
      list.forEach(element => {
        console.log(element.name)
      })
    })

    this.Ftp.end()
  }

  _error(message) {
    console.error(message)
  }
}

module.exports = FtpClient