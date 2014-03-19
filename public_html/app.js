var express = require('express');
var app = express();
var server = require('http').createServer(app);
var path = require('path');
var MongoClient = require('mongodb').MongoClient
        , format = require('util').format;

server.listen(3000);
//io.set( 'origins', '*niwsc.com*:*' );
//app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());

app.use(express.cookieParser());

//app.use(express.static(__dirname + '/public'));
app.use(express.static(path.join(__dirname + '/public')));
app.use(app.router);



app.post('/devices', function(req, res) {
    MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
        if (err)
            return res.status(500).send('Internal server error' + err.message);
        var deviceBody = req.body;


        if (deviceBody.serialNumber) {
            deviceBody._id = deviceBody.serialNumber;
            var collection = db.collection('devices');

            collection.insert(deviceBody, {safe: true}, function(err, records) {
                if (err) {
                    return res.status(400).send("Failed");
                }
                console.log("Record added as " + records[0]._id);
                return res.send("Device "+deviceBody.serialNumber+" added");
            });


        } else {
            return res.status(400).send('Incorrect paramters');
        }

    });

});

app.get('/devices', function(req, res) {
    MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
        if (err)
            return res.status(500).send('Internal server error' + err.message);
        var collection = db.collection('devices');

        collection.find().toArray(function(err, items) {
            return res.send(items);
            db.close();
        });

    });
});


app.post('/devices/:deviceId/channels', function(req, res) {
    MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
        if (err)
            return res.status(500).send('Internal server error' + err.message);

        var channelBody = req.body;
        var deviceId = req.param('deviceId');
        console.log("deviceid : "+deviceId);
        if (deviceId) {
            
            var collection = db.collection('devices');

            //check if device exists or not
            collection.findOne({"_id" : deviceId}, function(err, device) {
                if (err) {
                    return res.status(404).send("could not find the device");
                }
                console.log("device : "+device);
                if(device){
                   if(! device.channels){
                       var channels =[];
                       channelBody.id = 1;
                       channels.push(channelBody);
                       
                       collection.update({"_id" : deviceId} ,{$set : {"channels" : channels}},function(err,update){
                           if(err){
                                return res.status(400).send("Failed to add channel");
                            }
                            return res.status(200).send(channelBody);
                       });
                   }else{
                       channelBody.id = device.channels.length+1;
                       collection.update({"_id" : deviceId} ,{$push : {"channels" : channelBody}},function(err,update){
                           if(err){
                                return res.status(400).send("Failed to add channel");
                            }
                            return res.status(200).send(channelBody);
                       });
                   }
                    
                    
                }else{
                    return res.status(404).send("no device found with "+deviceId);
                }
                
            });


        } else {
            return res.status(400).send('Incorrect deviceId');
        }

    });
});

app.get('/devices/:deviceId/channels', function(req, res) {
       MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
        if (err)
            return res.status(500).send('Internal server error' + err.message);

        var channelBody = req.body;
        var deviceId = req.param('deviceId');
        
        if (deviceId) {
            
            var collection = db.collection('devices');

            //check if device exists or not
            collection.findOne({"_id" : deviceId}, function(err, device) {
                if (err) {
                    return res.status(404).send("could not find the device");
                }
               if(device){
                   if(device.channels){
                      return res.send(device.channels);
                   }else{
                       return res.status(404).send("no channels found");
                   }
                    
                    
                }else{
                    return res.status(404).send("no device found with "+deviceId);
                }
                
            });


        } else {
            return res.status(400).send('Incorrect deviceId');
        }

    });
});


app.put('/devices/:deviceId/channels/:channelId', function(req, res) {
    MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
        if (err)
            return res.status(500).send('Internal server error' + err.message);

        var dataBody = req.body;
        var deviceId = req.param('deviceId');
        var channelId = req.param('channelId');
        
        if (deviceId && channelId) {
            
            var collection = db.collection('devices');

            //check if device exists or not
            collection.findOne({"_id" : deviceId}, function(err, device) {
                if (err) {
                    return res.status(500).send("server error");
                }
                
                if(device){
                   if(device.channels){
                       for(var i ; i < device.channels.length ; i++){
                           if(device.channels[i].id === channelId){
                               break;
                           } if(i === device.channels.length)
                               return res.status(404).send("channel not found");
                       }
                       
                       collection.update({"_id" : deviceId+"-"+channelId},{$addToSet : {"values" : {$each : dataBody  } } },{upsert : true},function(err,update){
                           if(err)
                               return res.status(500).send("Server error");
                           return res.send("sucess");
                       });
                       
                       
                   }else{
                       return res.status(404).send("no channels on the device");
                   }
                    
                    
                }else{
                    return res.status(404).send("no device found with "+deviceId);
                }
                
            });


        } else {
            return res.status(400).send('Incorrect deviceId');
        }

    });
});


app.get('/devices/:deviceId/channels/:channelId', function(req, res) {
    MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err, db) {
        if (err)
            return res.status(500).send('Internal server error' + err.message);
        var limit = req.query.limit;
        if(!limit)
            limit = 100;
        var dataBody = req.body;
        var deviceId = req.param('deviceId');
        var channelId = req.param('channelId');
        
        if (deviceId && channelId) {
            
            var collection = db.collection('devices');

            //check if device exists or not
            collection.findOne({"_id" : deviceId}, function(err, device) {
                if (err) {
                    return res.status(500).send("server error");
                }
                
                if(device){
                   if(device.channels){
                       for(var i ; i < device.channels.length ; i++){
                           if(device.channels[i].id === channelId){
                               break;
                           } if(i === device.channels.length)
                               return res.status(404).send("channel not found");
                       }
                       
                       collection.findOne({"_id" : deviceId+"-"+channelId} , {"values" :{ $slice : -limit} },function(err,deviceChannelData){
                           if(err)
                               return res.status(500).send("Server error");
                           if(deviceChannelData){
                                return res.send(deviceChannelData.values);
                           }
                           else
                               return res.send("No data found");
                       });
                       
                       
                   }else{
                       return res.status(404).send("no channels on the device");
                   }
                    
                    
                }else{
                    return res.status(404).send("no device found with "+deviceId);
                }
                
            });


        } else {
            return res.status(400).send('Incorrect deviceId');
        }

    });
});

