const args = process.argv.slice(2);

const IP_RE = new RegExp('(?:[0-9]{1,3}\.){3}[0-9]{1,3}');
const INTERVAL_RE = new RegExp('-i([0-9]+)');
const PORT = "4950";
try {
    var IPs = args.filter((e)=> IP_RE.test(e));
} catch (e) {
    console.log(e);
}
if (!IPs.length) var IPs = ["127.0.0.1"];;

try {
    var INTERVAL = parseInt(args.filter((e, i)=> INTERVAL_RE.test(e))[0].split("i").pop());
} catch (e) {
    var INTERVAL = 5;
}
console.log("Will propagate w/ interval "+INTERVAL+" to the following:");
for (var i = 0; i < IPs.length; i++) {
    console.log("\t-\t"+IPs[i]);
}

const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
//const buttons = require('./button_map');
var keypress = null;
var readline = null;
try {
    keypress = require('keypress');
    tty = require('tty');
    keypress(process.stdin);
    keypress.enableMouse(process.stdout)
} catch (e) {
    readline = require('readline');
    readline.emitKeypressEvents(process.stdin);
}
const M_SQRT1_2 = 1/Math.sqrt(2);



//const CPAD_BOUND = 0x5d0;
//const CPP_BOUND = 0x7f;

//const gamePadConfig = { interval: config.interval };
//const gamepad = xinput.WrapController(0, gamePadConfig);



const Input = {
    up: false,
    down: false,
    right: false,
    left: false,
    
    a: false, //a
    d: false, //b
    z: false, //y
    x: false, //x
    
    space: false, //start
    b: false, //select

    t: false, //r1
    g: false, //r2
    
    h: false, //l1
    n: false, //l2
    
    click: undefined
};

process.on('exit', function () {
    //disable mouse on exit, so that the state is back to normal
    //for the terminal.
    if (keypress) keypress.disableMouse(process.stdout);
})

process.stdin.on('mousepress', function (mouse) {
    console.log(mouse);
})

process.stdin.on('keypress', function (ch, key) {
    
    if (key && key.ctrl && key.name == "c") process.exit();
    var propagate = 0xfff; //placeholder - work out something better
    propagate &= ~(1 << 6);
    for (var keyname in Input) {
        if (key.name == keyname) {
            Input[keyname] = Boolean(key);
            console.log(key);
        }
    }
});

setInterval(() => {Propagate()}, 1000/INTERVAL);

process.stdin.setRawMode(true);
process.stdin.resume();

function Propagate() {
    //console.log("propagating");
    const buffer = Buffer.allocUnsafe(20);
    buffer.writeUInt32LE(setButtons(), 0);
    /*
    buffer.writeUInt32LE(touchScreenState, 4);
    buffer.writeUInt32LE(circlePadState, 8);
    buffer.writeUInt32LE(newDSInputs, 12);
    buffer.writeUInt32LE(interfaceButtons, 16);
    */
    buffer.writeUInt32LE(0x2000000, 4);
    buffer.writeUInt32LE(0x7ff7ff, 8);
    buffer.writeUInt32LE(0, 12);
    buffer.writeUInt32LE(0, 16);

    for (var i = 0; i < IPs.length; i++) {
        socket.send(buffer, PORT, IPs[i], err => {
            if (err) {
                console.log(err);
            }
        });
    }
}

/**
 * Map the appropriate XBox controller buttons
 * to 3DS controls
 *
 * @returns {number}
 */
function setButtons() {
    let hidPad = 0xfff;

    if (Input.a === true) {
        hidPad &= ~(1 << 0);
    }

    if (Input.d === true) {
        hidPad &= ~(1 << 1);
    }

    if (Input.space) {
        hidPad &= ~(1 << (2));
    }

    if (Input.b) {
        hidPad &= ~(1 << (3));
    }

    if (Input.right === true) {
        hidPad &= ~(1 << (4));
    }

    if (Input.left === true) {
        hidPad &= ~(1 << (5));
    }

    if (Input.up === true) {
        hidPad &= ~(1 << (6));
    }

    if (Input.down === true) {
        hidPad &= ~(1 << (7));
    }

    if (Input.h) {
        hidPad &= ~(1 << (8));
    }

    if (Input.t) {
        hidPad &= ~(1 << (9));
    }

    if (Input.x === true) {
        hidPad &= ~(1 << (10))
    }

    if (Input.z === true) {
        hidPad &= ~(1 << (11))
    }

    for (var keyname in Input) {
        Input[keyname] = false;
    }

    return hidPad;
};

/**
 * Map bumpers to R2 and L2
 *
 * @param state
 * @returns {number}
 */
function setIRButtons(state) {
    let irButtonState = 0;

    if (state.shoulder.right) {
        irButtonState |= 1 << (buttons.R2 - 11)
    }

    if (state.shoulder.left) {
        irButtonState |= 1 << (buttons.L2 - 11)
    }

    return irButtonState;
}

/**
 * Map the touchscreen
 *
 * @param state
 * @returns {number}
 */
function setTouchscreen(state) {
    return 0x2000000;
    // TODO: Creaete a GUI touchscreen
}

/**
 * Map the left joystick to the analog 3DS joystick
 *
 * @returns {number}
 */
function setCirclePad() {
    let circlePadState = 0x7ff7ff;

    const lx = gamepad.getNormalizedState('leftstick', 'x');
    const ly = gamepad.getNormalizedState('leftstick', 'y');

    if (lx != 0.0 || ly != 0.0) {
        let x = parseInt(lx * CPAD_BOUND + 0x800);
        let y = parseInt(ly * CPAD_BOUND + 0x800);
        x = x >= 0xfff ? (lx < 0.0 ? 0x000 : 0xfff) : x;
        y = y >= 0xfff ? (ly < 0.0 ? 0x000 : 0xfff) : y;

        circlePadState = (y << 12) | x;
    }

    return circlePadState;
}

/**
 * Map NEW 3DS L2, R2, and C-Stick to left and right
 * bumpers and right joystick.
 *
 * @param state
 * @returns {number}
 */
function setInputs_New(state) {
    let cStickState = 0x80800081;

    const rx = gamepad.getNormalizedState('rightstick', 'x');
    const ry = gamepad.getNormalizedState('rightstick', 'y');

    const irButtonsState = setIRButtons(state);

    if (rx != 0.0 || ry != 0.0 || irButtonsState != 0) {
        // We have to rotate the c-stick position 45°. Thanks, Nintendo.

        let x = toUint32(M_SQRT1_2 * (rx + ry) * CPP_BOUND + 0x80);
        let y = toUint32(M_SQRT1_2 * (ry - rx) * CPP_BOUND + 0x80);
        x = x >= 0xff ? (rx < 0.0 ? 0x00 : 0xff) : x;
        y = y >= 0xff ? (ry < 0.0 ? 0x00 : 0xff) : y;

        cStickState = toUint32((y << 24) | (x << 16) | (irButtonsState << 8) | 0x81);
    }

    return cStickState;
}

function modulo(a, b) {
    return a - Math.floor(a/b)*b;
}

function toUint32(x) {
    return modulo(toInteger(x), Math.pow(2, 32));
}

function toInteger(x) {
    x = Number(x);
    return x < 0 ? Math.ceil(x) : Math.floor(x);
}
