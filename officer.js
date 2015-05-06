var topics = require("./.topics");

//verify if the topic is valid
var validate_topic = function(topic) {
    var arr = topic.split("/");
    var index = topics.available;
    for(var i in arr){
        if(index.hasOwnProperty(arr[i])){
            index = index[arr[i]];
            continue;
        }else{
            return false;
        }
    }
    return true;
}

module.exports = exports = validate_topic;
