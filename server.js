var mosca = require('mosca');
var officer = require('./officer');
var bunyan = require("bunyan");

//log mechanism 
var log = bunyan.createLogger({
    name : "mosca_server",
    streams: [
        {
            level : 'info',
            stream : process.stdout
        },{
            level : 'error',
            path : './log/server_error.log'
        }
    ]
});


//publish subscribe settings
var pubsubsettings = {
  //using ascoltatore
  type: 'mongo',        
  url: 'mongodb://localhost:27017/mqtt',
  pubsubCollection: 'ascoltatori',
  mongo: require('mongodb')
};

//here we start mosca
var server = new mosca.Server({
    port: 1883,           //mosca (mqtt) port
    backend: pubsubsettings,   //pubsubsettings is the object we created above 
    persistence: {
        factory: mosca.persistence.Mongo,
        url: 'mongodb://localhost:27017/mqtt'
    }
});   

server.on('ready', function(){
    log.info('Mosca server is up and running')
}); 

server.on('clientConnected', function(client) {
    log.info('client connected ', client.id);
});

/*
server.published = function(packet, client, cb) {
    if(client !== undefined){
        if(officer(packet.topic)){
            console.log(packet.topic);
            var newPacket = {
                topic: packet.topic,
                payload: packet.payload,
                retain: false,
                qos: 1
            };

            server.publish(newPacket, cb);
            log.info('new message on ',packet.topic,' topic.');
        }
    }
    
    return cb();
}*/

server.on("published", function(packet, client){
    if(client !== undefined){
        if(officer(packet.topic)){
            log.info(packet.topic);
            var newPacket = {
                topic: packet.topic,
                payload: packet.payload,
                retain: false,
                qos: 1
            };

            server.publish(newPacket, cb);
            log.info('new message on ',packet.topic,' topic.');
        }
    }
    return;
});

