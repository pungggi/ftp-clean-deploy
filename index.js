const fs = require('fs')
const ftp = require('ftp')
const path = require('path')
const klaw = require('klaw')
const through2 = require('through2')

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
    if (typeof this.config.compareBy === 'undefined') {
      this.config.compareBy = 'name'
    } 
    if (typeof this.config.deleteRemoteAll === 'undefined') {
      this.config.deleteRemoteAll = false
    } 
    if (typeof this.config.deleteRemoteNever === 'undefined') {
      this.config.deleteRemoteNever = false
    } 
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
    
    // region helper functions
    const excludeDirectories = through2.obj(function (item, enc, next) {
      if (!item.stats.isDirectory()) this.push(item)
      next()
    })
    const excludeFiles = through2.obj(function (item, enc, next) {
      if (!item.stats.isFile()) this.push(item)
      next()
    })
    const isLocalDirectory = source => fs.lstatSync(source).isDirectory()
    const isLocalFile = source => fs.lstatSync(source).isFile()
    const getLocalDirectories = source => fs.readdirSync(source).map(name => path.join(source, name)).filter(isLocalDirectory).map(source => source.split(path.sep).pop())
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
      let comparisonString = name + comparisonDelimiter
      
      if ( this.config.compareBy.includes('date') ) {
        comparisonString += date
      }
      if ( this.config.compareBy.includes('size') ) {
        comparisonString += size
      }
      return comparisonString
    }
 
    const isRemoteDirectory = source => source.type === 'd' && source.name != '.' && source.name != '..'
    const isRemoteFile = source => source.type === '-'
    const getRemoteDirectories = source => source.filter(isRemoteDirectory).map(file => file.name)
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

    const compareFiles = (dirLocale, listRemote, dirRemote) => {
      const filesLocal = getLocalFiles(dirLocale)
      const filesRemote = getRemoteFiles(listRemote)

      console.log(filesLocal)
      console.log(filesRemote)
      if(!this.config.deleteRemoteNever){
        filesRemote.map(item => {
          
          if (!this.config.deleteRemoteAll && filesLocal.includes(item))
            return
          
          const filenameRemote = item.split(comparisonDelimiter)[0]  
          
          this.Ftp.delete(dirRemote+'/'+filenameRemote, (error) => {
            if(error){
              this._error(error)
            }
            this.verbose && console.log('Deleted : '+filenameRemote)
          }) 
        })
      }

      filesLocal.map(item => {
        const filenameLocale = item.split(comparisonDelimiter)[0]
        !filesRemote.includes(item) && this._upload(dirLocale, filenameLocale, dirRemote)
      })
    }
    
    const compareDirectories = (dirLocale, listRemote, dirRemote) => {
      const directoriesLocal = getLocalDirectories(dirLocale) 
      const directoriesRemote = getRemoteDirectories(listRemote) 

      if(!this.config.deleteRemoteNever){
        directoriesRemote.map(item => {
          const dirsubRemote = item
          if (!this.config.deleteRemoteAll && directoriesLocal.includes(dirsubRemote))
            return

          this.Ftp.rmdir(dirRemote +'/'+dirsubRemote, true, (error) => {
            if(error){
              this._error(error)
            }
            this.verbose && console.log('Deleted directory and content: '+dirRemote +'/'+dirsubRemote)
          })
        })
      }

      directoriesLocal.map(item => {
        const dirnameLocal = item.split(comparisonDelimiter)[0]
        const dirRemoteNew = dirRemote+'/'+dirnameLocal
        !directoriesRemote.includes(item) && this.Ftp.mkdir(dirRemoteNew, (error) => {
          if(error){
            this._error(error)
          }
          this.verbose && console.log('Uploaded : '+ dirRemoteNew)

          getLocalFiles(path.join(dirLocale, dirnameLocal)).map(item => this._upload(dirLocale, item.split(comparisonDelimiter)[0], dirRemoteNew))
        })
      })

      console.log(directoriesLocal)
      console.log(directoriesRemote)
    }


      this.verbose && console.log('Ready..'+ this.config.remoteRoot)

      let dirRemote = this.config.remoteRoot
      
      klaw(this.config.localRoot)
        .pipe(excludeFiles)
        .on('data', item => {
          const dirLocaleActual = item.path.replace(__dirname+path.sep, '')
          const dir = dirLocaleActual.replace(this.config.localRoot.replace('/', '\\'),'')
          const dirRemoteActual = dirRemoteActual.replace(/\\/g, '/')

          this.Ftp.cwd(dirRemoteActual, (error) => {
            if(error){
              this._error(error)
            }
      
            this.Ftp.list( (error, listRemote) => {
              if(error){
                this._error(error)
              }
              compareDirectories(dirLocaleActual, listRemote, dirRemoteActual)
              compareFiles(dirLocaleActual, listRemote, dirRemoteActual)
            })            
          })      
        })  
  }

  _upload(dirLocale, filenameLocale, dirRemote){
    this.Ftp.put(path.join(dirLocale, filenameLocale), dirRemote+'/'+filenameLocale, (error) => {
      if(error){
        this._error(error)
      }
      this.verbose && console.log('Uploaded : '+ dirRemote+'/'+filenameLocale)
    })
  }
  _error(message) {
    console.error(message)
  }
}

module.exports = FtpClient