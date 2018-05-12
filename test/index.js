const FtpClient = require('../')

const client = new FtpClient()
client.config = {
  host: 'ftp.byethost22.com',
  port: 21,
  user: 'b22_21288105',
  password: '979899Ap..',
  localRoot: 'test/Changed',
  remoteRoot: '/htdocs'
}
client.verbose = true

client.run()