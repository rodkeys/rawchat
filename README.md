# Raw.chat - Hang out and chat  

![Image of Raw.chat demo](https://raw.chat/favicon.png)

### Demo: [Raw.chat](https://raw.chat) 


### Why does this project exist?
It is a chat app I developed during the lockdowns to quickly connect people to chat and hangout. 

### Why is this project unique?
Messages sent on Raw.chat cannot be censored. What this means is that anyone who runs Raw.chat can choose who moderates their discussion because chat messages are sent to every participant in the room (we use IPFS' gossipsub to do this), and not to any centralized server. This means even if a moderator tries to censor your chat, you can ignore their moderation rules and still see any users' messages if you choose to do so. There is nothing they can do to prevent other people's opinions and conversations from happening if you choose to see them. 

### What about people who decide to post -*insert bad thing here*?-
Some moderation can be a good thing, everyone has seen spam emails before and know that spam filters are good things to have. That's why with raw.chat, users can choose their moderator, or to have no moderation at all. It gives users a choice on what they want to see.   

### Features 
* Displays and ranks trending rooms
* Decentralized chat
* Supports file sharing
* Optional moderation
* Cryptographically signed and verified messages
* Fork of [Orbit Web](https://github.com/orbitdb/orbit-web)


### Client Instructions (dev testing)

1. Enter `npm install`
2. Run `npm start`
