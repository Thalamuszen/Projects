const service = require('../owlapi-service.js');

class Standings {
    execute(params, message) {
        // Send the overall season standings
        this.sendLeagueStandings(message);
    }

    sendLeagueStandings(message) {
        let msg = '**League Standings:**\n\n';
        
        service.apiRequest('standings').then((body) => {
            // Iterate through each team, print their rank and record
            for (let i = 0; i < Object.keys(body['ranks']['content']).length; i++) {
                msg = msg.concat((i + 1) + ': ' + 
                                body['ranks']['content'][`${i}`]['competitor']['name'] + ' **' +
                                body['ranks']['content'][`${i}`]['records']['0']['matchWin'] + 
                                '-' + body['ranks']['content'][`${i}`]['records']['0']['matchLoss'] + 
                                '**\n');
            }

            message.channel.send(msg);
        }).catch((err) => {
            message.channel.send('Error: something went wrong while retrieving the schedule.')
                console.log('error: ' + err);
                console.log('response: ' + res.statusCode); 
        });
    }
}

module.exports = Standings;