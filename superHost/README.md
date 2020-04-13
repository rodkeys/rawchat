# Raw.chat - Superhost  

The superhost is used as a client that is used as a bootstrap node for the network and can be switched out for anyone else's node.

<strong>Superhost Features</strong>

* Used as a bootstrap node for the network 
* Responsible for suggested moderation
* Holds a historical copy of room messages
* Tracks peers in each room to quickly bootstrap users


## Client Instructions

1. Switch out your config details in config.json
2. Make sure you are running a [rendezvous server](https://github.com/libp2p/js-libp2p-websocket-star-rendezvous) on port 4000  
3. Enter `npm install`
4. Run `node index`
5. Switch out your client IPFS server peerID with the superHost's peerID


Note: I will update this section with a cleaner instruction set shortly