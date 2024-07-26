#!/usr/bin/env bash
set -x
PORT=4950

#BLACK=$(tput setaf 0)
#RED=$(tput setaf 1)
#GREEN=$(tput setaf 2)
#LIME_YELLOW=$(tput setaf 190)
#YELLOW=$(tput setaf 3)
#POWDER_BLUE=$(tput setaf 153)
#BLUE=$(tput setaf 4)
#MAGENTA=$(tput setaf 5)
CYAN=$(tput setaf 6)
#WHITE=$(tput setaf 7)
#BRIGHT=$(tput bold)
NORMAL=$(tput sgr0)
#BLINK=$(tput blink)
#REVERSE=$(tput smso)
#UNDERLINE=$(tput smul)

function startGame() {
    set -x
    if [[ $XDG_CURRENT_DESKTOP != gamescope ]]; then
        #echo "running in gamescope";
        #exec gamescope -- ./head/citra-qt.AppImage &
        exit
    else
        echo "gamescope already present";
        ./head/citra-qt.AppImage &
        local PID=$!
        sleep 2
        # Alt+F to open file menu
        ydotool key 56:1 33:1 33:0 56:0
        sleep 0.2
        # Go downwards two menu entries to "Connect to Artic Base..."
        ydotool key 108:1 108:0 108:1 108:0 28:1 28:0
        sleep 0.2
        # Types the provided IP
        ydotool type "$(</tmp/ArticBaseClient)"
        # Presses enter and establishes connection
        ydotool key 28:1 28:0
        fg $PID
    fi
    set +x
}

function message() {
    echo "${CYAN}$1${NORMAL}"
}

function Scan() {
    #sometimes this won't pick up anything.
    nmap -sU --open 192.168.1.1/24 -p4950 -Pn -oG - | \
        grep Up | cut -d ' ' -f 2
}

while [ -z "${IP_ADDRESSES}" ]; do
    message "Server not found. Scanning Again."
    IP_ADDRESSES=$(Scan)
done

message "Building list."
for IP in $IP_ADDRESSES; do
    echo "$IP"
done | \
    xargs -I % bash -c 'node 3ds.js -i10 "%"'




test -d "$PWD/automation/$1" &&
    ({

        set -o history -o histexpand

        if [ -z ${IP+x} ]; then
            echo "IP not provided. Script called improperly. Canceling execution."
            exit 1
        fi

        RED=$(tput setaf 1)
        YELLOW=$(tput setaf 3)
        NORMAL=$(tput sgr0)

        function play() {
            ydotool recorder --replay
        }

        function error() {
            printf "${RED}Something went terribly wrong after:${NORMAL} ${YELLOW}" !! "${NORMAL}\n"
        }

        function waitForPort() {
            while ! nc -z "$IP" "$1"; do
                sleep 0.1 # wait for 1/10 of the second before check again
            done
        }

        echo "./automation/$1/script.sh"

    })
set +x
