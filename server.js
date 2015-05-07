require('dot-env')
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
  url: process.env.MONGO_URL,
  pubsubCollection: 'ascoltatori',
  mongo: {}
};

//here we start mosca
var server = new mosca.Server({
    port: 1883,           //mosca (mqtt) port
    backend: pubsubsettings,   //pubsubsettings is the object we created above 
    persistence: {
        factory: mosca.persistence.Mongo,
        url: process.env.MONGO_URL
    }
});   

server.on('ready', function(){
    log.info('Mosca server is up and running')
}); 

server.on('clientConnected', function(client) {
    log.info('client connected ', client.id);
});


server.on("published", function(packet, client){
    if(client !== undefined){
        if(officer.validate_topic(packet.topic)){
            var newPacket = {
                topic: packet.topic,
                payload: packet.payload,
                retain: false,
                qos: 2
            };

            server.publish(newPacket);
            log.info('new message on ',packet.topic,' topic.');
        }else {
            log.info("wrong topic : ",packet.topic);
        }
    }
});

