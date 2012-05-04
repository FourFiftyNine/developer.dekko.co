cd /home/ubuntu/developer
# git pull
if [ $(ps aux | grep $USER | grep node | grep -v grep | wc -l | tr -s "\n") -eq 0 ]
then
        echo "had to reboot"
        export NODE_ENV=production
        export PATH=/usr/local/bin:$PATH
        cd /home/ubuntu/developer
        forever -o forever_events.log -e forever_error.log start app.js >/dev/null
        # echo "developer.dekko.co had to be restarted" | mail -s "dekko status" 4152154856@txt.att.net
        # echo "developer.dekko.co had to be restarted" | mail -s "dekko status" 4158194514@txt.att.net
        # node app.js > /dev/null & 
fi

