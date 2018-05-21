# nodecg-speedcontrol

*This is a bundle for [NodeCG](https://nodecg.com/); if you do not understand what that is, we advise you read their website first for more information.*

nodecg-speedcontrol, usually known as just "Speedcontrol", is a bundle for the [NodeCG](https://nodecg.com/) broadcast graphics framework/application developed for automating tasks for speedrunning marathons, mainly changing information on overlays and updating the Twitch information.

Some basic information:
- Import schedules from [Horaro](https://horaro.org/).
- By default, can store information on the run and the runners, but can also be customised to store more if needed by advanced users.
- Automatically change Twitch title and/or game directory if needed.
- Automatically feature the current runner(s) on the [FrankerFaceZ](https://www.frankerfacez.com/) featured channels function below the stream.
- Has an inbuilt timer (powered by [livesplit-core](https://github.com/LiveSplit/livesplit-core)); no need to have a seperate application open.
- Basic support for donation total for events on [Tiltify](https://tiltify.com/).
- Support for donation total/goals/bidwars/new donations from marathon pages on [speedrun.com's](https://www.speedrun.com/) if your event has them enabled.

This bundle doesn't come with any graphics, you will need to create them yourself in another bundle. We currently have no READMEs for this but you can check out [speedcontrol-simpletext](https://github.com/speedcontrol/speedcontrol-simpletext) for an simple example bundle.

## Installation

You will need [Node.js](https://nodejs.org) and [git](https://git-scm.com/) installed to install NodeCG, then see the [NodeCG documentation](http://nodecg.com/) on how to install that. I also suggest installing `nodecg-cli`; information on that is also on the documentation just linked.

- `nodecg install speedcontrol/nodecg-speedcontrol` to install the latest version of nodecg-speedcontrol

This bundle can run without any extra configuration, but it's needed to use all of the functionality. Please see [Configuration.md](https://github.com/speedcontrol/nodecg-speedcontrol/blob/master/READMES/Configuration.md) for more information.

### tl;dr installation

Install [Node.js](https://nodejs.org) and [git](https://git-scm.com/), then make a folder anywhere and open a command prompt/shell/bash window, then run these commands in order:

```
npm install bower -g
npm install nodecg-cli -g
nodecg setup
nodecg install speedcontrol/nodecg-speedcontrol
nodecg start
```
