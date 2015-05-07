require('dot-env');
var twitter = require('twitter');
var bunyan = require('bunyan');
var mqtt = require('mqtt');
var officer = require('./officer');

/*
    Global Variables
*/
var name = "twitter_messaging_pub";
var base_topic = '/available/subjects/tweets/';
var twitter_client;
var log;  //log mechanism
var mqtt_client;

//====================================================

/*
    Functions
*/

//initialize all the components
var initialization = function(){
    //initializing log mechanism 
    log = bunyan.createLogger({
        name : name,
        streams: [
            {
                level : 'info',
                stream : process.stdout
            },{
                level : 'error',
                path : './log/clients_error.log'
            }
        ]
    });
    
    //initializing the twitter client
    twitter_client = new twitter({
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
        access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    });
    
    //initializing the mqtt connection
    mqtt_client  = mqtt.connect('mqtt://localhost', {clientId : name, retain : false});
    mqtt_client.on("error", function(error){
        log.error(error);
    }); 
    mqtt_client.on("connect", function(){
        mqtt_client.subscribe(base_topic);
    }); 
    
}


//extract usefull information from the initial tweet object
var wrap_tweet = function(tweet){
    return {
        id : tweet.id_str,
        text : tweet.text,
        sender:{
            id : tweet.user.id_str,
            name : tweet.user.name,
            screen_name : tweet.user.screen_name,
            image_url : tweet.user.profile_image_url,
            profile_background_color : tweet.user.profile_background_color,
            profile_link_color : tweet.user.profile_link_color,
            profile_sidebar_border_color : tweet.user.profile_sidebar_border_color,
            profile_sidebar_fill_color : tweet.user.profile_sidebar_fill_color
        },
        geo : tweet.geo,
        date : tweet.created_at
    }
}


//publishing the tweet to mqtt broker
//bind a callback to callback_after_publish when calling this function to execute a callback after publishing to mqtt
var publish_tweet_mqtt = function(tweet, callback){
    return mqtt_client.publish(base_topic+tweet.sender.screen_name,
                        JSON.stringify(tweet), 
                        {qos:1}, 
                        callback);
}


//get the latest tweets since the last search
var get_tweets = function(){
    var last_tweet = officer.read_last_tweet();//get the last treated tweets
    if(last_tweet){
        twitter_client.get('statuses/mentions_timeline', {since_id : last_tweet.id}, function(error, tweets, response){
            if(error) {
                if(error.code == 88)
                    log.info(error.message); // Rate limit exceeded
                else{
                    log.error(error);
                }
            }else{
                for (var i in tweets){
                    //saving the latest tweet id
                    if(i == 0){
                        officer.write_last_tweet({id : tweets[i].id_str});
                    }
                    //wrapping the tweet
                    var packet = wrap_tweet(tweets[i]);
                    log.info({from:packet.sender.screen_name, text:packet.text});
                    publish_tweet_mqtt(packet);
                }
            }
        });
    }else{
        twitter_client.get('statuses/mentions_timeline', {count:5}, function(error, tweets, response){
            if(error){
                if(error.code == 88)
                    log.info(error.message); // Rate limit exceeded
                else{
                    log.error(error);
                }
            }else{
                for(var i in tweets){
                    //saving the latest tweet id
                    if(i == 0){
                        officer.write_last_tweet({id : tweets[i].id_str});
                    }
                    var packet = wrap_tweet(tweets[i]);
                    log.info({from:packet.sender.screen_name, text:packet.text});
                    publish_tweet_mqtt(packet);
                    
                }
            }
        });
    }
}

//check for tweets each 40s
var start = function(){
    setInterval(get_tweets, 40000);
}

//=====================================================================================================

/*
    Main Execution
*/

initialization();
start();

