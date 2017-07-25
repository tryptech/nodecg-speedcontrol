// World's best README, available here:
// Refreshes info from API every 30 seconds.
// Replicants:
//   > srcomDonationTotal - current donation total as a float
//   > srcomDonationGoals - array of open goals (excluding bidwar related goals)
//   > srcomDonationBidwars - array of open bidwars (with embedded goals)
// Messages:
//   > srcomNewDonation - donation object (with embedded user/goal/bidwar)
// STILL TO BE ADDED: Prizes (I have no clue how this works yet because no examples)

'use strict';
var needle = require('needle');
var async = require('async');
var _ = require('lodash');
var moment = require('moment');

module.exports = function(nodecg) {
	var requestOptions = {
		follow: 1,
		headers: {
			'User-Agent': 'nodecg-speedcontrol'
		}
	};
	var eventID;
	var previousDonationIDs = [];
	var initDonations = false;
	var donationCutOff = 3600; // If a donation hasn't been accepted after 1 hour, it will be ignored.
	
	if (typeof nodecg.bundleConfig !== 'undefined' && nodecg.bundleConfig.enableSRCDonations
		&& nodecg.bundleConfig.SRCEventSlug) {
		nodecg.log.info('"enableSRCDonations" is true, Speedrun.com Donation integration is enabled');
		
		// Setting up replicants.
		var srcomDonationTotalReplicant = nodecg.Replicant('srcomDonationTotal', {persistent:false, defaultValue:0});
		var srcomDonationGoalsReplicant = nodecg.Replicant('srcomDonationGoals', {persistent:false, defaultValue:[]});
		var srcomDonationBidwarsReplicant = nodecg.Replicant('srcomDonationBidwars', {persistent:false, defaultValue:[]});
		
		var url = 'https://www.speedrun.com/api/v1/games/'+nodecg.bundleConfig.SRCEventSlug.toLowerCase();
		needleGET(url, requestOptions, function(err, response) {
			// Checks to see if the slug exists on the site.
			if (!err && response.statusCode === 200) {
				// Gets the speedrun.com ID of the event.
				eventID = response.body.data.id;
				
				// Loops through the information links to see if this event is donations enabled.
				var links = response.body.data.links;
				var donationsActive = false;
				for (var i = 0; i < links.length; i++) {
					if (links[i].rel === 'donation-summary') {
						donationsActive = true; break;
					}
				}
				
				if (donationsActive)
					setInterval(runFrequentUpdates, 45000);
				
				else nodecg.log.warn('The SRCEventSlug doesn\'t have donations enabled on Speedrun.com!');
			}
			
			else nodecg.log.warn('The SRCEventSlug does not exist on Speedrun.com!');
		});
	}
	
	else nodecg.log.info('"enableSRCDonations" is false (or you forgot the SRCEventSlug), Speedrun.com Donation integration is disabled');
	
	function runFrequentUpdates() {
		checkDonationTotal(function(total) {
			// Update the total replicant if the donation total has actually changed.
			if (srcomDonationTotalReplicant.value !== total)
				srcomDonationTotalReplicant.value = total;
		});
		
		getNewDonations(function(donations) {
			// If there's any new donations, sends a message for each.
			if (donations && donations.length > 0) {
				donations.forEach(function(donation) {
					nodecg.sendMessage('srcomNewDonation', donation);
				});
			}
		});
		
		// Update goals/bidwars replicants.
		getGoals(function(updatedGoals) {
			if (updatedGoals) srcomDonationGoalsReplicant.value = updatedGoals;
		});
		getBidwars(function(updatedBidwars) {
			if (updatedBidwars) srcomDonationBidwarsReplicant.value = updatedBidwars;
		});
	}
	
	// Used to frequently get the current donation total.
	function checkDonationTotal(callback) {
		var url = 'https://www.speedrun.com/api/v1/games/'+eventID+'/donations'
		needleGET(url, requestOptions, function(err, response) {
			// Divided by 100 because the API returns the total in cents.
			var donationTotal = response.body.data['total-donated']/100;
			callback(donationTotal);
		});
	}
	
	function getNewDonations(callback) {
		var currentDonationIDs = [];
		var currentDonationList = [];
		var url = 'https://www.speedrun.com/api/v1/games/'+eventID+'/donations/list?max=200&embed=user,goal,bidwar';
		async.whilst(
			function() {return url;},
			function(asyncCallback) {
				needleGET(url, requestOptions, function(err, response) {
					var donations = response.body.data;
					var stop = false;
					for (var i = 0; i < donations.length; i++) {
						var donation = donations[i];
						
						// Once donations reach 1 hour old, we stop checking.
						if (initDonations && moment(donation.created).unix() < moment().unix()-donationCutOff) {
							stop = true; break;
						}
						
						// We have no reason to store non-accepted donations.
						// We also need to only show them when they *are* accepted.
						if (donation.status === 'accepted') {
							currentDonationIDs.push(donation.id);
							currentDonationList.push(donation);
						}
					}
					
					if (!stop) {
						url = undefined;
						response.body.pagination.links.forEach(function(link) {
							if (link.rel === 'next')
								url = link.uri;
						});
						setTimeout(asyncCallback, 1000);
					}
					
					else asyncCallback();
				});
			},
			function(err) {
				var newDonations = [];
				
				if (initDonations) {
					var newDonationIDs = _.difference(currentDonationIDs, previousDonationIDs);
					
					// We have new donations to push.
					if (newDonationIDs.length > 0) {
						newDonationIDs.forEach(function(id) {
							newDonations.push(_.find(currentDonationList, {'id':id}));
						});
					}
				}
				
				previousDonationIDs = currentDonationIDs.slice(0);
				if (!initDonations) initDonations = true;
				newDonations.reverse(); // This should hopefully make them go oldest to newest.
				callback(newDonations);
			}
		);
	}
	
	function getGoals(callback) {
		var goals = [];
		var url = 'https://www.speedrun.com/api/v1/games/'+eventID+'/donations/goals?max=200&embed=bidwar';
		async.whilst(
			function() {return url;},
			function(asyncCallback) {
				needleGET(url, requestOptions, function(err, response) {
					response.body.data.forEach(function(goal) {
						// We are ignoring goals related to bidwars for this bit.
						if (!goal.bidwar && goal.status === 'open')
							goals.push(goal);
					});
					
					url = undefined;
					response.body.pagination.links.forEach(function(link) {
						if (link.rel === 'next')
							url = link.uri;
					});
					setTimeout(asyncCallback, 1000);
				});
			},
			function(err) {
				callback(goals);
			}
		);
	}
	
	function getBidwars(callback) {
		var bidwars = [];
		var url = 'https://www.speedrun.com/api/v1/games/'+eventID+'/donations/bidwars?max=200&embed=goals';
		async.whilst(
			function() {return url;},
			function(asyncCallback) {
				needleGET(url, requestOptions, function(err, response) {
					response.body.data.forEach(function(bidwar) {
						if (bidwar.status === 'open')
							bidwars.push(bidwar);
					});
					
					url = undefined;
					response.body.pagination.links.forEach(function(link) {
						if (link.rel === 'next')
							url = link.uri;
					});
					setTimeout(asyncCallback, 1000);
				});
			},
			function(err) {
				callback(bidwars);
			}
		);
	}
	
	function needleGET(url, requestOptions, callback) {
		var success = true;
		var errorOccured = false;
		async.whilst(
			function() { return success; },
			function(callback) {
				needle.get(url, requestOptions, function(err, response) {
					if (err || !response || response.statusCode !== 200 || !response.body || !response.body.data) {
						console.log('['+Date()+'] sr.com api error, retrying in 5 secs, url: '+url+', err: '+err+((response && response.body)?', body: '+response.statusCode:''));
						setTimeout(callback, 5000);
						errorOccured = true;
					}
					
					else {
						if (errorOccured) console.log('['+Date()+'] sr.com api error cleared, url: '+url)
						success = false;
						callback(false, {err: err, response: response});
					}
				});
			},
			function (err, values) {
				callback(values.err, values.response);
			}
		);
	}
}