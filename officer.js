var topics = require("./.topics");
var fs = require("fs");


/*
    Global variables
*/
var log_dir = "./log";
var tweet_file = "./log/tweet.log";
var soccer_file = "./log/soccer.log";


//===================================================================================

/*
---- Asynchronous -----
Test whether or not the given path exists by checking with the file system. 
return true if the file exists, false otherwise
*/
var file_exists = function(path){
    return fs.existsSync(path);
}

/*
---- Only use it for files with JSON content ---- 
Synchronously reads from file in the given path and returns an object, 
if the file encoding is different from utf8 you need to specify it
*/
var read_json = function(path, encoding){
    if(encoding){
        return JSON.parse(fs.readFileSync(path, {encoding : encoding}));
    }else{
        return JSON.parse(fs.readFileSync(path, {encoding : "utf8"}));
    }
}

/*
----- Only use it to save objects ----
Synchronously saves the given object in the given path, the default encoding used is utf8
returns undefined
*/
var write_obj = function(path, obj, encoding){
    if(encoding){
        fs.writeFileSync(path, JSON.stringify(obj), {encoding : encoding});
    }else{
        fs.writeFileSync(path, JSON.stringify(obj), {encoding : 'utf8'});
    }
}

/*
---- Synchronous-----
Creates a new directory
*/
var mkdir = function(path){
    fs.mkdirSync(path);
}

//===================================================================================

module.exports = exports = {
    /*
    verify if the topic is valid
    */
    validate_topic : function(topic) {
        var arr = topic.split("/");
        if(arr[0] == ""){arr.splice(0,1);}
        if(arr[arr.length-1] == ""){arr.splice(arr.length-1, 1);}
        var index = topics;
        for(var i in arr){
            if(index.hasOwnProperty(arr[i])){
                index = index[arr[i]];
                continue;
            }else{
                return false;
            }
        }
        return true;
    },
    /*
    read the last saved tweets and return the object
    if the file doesn't exist then returns undefined
    */
    read_last_tweet : function(){
        if(file_exists(log_dir)){
            if(file_exists(tweet_file)){
                return read_json(tweet_file);
            }else{
                return undefined;
            }
        }else{
            mkdir(log_dir);
            return undefined;
        }
    },
    /*
    saves the last treated tweet 
    */
    write_last_tweet : function(last_tweet){
        write_obj(tweet_file, last_tweet);
    },
    /*
    reads the last treated fixtures
    return the object if the file exists, undefined otherwise
    */
    read_last_soccer_teams_fixture : function(){
        if(file_exists(log_dir)){
            if(file_exists(soccer_file)){
                return read_json(soccer_file);
            }else{
                return undefined;
            }
        }else{
            mkdir(log_dir);
            return undefined;
        }
    },
    /*
    saves the last treated fixtures 
    */
    write_last_soccer_teams_fixture : function(last_fixtures){
        write_obj(soccer_file, last_fixtures);
    }
    
};
 

