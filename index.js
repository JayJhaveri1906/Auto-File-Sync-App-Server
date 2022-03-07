var express = require('express');
var spread_sheet = require('spread_sheet');
var multer = require('multer');
const reader = require('xlsx')
var fs = require('fs');
var path = require('path');
var os = require('os');
var passport = require('passport');
var HttpBasicAuth = require('passport-http').BasicStrategy;
const readline = require('readline');
const {google} = require('googleapis');
let nodeGeocoder = require('node-geocoder');

let optionss = {
  provider: 'openstreetmap'
};


// LOCATION APP

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';


function authorize(credentials, lati, longi, datee, timee, fname, addd, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, lati, longi, date, time, fname, addd, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, lati, longi, datee, timee, fname, addd);
  });
}

function getNewToken(oAuth2Client, lati, longi, datee, timee, fname, addd, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client, lati, longi, datee, timee, fname, addd);
    });
  });
}

function listMajors(auth, lati, longi, datee, timee, fname, addd) {
  const sheets = google.sheets({version: 'v4', auth});
  const request = {
    // The ID of the spreadsheet to update.
    spreadsheetId: '1iwElhVJVB7coTzqPIeSagLNvldS5tTm61_w9b6iOycw',
    range: 'Sheet1!A2:F',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      // TODO: Add desired properties to the request body.
  "values": [
    
	 [
      lati,
      longi,
      datee,
      timee,
      fname,
	  addd
    ]
	  
  ]
}
};
  try {
    const response = (sheets.spreadsheets.values.append(request)).data;
    // TODO: Change code below to process the `response` object:
    console.log(JSON.stringify(response, null, 2));
  } catch (err) {
    console.error(err);
  }
}



// LOCATION
function getAddress(lati, longi)
{
	
}




// MAIN APP
var app = express();

var UPLOAD_PATH = "./uploads/";
var SERVER_PORT = 3478;

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        fs.mkdirSync(UPLOAD_PATH, {
            recursive: true
        })
        cb(null, UPLOAD_PATH)
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random())
        console.log("RANDI file ke contents"+JSON.stringify(file, null, 4))
        console.log(file.originalname)
        cb(null, path.basename(uniqueSuffix + '-' + file.originalname))
    }
})

var upload = multer({
    storage: storage
})

var basicAuthUser = {
    username: "test",
    password: "pass"
};

function printRequestHeaders(req) {
    console.log("\nReceived headers");
    console.log("----------------");

    for (var key in req.headers) {
        console.log(key + ": " + req.headers[key]);
    }

    console.log("");
}

function printRequestParameters(req) {
    console.log("\nReceived Parameters");
    console.log("-------------------");

    for (var key in req.body) {
        console.log(key + ": " + req.body[key]);
    }

    if (Object.keys(req.body).length === 0)
        console.log("no text parameters\n");
    else
        console.log("");
}

function getEndpoints(ipAddress) {
    return "HTTP/Multipart:              http://" + ipAddress + ":" + SERVER_PORT + "/upload/multipart\n" +
        "HTTP/Multipart (Basic Auth): http://" + ipAddress + ":" + SERVER_PORT + "/upload/multipart-ba\n" +
        "Binary:                      http://" + ipAddress + ":" + SERVER_PORT + "/upload/binary\n" +
        "Binary (Basic Auth):         http://" + ipAddress + ":" + SERVER_PORT + "/upload/binary-ba\n" +
        "401 Forbidden:               http://" + ipAddress + ":" + SERVER_PORT + "/upload/forbidden\n" +
        "Validate Content Length:     http://" + ipAddress + ":" + SERVER_PORT + "/upload/validate-content-length\n"
}

function printAvailableEndpoints() {
    var ifaces = os.networkInterfaces();

    Object.keys(ifaces).forEach(function(ifname) {
        ifaces[ifname].forEach(function(iface) {
            // skip internal (i.e. 127.0.0.1) and non-ipv4 addresses
            if ('IPv4' !== iface.family || iface.internal !== false) {
                return;
            }

            console.log(getEndpoints(iface.address));
        });
    });
}

var multipartReqInterceptor = function(req, res, next) {
    console.log("\n\nHTTP/Multipart Upload Request from: " + req.ip);
    printRequestHeaders(req);

    next();
};

// configure passport for Basic Auth strategy
passport.use('basic-admin', new HttpBasicAuth({
        realm: 'Upload Service'
    },
    function(username, password, done) {
        if (username === basicAuthUser.username &&
            password === basicAuthUser.password) {
            return done(null, basicAuthUser);
        }
        return done(null, false);
    }
));

app.use(passport.initialize());
var useBasicAuth = passport.authenticate('basic-admin', {
    session: false
});

app.get('/', function(req, res) {
    res.end("Android Upload Service Demo node.js server running!");
});




var multipartUploadHandler = function(req, res) {
    console.log("\nReceived files");
    console.log("--------------");
    console.log(req.files);
    //console.log(typeof req.files);
    //console.log(req.files[0]);

var matches=req.files[0]['fieldname'].match(/([0-9.-]+).+?([0-9.-]+)/);
var lati=parseFloat(matches[1]);
var longi=parseFloat(matches[2]);
console.log(matches,lati,longi);

// date
var today = new Date();
var tmpTime = today.toLocaleTimeString();
var dd = String(today.getDate()).padStart(2, '0');
var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
var yyyy = today.getFullYear();
today = dd + '/' + mm + '/' + yyyy;

// time


// final update in db
var datee = today;
var timee = tmpTime;
var fname = req.files[0]['filename'];
//console.log(req.files[0]['fieldname']);
// lat long time date filename

var addd = "temp addd"
let geoCoder = nodeGeocoder(optionss);
// Reverse Geocode
geoCoder.reverse({lat:lati, lon:longi}) 	
  .then((resss)=> {
    console.log(resss);
	console.log(resss[0]['formattedAddress'])
	addd = resss[0]['formattedAddress']
  



// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), lati, longi, datee, timee, fname, addd, listMajors);
});



    
    //console.log(extract(req.files[0], 'fieldname'));
    //console.log(obj);

    console.log(req.files.fieldname);
    console.log("\nReceived params");
    console.log("---------------");
    var params = JSON.stringify(req.body, null, 2);
    console.log("paramRandi" + params);
    //res.header('transfer-encoding', ''); // disable chunked transfer encoding
    res.json({
        success: true,
        message: "upload completed successfully",
        data: {
            files: req.files,
            params: JSON.parse(params)
        }
    });
    console.log("Upload completed\n\n");
	})
  .catch((err)=> {
    console.log(err);
  });
};

var binaryUploadHandler = function(req, res) {
    console.log("\n\nBinary Upload Request from: " + req.ip);
    printRequestHeaders(req);

    var filename = req.headers["file-name"];
    console.log("Started binary upload of: " + filename);
    var filepath = path.resolve(UPLOAD_PATH, filename);
    var out = fs.createWriteStream(filepath, {
        flags: 'w',
        encoding: 'binary',
        fd: null,
        mode: '644'
    });
    req.pipe(out);
    req.on('end', function() {
        console.log("Finished binary upload of: " + filename + "\n  in: " + filepath);
        res.json({
            success: true,
            data: {
                filename: filename,
                uploadFilePath: filepath
            }
        });
    });
};

// handle multipart uploads
app.post('/upload/multipart', multipartReqInterceptor, upload.any(), multipartUploadHandler);
app.post('/upload/multipart-ba', useBasicAuth, multipartReqInterceptor, upload.any(), multipartUploadHandler);

// handle binary uploads
app.post('/upload/binary', binaryUploadHandler);
app.post('/upload/binary-ba', useBasicAuth, binaryUploadHandler);

// endpoint which returns always 401 and a JSON response in the body
app.post('/upload/forbidden', function(req, res) {
    res.status(401);
    res.json({
        success: false,
        message: "this endpoint always returns 401! It's for testing only"
    });
});

app.post('/upload/validate-content-length', function(req, res) {
    var expected_length = parseInt(req.headers['content-length'], 10);
    var actual_length = 0;

    req.on('data', function(chunk) {
        actual_length += chunk.length;
    });

    req.on('end', function() {
        var success = expected_length == actual_length;
        console.log('/upload/validate-content-length -> ' + (success ? 'OK!' : 'KO') + ', expected: ' + expected_length + ', actual: ' + actual_length);
        res.status(success ? 200 : 400);
        res.json({
            success: success,
            data: {
                expected: expected_length,
                actual: actual_length
            }
        })
    });
});

var server = app.listen(SERVER_PORT, function() {
    console.log("Upload server started. Listening on all interfaces on port " +
        server.address().port);

    console.log("\nThe following endpoints are available for upload testing:\n");
    printAvailableEndpoints();

    console.log("Basic auth credentials are: " + JSON.stringify(basicAuthUser));
});
