const teams = require('../teams.json');

// Parse the parameters and call the appropriate method
exports.run = (params, message) => {   
    let teamRequest = '';

    // Check to see if the message specifies a team
    for (i = 0; i < params.length; i++) {
        // If the current parameter is one of these, then the team specification is over
        if (!isNaN(params[i]) || params[i] === 'previous') {
            break;
        } else if (i == 0) {
            teamRequest += params[i];
        } else {
            teamRequest += ' ' + params[i];
        }
    }

    // If there wasn't a team request OR the team name that was provided exists
    if (!teamRequest || teams[teamRequest]) {
        if (i === params.length) {
            // If there are no other parameters, send current week's schedule
            sendCurrentWeekResults(message, 0, teams[teamRequest]);
        } else if (!isNaN(params[i])) {
            // If this parameter is a number, make sure that the next one is also a number, then return the schedule for that stage and week
            if (i + 1 <= params.length) {
                if (!isNaN(params[i + 1])) {
                    let stage = params[i] - 1;
                    let week = params[i + 1] - 1;
                    sendSpecifiedWeekResults(stage, week, message, teams[teamRequest]);
                } else {
                    message.channel.send('Error: improper weeks parameter');
                }
            } else {
                message.channel.send('Error: please provide a weeks parameter');
            }
        } else if (params[i] === 'previous') {
            // Pass -1 as offset if we're looking for previous week's schedule
            sendCurrentWeekResults(message, -1, teams[teamRequest]);
        }
    } else {
        message.channel.send('Error: that team doesn\'t exist');
    }
}

function sendSpecifiedWeekResults(stage, week, message, teamId) {
    const request = require('request');
    
    request.get({
        url: 'https://api.overwatchleague.com/schedule', 
        json: true 
    }, function(err, res, body) {
        if (err) {
            message.channel.send('Error: something went wrong while retrieving the schedule.')
            console.log('error: ' + err);
            console.log('response: ' + res.statusCode);           
        }
        
        // Make sure that the requested stage and week exist
        if (stage > body['data']['stages'].length || stage < 0) {
            message.channel.send("Error: that stage doesn't exist");
            return;
        }
        if (week > body['data']['stages'][`${stage}`]['weeks'].length || week < 0) {
            message.channel.send("Error: that week doesn't exist");
            return;
        }

        let msg = constructMessage(stage, week, body, teamId);
        message.channel.send(msg);
    });
}

// Offset will be added to the current week in order to return next or previous week's schedule
function sendCurrentWeekResults(message, offset, teamId) {
    const request = require('request');
    let stage;
    let week;
    let currentDate = new Date().getTime();
    
    request.get({
        url: 'https://api.overwatchleague.com/schedule',
        json: true
    }, function (err, res, body) {
        if (err) {
            message.channel.send('Error: something went wrong while retrieving the schedule.')
            console.log('error: ' + err);
            console.log('response: ' + res.statusCode);           
        }
        
        // Iterate through each stage and figure out which one is current
        for(i = 0; i < Object.keys(body['data']['stages']).length; i++) {
            for (j = 0; j < Object.keys(body['data']['stages'][`${i}`]['weeks']).length; j++) {
                if (currentDate > body['data']['stages'][`${i}`]['weeks'][`${j}`]['startDate'] &&
                    currentDate < body['data']['stages'][`${i}`]['weeks'][`${j}`]['endDate']) {
                    stage = i;
                    week = j;
                    break;
                }
            }
        }
        
        
        // If no matches have taken place in the current week, send the previous week's results
        if (body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches']['9']['wins']['0'] == 0 &&
            body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches']['9']['wins']['1'] == 0) {
            offset--;
        }
        
        // Add/subtract the offset if we're looking for next or previous week
        week += offset;
        
        if (week === undefined || stage === undefined) {
            message.channel.send(
                'There are no games during this week. If you want the schedule for a specific week, ' +
                'please include a stage and week number.');
            return;
        }
        
        let msg = constructMessage(stage, week, body, teamId);
        message.channel.send(msg);
    });
}

function constructMessage(stage, week, body, teamId) {
    let msg = '**Stage ' + (stage + 1) + ', Week ' + (week + 1) + '**';

    let currentDay = -1;
    for (var m in body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches']) {
        // If a team id was provided and the specified team wasn't a competitor in the current match, skip it
        if (teamId) {
            if (body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches'][`${m}`]['competitors']['0']['id'] !== teamId &&
                body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches'][`${m}`]['competitors']['1']['id'] !== teamId) {
                continue;
            }
        }
        
        // Every time the day of the week that the current match occurs on differs from the one before it, print the new one
        let matchDate = new Date(body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches'][`${m}`]['startDate']);
        let matchDay = matchDate.getDay();
        if (currentDay != matchDay) {
            currentDay = matchDay;
            msg = msg.concat('\n\n__' + days[currentDay] + ', ' + months[matchDate.getMonth()] + ' ' + matchDate.getDate() + ':__');
        }
        
        let teamOneScore = body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches'][`${m}`]['wins']['0'];
        let teamTwoScore = body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches'][`${m}`]['wins']['1'];
        let matchData;
        
        if (teamOneScore > teamTwoScore) {
            matchData = '\n' + 
                body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches'][`${m}`]['competitors']['0']['name'] +
                ' **' + teamOneScore + ' - ' + teamTwoScore + '** ' +
                body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches'][`${m}`]['competitors']['1']['name'];
        } else if (teamOneScore < teamTwoScore) {
            matchData = '\n' + 
                body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches'][`${m}`]['competitors']['1']['name'] +
                ' **' + teamTwoScore + ' - ' + teamOneScore + '** ' +
                body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches'][`${m}`]['competitors']['0']['name'];
        } else {
            matchData = '\n' + 
                body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches'][`${m}`]['competitors']['1']['name'] +
                ' **TBD** ' +
                body['data']['stages'][`${stage}`]['weeks'][`${week}`]['matches'][`${m}`]['competitors']['0']['name'];
        }

        msg = msg.concat(matchData);
    }
    if (msg === '**Stage ' + (stage + 1) + ', Week ' + (week + 1) + '**') {
        msg = msg.concat('\n\nThat team doesn\'t play during that week.');
    }
    
    return msg;
}

let days = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday'
}

let months = {
    0: 'January',
    1: 'February',
    2: 'March',
    3: 'April',
    4: 'May',
    5: 'June',
    6: 'July',
    7: 'August',
    8: 'September',
    9: 'October',
    10: 'November',
    11: 'December'
}