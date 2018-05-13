const fs = require('fs')
const ftp = require('ftp')
const path = require('path')

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
    
    this.Ftp.cwd(this.config.remoteRoot, (error) => {
      if(error){
        this._error(error)
      }
    })
    
    this.verbose && console.log('Ready..')

    const isLocalDirectory = source => fs.lstatSync(source).isDirectory()
    const isLocalFile = source => fs.lstatSync(source).isFile()
    const getLocalDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isLocalDirectory)
    const getLocalFiles = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isLocalFile).map(transformForComparison)
    const transformForComparison = source => {
      const stat = fs.statSync(source)
      return formatForComparison(source.split(path.sep).pop(), new Date(
        stat.mtime.getUTCFullYear(),
        stat.mtime.getUTCMonth(),
        stat.mtime.getUTCDate(),
        stat.mtime.getUTCHours(),
        stat.mtime.getUTCMinutes(),
        stat.mtime.getUTCSeconds(), 
        stat.mtime.getUTCMilliseconds()
    ), stat.size) 
    }

    const formatForComparison = (name, date = new Date(), size) => `${name};${date+size}`

    const isRemoteDirectory = source => source.type === 'd' && source.name != '.' && source.name != '..'
    const isRemoteFile = source => source.type === '-'
    const getRemoteDirectories = source => source.filter(isRemoteDirectory)
    const getRemoteFiles = source => source.filter(isRemoteFile).map(file => formatForComparison(file.name, 
      new Date(
        file.date.getUTCFullYear(),
        file.date.getUTCMonth(),
        file.date.getUTCDate(),
        file.date.getUTCHours(),
        file.date.getUTCMinutes(),
        file.date.getUTCSeconds(), 
        file.date.getUTCMilliseconds()
    ), file.size))
    
    
    this.Ftp.list( (error, listRemote) => {
      if(error){
        this._error(error)
      }
        this.Ftp.lastMod(this.config.remoteRoot+'/'+listRemote[2].name, (error, lastMod) => {
          if(error){
            this._error(error)
          }
          let dirRemote = this.config.remoteRoot
          let dirLocale = this.config.localRoot
          // console.dir(getLocalDirectories(this.config.localRoot))
          // console.dir(getRemoteDirectories(list))
          
          const filesLocal = getLocalFiles(dirLocale)
          const filesRemote = getRemoteFiles(listRemote)

          console.log(dirRemote)
          console.log(filesLocal)
          console.log(filesRemote)
          // this.Ftp.end()
          filesRemote.map(item => {
            const filenameRemote = item.split(';')[0]
           
            !filesLocal.includes(item) && this.Ftp.delete(dirRemote+'/'+filenameRemote, (error) => {
              if(error){
                this._error(error)
              }
              this.verbose && console.log('Deleted : '+filenameRemote)
            }) 
          })

          filesLocal.map(item => {
            const filenameLocal = item.split(';')[0]
            !filesRemote.includes(item) && this.Ftp.put(path.join(dirLocale, filenameLocal),dirRemote+'/'+filenameLocal, (error) => {
              if(error){
                this._error(error)
              }
              this.verbose && console.log('Uploaded : '+filenameLocal)
            })
          })

          this.Ftp.end()
        })
      }   
    )
  }

  _error(message) {
    console.error(message)
  }
}

module.exports = FtpClient