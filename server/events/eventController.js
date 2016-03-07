var Event = require('./eventModel.js');
    User = require('../users/userModel.js');
    Q = require('q');
    userController = require('../users/userController');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var CronJob = require('cron').CronJob;
// var http = require('http');


// Promisify a few mongoose methods with the `q` promise library
var findEvent = Q.nbind(Event.findOne, Event);
var createEvent = Q.nbind(Event.create, Event);
var updateEvent = Q.nbind(Event.update, Event);
var findAllEvents = Q.nbind(Event.find, Event);
var getAllUsers = Q.nbind(User.find, User);
var findUser = Q.nbind(User.findOne, User);
var getAllUsers = Q.nbind(User.find, User);


var checkEventAndNotify = function() {
  findAllEvents({ notified: false })
  .then(function (events) {
    var EventsToNotify = [];
    events.forEach( function (event) {
      if (event.decision){
        var currentDate = new Date();
        var timeDiff = Math.abs(event.decision.date.getTime() - currentDate.getTime());
        var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        if(diffDays<4){
          EventsToNotify.push(event);
        };
      };
    });

    EventsToNotify.forEach(function(event){
      updateEvent({name: event.name}, {notified: 'true'}, { multi: false }, function(err, success){console.log(err,'or', success)});
      getAllUsers({ 'fbId':  { $in: event.users}})
      .then(function (userList) {
        var emailList= [];
        userList.forEach(function (user) { emailList.push(user.email.value); });
        emailListStr = emailList.join(', ');
        emailList.forEach( function(email) {
          var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
          var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
          var transporter = nodemailer.createTransport('smtps://webdevtestserver@gmail.com:titrating-raspberries@smtp.gmail.com');

          transporter.sendMail({
          from: 'yourfriends@whenandwhere.com',
            to: email,
            subject: 'You have an upcoming event!',
            text: 'To our esteemed partier' + ',\n\nYour scheduled event, ' + event.name + ', is scheduled at ' + event.decision.location.name + ' on ' +
              days[(event.decision.date.getDay())] + ', ' + months[(event.decision.date.getMonth())] + ' ' + event.decision.date.getDate() +
              ', ' + event.decision.date.getFullYear() +'. \nPlease visit When&Where for more details!\n\nSincerely,\nThe When&Where Team', //Mon Mar 07 2016
          }, function(error, info){
              if (error){
                console.log('error is ', error);
              } else if (info){
                console.log('email return object is ', info);
              }
          });
        });
      });
    });
  });
}

var notifications = new CronJob('0 */4 * * *', //Cron Event for checking whether to send event notifications
  checkEventAndNotify,
  true,
  'America/Los_Angeles'
);


var pickWinner = function(choices, category) {
  var mostVotes = 0;
  var winner = choices[0][category];
  for(var i = 0; i < choices.length; i ++) {
    if(choices[i].votes > mostVotes) {
      mostVotes = choices[i].votes;
      winner = choices[i][category];
    }
  }
  return winner;
}

var decideUsersEvents = function(fbId) {
    findUser({fbId: fbId})
      .then(function (user) {
        if (!user) {
          console.log('user not found');
        } else {
          var userEvents = user.events;
          findAllEvents({'_id': {$in: userEvents}})
            .then(function(events) {
              events.forEach(function(event) {
                //if the event's deadline has passed and it doesn't have a decision, decide it
                if((event.deadline < new Date() && event.decision === undefined) ||
                    event.usersWhoSubmitted.length === event.users.length) {
                  var decision = makeEventDecision(event);
                  Event.update({_id: event._id}, {decision: decision}, function (err, savedEvent) {
                      if (err) {
                        console.error(err);
                      }
                    });
                }
              });
            })
        }
      })
      .fail(function (error) {
        next(error);
      });
  }

var makeEventDecision = function(event) {
  var date = pickWinner(event['dates'], 'date');
  var location = pickWinner(event['locations'],'location');
  return {date: date, location: location};
}

module.exports = {

  removeUser: function (req, res) {
    var fbId = req.body.fbId;
    var eventId = req.body.eventId;

    findEvent({_id: eventId})
      .then(function (event) {
        if (event) {
          var userIndex = event.users.indexOf(fbId);
          if (userIndex > -1) {
            event.users.splice(userIndex,1);
            event.save(function(err) {
                        if (err) {
                          console.error(err);
                        }
                      });
          }
        } else {
          console.error('Error finding event');
        }
      });
  },

  allEvents: function (req, res, next) {
    findAllEvents({})
      .then(function (events) {
        res.json(events);
      })
      .fail(function (error) {
        next(error);
      });
  },

  newEvent: function (req, res, next) {
    var event = req.body;

    //store dates as js objects
    event.deadline = new Date(event.deadline);
    event.dates.forEach(function(choice) {
      choice.date = new Date(choice.date);
    });

    createEvent(event)
      .then(function (createdEvent) {
        if (createdEvent) {
          userController.addEventToUsers(createdEvent.users, createdEvent._id);
          res.json(createdEvent);
        }
      })
      .fail(function (error) {
        next(error);
      });
  },

  userEvents: function (req, res, next) {
    var fbId = req.params.fbId.slice(1);

    findUser({fbId: fbId})
      .then(function (user) {
        if (!user) {
          res.send(404);
        } else {
          var userEvents = user.events;
          findAllEvents({'_id': {$in: userEvents}})
            .then(function(events) {
              var counter = 0;
              if(!events.length) {
                res.json([]); //Send back empty array
              } else {
                events.forEach(function(event,index) {
                  var userIds = event.users;
                  getAllUsers({'fbId': {$in: userIds}})
                    .then(function(users) {
                      event.users = users;
                      counter++;
                      if(counter === events.length) {
                        res.json(events);
                      }
                    });
                });
              }
            })
        }
      })
      .fail(function (error) {
        next(error);
      });
  },

  decideUsersEvents: decideUsersEvents,

  submitEventVotes: function(req, res, next) {
    var eventId = req.body.eventId;
    var userFbId = req.body.userFbId;
    var locationVotesArr = req.body.locationVotesArr;
    var dateVotesArr = req.body.dateVotesArr;

    findEvent({_id: eventId})
    .then(function(event) {
      if(event) {

        //add votes to selected locations
        locationVotesArr.forEach(function(vote, index) {
          if(vote) {
            event['locations'][index].votes += 1;
          }
        });
        //add votes to selected dates
        dateVotesArr.forEach(function(vote, index) {
          if(vote) {
            event['dates'][index].votes += 1;
          }
        });

        //add user to list of user's who've submitted
        event.usersWhoSubmitted.push(userFbId);

        //save event
        Event.update({_id: event._id}, {dates: event.dates, locations: event.locations, usersWhoSubmitted: event.usersWhoSubmitted} ,function (err, savedEvent) {
          if (err) {
            next(err);
          } else {
            if (event.usersWhoSubmitted.length === event.users.length) {
              decideUsersEvents(userFbId);
            }
            res.send(savedEvent);
          }
        });
      } else{ //if event isn't found send a 404
        res.send(404);
      }
    });
  }

};
