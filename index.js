const fs = require('fs')
const ftp = require('ftp')
const klaw = require('klaw')

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
    this.verbose && console.log('Ready..')
    this.Ftp.cwd(this.config.remoteRoot, (error) => {
      if(error){
        this._error(error)
      }
    })

    klaw(this.config.localRoot)
      .on('data', item => console.log(item.path))
      .on('error', (error, item) => {
        if(error){
          this._error(error)
        }
      })
      .on('end', (items) => console.dir(items))


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