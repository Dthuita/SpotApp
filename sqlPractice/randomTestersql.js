
var mysql = require('mysql2');

var con = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "password",
  database: 'test2'
});

// con.execute(
//   'DROP TABLE spotifyData;',
//   (err, results) => {if(err) throw err; console.log('results', results)}
// )

// con.execute(
//   `CREATE TABLE spotifyData(
//      id INT PRIMARY KEY AUTO_INCREMENT,
//      img_url VARCHAR(255) UNIQUE,
//      artist TEXT,
//      country VARCHAR(2)
//   );`,
//   (err, results) => {if(err) throw err; console.log('Created table results', results)}
// )

con.execute(
  `INSERT IGNORE INTO spotifyData(img_url, artist, country) 
  VALUES 
    ('https://i.scdn.co/image/ab67616d00001e02ff9ca10b55ce82ae553c8228', 'JCOLE','US'),
    ('https://i.scdn.co/image/ab67616d00001e02ff9ca10b55ce82ae553c8289', 'LOGIC','US'),
    ('https://i.scdn.co/image/ab67616d00001e02ff9ca10b55ce82ae553c8165', 'EMINEM','EU'),
    ('https://i.scdn.co/image/ab67616d00001e02ff9ca10b55ce82ae553c8087', 'PEEPEE','PA');
  `,
  (err) => {if(err) throw err;}
)

con.execute( //DISTINCT
  `SELECT  * FROM spotifyData`,
  (err, results) => {if(err) throw err; 
    console.log('all results', results)
  }
)