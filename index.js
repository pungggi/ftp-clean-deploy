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
      compareBy: 'name,date,size',
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

      this.verbose && console.log('Ready..'+this.config.remoteRoot)
    })

    // region helper functions
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
    const comparisonDelimiter = ';'
    const formatForComparison = (name, date, size) => {
      let comparisonString = `${name}${comparisonDelimiter}`
      if (typeof this.config.compareBy === 'undefined') {
        return comparisonString += ' c'
      } 
      if ( this.config.compareBy.includes('date') ) {
        comparisonString += date
      }
      if ( this.config.compareBy.includes('size') ) {
        comparisonString += size
      }
    }
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
    // endregion
    
    this.Ftp.list( (error, listRemote) => {
      if(error){
        this._error(error)
      }
      
      let dirRemote = this.config.remoteRoot
      let dirLocale = this.config.localRoot

      const allLocalDirectories = getLocalDirectories(dirLocale) 
      const allRemoteDirectories = getRemoteDirectories(listRemote) 

      console.log(allLocalDirectories)
      console.log(allRemoteDirectories)

      //this.Ftp.end() // for testing directories walking logic only stop here
      //return
      const filesLocal = getLocalFiles(dirLocale)
      if(!this.config.deleteRemoteNever){
        getRemoteFiles(listRemote).map(item => {
          const filenameRemote = item.split(comparisonDelimiter)[0]    
          console.log(deleteRemoteAll)
          (!filesLocal.includes(item) || this.config.deleteRemoteAll) && this.Ftp.delete(dirRemote+'/'+filenameRemote, (error) => {
            if(error){
              this._error(error)
            }
            this.verbose && console.log('Deleted : '+filenameRemote)
          }) 
        })
      }

      filesLocal.map(item => {
        const filenameLocale = item.split(comparisonDelimiter)[0]
        !filesRemote.includes(item) && this.Ftp.put(path.join(dirLocale, filenameLocal),dirRemote+'/'+filenameLocale, (error) => {
          if(error){
            this._error(error)
          }
          this.verbose && console.log('Uploaded : '+filenameLocale)
        })
      })

      this.Ftp.end()     
    })
  }

  _error(message) {
    console.error(message)
  }
}

module.exports = FtpClient