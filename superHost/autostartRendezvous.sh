#!/bin/bash

while true
do
if [ -z "$(sudo lsof -i :4000)" ];
then
nohup rendezvous --key="/etc/letsencrypt/live/raw.chat/privkey.pem" --cert="/etc/letsencrypt/live/raw.chat/fullchain.pem" --port=4000 &
fi
sleep 10
done