
var unicumConfig = require("/unicum_config/config.js");
var rc = require('redis').createClient(6379, process.env.UNICUM_REDIS_PORT_6379_TCP_ADDR);
if (process.env.REDIS_PASSWORD)
    rc.auth(process.env.REDIS_PASSWORD, function() {
    });
rc.on('error', function(err) {
    console.log('Error connecting to Redis: ' + err);
});
unicumConfig.rc = rc;

var Unicum = require("./unicum").init(unicumConfig);

var express = require('express');
var app = express();

app.get('/generate/:key_type', function(req, res){
    Unicum.generate(Unicum.keyTypes[req.params.key_type], function (key) {
        res.json({
            success: key ? true : false,
            code: key ? 200 : 404,
            key: key,
            type: req.params.key_type
        })
    });
});

app.get('/generate/:key_type/:quantity', function(req, res){
    Unicum.generate(Unicum.keyTypes[req.params.key_type], req.params.quantity, function (keys) {
        var good = Array.isArray(keys) && keys.length > 0;
        res.json({
            success: good ? true : false,
            code: good ? 200 : 404,
            keys: keys,
            type: req.params.key_type
        })
    });
});

app.get('/type/:key', function(req, res){
    var type = Unicum.getType(req.params.key);
    res.json({
        success: type ? true : false,
        code: type ? 200 : 403,
        key: req.params.key,
        type: type
    });
});

app.get('/timestamp/:key', function(req, res){
    var time = Unicum.getTime(req.params.key);
    res.json({
        success: time ? true : false,
        code: time ? 200 : 403,
        key: req.params.key,
        timestamp: time
    });
});

app.get('/date/:key', function(req, res){
    var time = Unicum.getTime(req.params.key, true);
    res.json({
        success: time ? true : false,
        code: time ? 200 : 403,
        key: req.params.key,
        date: time
    });
});

app.get('/info/:key', function(req, res){
    var info = Unicum.getInfo(req.params.key);
    res.json({
        success: info ? true : false,
        code: info ? 200 : 403,
        key: info.key,
        type: info.type,
        date: info.date
    });
});

app.get('/epoch', function(req, res){
    res.json({
        success: true,
        code: 200,
        epoch: Unicum.getEpoch()
    });
});

app.get('/change/:key/:key_type', function(req, res){
    var key = Unicum.changeKeyType(req.params.key, req.params.key_type);
    res.json({
        success: key ? true : false,
        code: key ? 200 : 404,
        key: key,
        type: req.params.key_type
    });
});


app.get('/', function(req, res){
    res.json({success:true, code: 200});
});

app.get('*', function(req, res){
    res.json({success:false, code: 404, message: 'Wrong api call.'});
});


app.listen(6961);