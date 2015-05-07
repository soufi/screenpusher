require('dot-env');
var request = require("request");
var mqtt = require("mqtt");
var validator = require("validator");
var teams = require("./.topics").available.subjects.sports.soccer.teams;
var bunyan = require("bunyan");
var officer = require("./officer");


/*
    Global variables
*/
var name = "soccer_teams_pub"
var base_topic = '/available/subjects/sports/soccer/teams/';  //the base topic 
var log; // the log mechanism
var mqtt_client; //the mqtt client

//======================================================================================

/*
    Functions
*/
 
//the initialization, should be executed only once
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
    
    //initializing the mqtt connection
    mqtt_client  = mqtt.connect('mqtt://localhost', {clientId : name, retain : false});
    mqtt_client.on("error", function(error){
        log.error(error);
    });
    mqtt_client.on("connect", function(){
        for(var i in teams){
            mqtt_client.subscribe(base_topic+i);
        }
    });
}


//return an object containing the url to get the fixtures for the team with the given id
var get_options = function(id){
    if(validator.isNumeric(id)){
        return {
            url : "http://www.football-data.org/teams/"+id+"/fixtures",
            headers:{
                'X-Auth-Token': process.env.SOCCER_KEY
            }
        }
    }else{
        return {};
    }
}


//getting the last game result for the current team and publish the result if it was not already published
var extract_last_result  = function(error, response, body){
    if (!error && response.statusCode == 200) {
        var info = JSON.parse(body);
        var fixtures = info.fixtures;
        var last_result = {};
        var now = new Date();
        var i=0;
        while(i < info.count){
            var date = new Date(fixtures[i].date);
            if(date <= now){
                last_result = fixtures[i];
            }else{
                break;
            }
            i++;
        }
        //verifying if this score was already published or not
        if(this.last_published[this.index].id != last_result.id){
            log.info("team ", this.last_published[this.index].name, " new result found !");
            
            this.last_published[this.index].id = last_result.id;
            mqtt_client.publish(base_topic+this.last_published[this.index].name, 
                                JSON.stringify(last_result), 
                                {qos:1}, 
                                this.callback_after_publish);
        }else{
            log.info("team ", this.last_published[this.index].name, " no new result found.");
            request_team_result(this.last_published, this.index+1);
        }
    }else{
        log.error(error);
    }
}


/*
execute a request for a team in order to get results
bind variables when calling this function : 
    - index : the index of the current team to process 
    - last_published : the object containing teams name as a key and the id of the last treated fixture 
*/
var request_team_result = function(last_published, index){
    if(index == last_published.length)
        return;
    
    request(get_options(teams[last_published[index].name].id),
            extract_last_result.bind({index:index, 
                                     last_published:last_published,
                                     callback_after_publish : function(){
                                         //saving the last fixtures 
                                         officer.write_last_soccer_teams_fixture(last_published);
                                         request_team_result(last_published, index+1);
                                     }}));
}


//loops over teams to execute request for each and get scores
var loop_over_teams = function(){
    //last published id (of fixtures) for each supported team
    //in order to avoid publishing the same score over and over
    var last_published = officer.read_last_soccer_teams_fixture();
    var teams_size = 0;
    if(!last_published){
        last_published = []
        for(var i in teams){
            last_published.push({name:i, id:undefined}); 
        }
    }
    
    log.info("checking for new results ...");
    
    request_team_result(last_published, 0);
}


//executes the loop_over_teams function each hour
var start = function(){
    loop_over_teams();
    setInterval(loop_over_teams, 3600000);
}


//======================================================================================

/*
    Main Execution
*/
initialization();
start();


