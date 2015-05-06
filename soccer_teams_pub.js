var request = require("request");
var mqtt = require("mqtt");
var validator = require("validator");
var teams = require("./.topics").available.subjects.sports.soccer.teams;
var bunyan = require("bunyan");


/*
Global variables
*/
var base_topic = 'available/subjects/sports/soccer/teams/';  //the base topic 
var last_published = {};   //last published id (of fixtures) for each supported team
var team_size = 0;
var log; // the log mechanism
var mqtt_client; //the mqtt client

//======================================================================================


//initializing log mechanism 
var log = bunyan.createLogger({
    name : "teams_pub",
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


 
//the initialization, should be executed only once
var initialization = function(){
    //initializing the object that will store the last id of the score for each team
    //in order to avoid publishing the same score over and over
    for(var i in teams){
        last_published[i] = undefined; 
        team_size++;
    }
    
    //initializing the mqtt connection
    mqtt_client  = mqtt.connect('mqtt://localhost', {clientId : "soccer_team_pub", retain : false});
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
                'X-Auth-Token': require("./.tokens").football_data
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
            if(last_published[this.current_team] != last_result.id){
                log.info("team ", this.current_team, " new result found !");
                last_published[this.current_team] = last_result.id;
                mqtt_client.publish(base_topic+this.current_team, 
                                    JSON.stringify(last_result), 
                                    {qos:1}, 
                                    this.callback_after_publish);
            }else{
                log.info("team ", this.current_team, " no new result found.");
            }
            
        }else{
            log.error(error);
        }
}


//loops over teams to execute request for each and get scores
var loop_over_teams = function(){
    log.info("checking for new results ...");
    for(var i in teams){
        request(get_options(teams[i].id), 
                    extract_last_result.bind({current_team:i}));
    }
}

//executes the loop_over_teams function each hour
var start = function(){
    loop_over_teams();
    setInterval(loop_over_teams, 3600000);
}


/*
    Execution
*/
initialization();
start();


