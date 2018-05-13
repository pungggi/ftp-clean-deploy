# ftp-clean-deploy
Ftp Client. Uploads only changed files. Optionally deletes all remote files first or files not present from the local directory.


Usage
----
### Default Configuration

By default remote files, where the modification date and size differs from the local one, are replaced. It does not matter if the remote file is newer. 
If a file does not exits locally it will be also deleted remotely.
The same principle applies to whole directories.
All other files are not changed or removed. 

```js
const client = new FtpClient({
  host: 'ftp.host.com',
  port: 21,
  user: 'uploader',
  password: '1234',
  localRoot: './public',
  remoteRoot: '/htdocs',
})
```
The result will be like described:

**Initial Situation**

*Local Files* 

- 1.txt 2017-01-01 11:00
- ~~2.txt 2017-01-01 11:00~~
- 3.txt 2017-01-01 11:00
- 4.txt 2018-08-08 08:17
- 5.txt 2017-01-01 11:00


*Remote Files*

- 1.txt 2017-01-01 11:00
- 2.txt 2017-01-01 11:00
- 3.txt 2017-01-01 11:00
- 4.txt 2017-01-01 11:00
```js
client.run()
```
**Result in Remote**
- 1.txt 2017-01-01 11:00 *(not touched)*
- *(deleted)*
- 3.txt 2017-01-01 11:00 *(not touched)*
- 4.txt 2018-08-08 08:17 *(replaced)*
- 5.txt 2017-01-01 11:00 *(added)*

### Comparison 
By default remote files, where the modification date and size differs from the local one, are replace but you can turn this off with `compareBy` and compare just the filename.
```js
const client = new FtpClient({
  ...
  compareBy: 'name' // default is 'name,date,size'
})
```

### Delete all remote files

By setting `deleteRemoteAll` to true, all remote files present in the `remoteRoot` are deleted first.
This setting can be overwritten by `deleteRemoteNever`.

```js
const client = new FtpClient({
  host: 'ftp.host.com',
  port: 21,
  user: 'uploader',
  password: '1234',
  localRoot: './public',
  remoteRoot: '/htdocs',
  deleteRemoteAll: true,
})
```
The result will be like described:

**Initial Situation**

*Local Files* 

- 1.txt 2017-01-01 11:00
- ~~2.txt 2017-01-01 11:00~~
- 3.txt 2017-01-01 11:00
- 4.txt 2018-08-08 08:17


*Remote Files*

- 1.txt 2017-01-01 11:00
- 2.txt 2017-01-01 11:00
- 3.txt 2017-01-01 11:00
- 4.txt 2017-01-01 11:00

```js
client.run()
```

**Result in Remote**
- 1.txt 2017-01-01 11:00 *(replaced)*
- *(deleted)*
- 3.txt 2017-01-01 11:00 *(replaced)* 
- 4.txt 2018-08-08 08:17 *(replaced)*

### Never delete remote files

You can choose to not delete remote files, even if locally they do not exists anymore by setting `deleteRemoteNever` to true.
This setting overwrites `deleteRemoteAll`.

```js
const client = new FtpClient({
  host: 'ftp.host.com',
  port: 21,
  user: 'uploader',
  password: '1234',
  localRoot: './public',
  remoteRoot: '/htdocs',
  deleteRemoteNever: true,
})
```
The result will be like described:

**Initial Situation**

*Local Files* 

- 1.txt 2017-01-01 11:00
- ~~2.txt 2017-01-01 11:00~~
- 3.txt 2017-01-01 11:00
- 4.txt 2018-08-08 08:17


*Remote Files*

- 1.txt 2017-01-01 11:00
- 2.txt 2017-01-01 11:00
- 3.txt 2017-01-01 11:00
- 4.txt 2017-01-01 11:00

```js
client.run()
```

**Result in Remote**

- 1.txt 2017-01-01 11:00 *(not touched)*
- 2.txt 2017-01-01 11:00 *(not touched)*
- 3.txt 2017-01-01 11:00 *(not touched)*
- 4.txt 2018-08-08 08:17 *(replaced)*