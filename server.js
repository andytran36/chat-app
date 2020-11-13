var express = require('express')
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

const emojiEncoder = [{regex: /:\)/g, utf8: '&#128522;'}, {regex: /:\(/g, utf8: '&#128550;'}, {regex: /:o/g, utf8: '&#128558;'}]
const port = 3000;

// users stored as (socketid, username, color, status)
var userList = [];
// messages are stored as (socketid, timestamp, message)
var messageList = [];

app.use(express.static('client'));

app.get('/', (req, res) => {
    res.sendFile('index.html');
});

io.on('connection', (socket) => {

    socket.on("connect past user", (cookie) => {
        if (userList === []) socket.emit('connect past user failed', "");
        const user = userList.find(({socketid}) => socketid === cookie.socketid);
        if (user) {
            let newName = cookie.username;
            if (!isNameValid(newName))
                newName = getValidUsername("user");
            const newUser = { socketid: socket.id, username: newName, color: cookie.color, status: "online" };
            const index = userList.indexOf(user);
            userList[index] = newUser;
            
            // replace old socketid in messages with new one
            messageList.forEach((message) => {
                if (message.socketid === cookie.socketid) {
                    message.socketid = socket.id;
                }
            });

            // sends list of online users
            userList.forEach(user => {
                socket.emit('user list', user);
            });

            io.emit('user list', newUser);

            // output the chat log to the user and only the user
            messageList.forEach(message => {
                socket.emit('chat message', message);
            });

            socket.emit('set up cookies', newUser);
            io.emit("user list changed", "");
        }
        else {
            socket.emit('connect past user failed', "");
        }
    });
    
    socket.on('new user connected', () => {
        // input user into the current user list with a pre-generated name & color
        const newUser = { socketid: socket.id, username: getValidUsername("user"), color: "#4280e3", status: "online"}

        // sends list of online users
        userList.forEach(user => {
            socket.emit('user list', user);
        });

        io.emit('user list', newUser);
        userList.push(newUser);

        // output the chat log to the user and only the user
        messageList.forEach(message => {
            socket.emit('chat message', message);
        });

        socket.emit('set up cookies', newUser);
        io.emit("user list changed", "");
    });

    socket.on("get user list", () => {
        // sends list of online users
        userList.forEach(user => {
            socket.emit('user list', user);
        });
    });

    socket.on("get message list", () => {
        // output the chat log to the user and only the user
        messageList.forEach(message => {
            socket.emit('chat message', message);
        });
    });

    // socket receives normal message
    socket.on('chat message', (msg) => {
        if (msg === "") return;

        let now = new Date();
        let timestamp = "[" + now.toLocaleTimeString() + "]";

        let formattedMsg = addEmojis(msg);
        let messageObject = { socketid: socket.id, timestamp: timestamp, message: formattedMsg }
        saveMsg(messageObject);
        io.emit('chat message',  messageObject);
    });

    // socket receives color change request
    socket.on('change color', (newColor) => {
        if (newColor === "") return;
        // if the hex is valid, change the color and ping all users that a change has happened
        newColor = "#" + newColor;
        if (isHexValid(newColor)) {
            const user = userList.find( ({socketid}) => socketid === socket.id);
            const newUser = { socketid: user.socketid, username: user.username, color: newColor, status: "online"};
            const index = userList.indexOf(user);
            userList[index] = newUser;

            socket.emit('set up cookies', newUser);
            io.emit("user list changed", "");
        }
        return false;
    });

    // socket receives name change request
    socket.on('change name', (newName) => {
        // if the name is empty, not valid, or "disconnected" (reserved for leavers), ignore the request
        if (newName === "" || !isNameValid(newName) || newName === "disconnected") return;

        const user = userList.find( ({socketid}) => socketid === socket.id);
        const newUser = { socketid: user.socketid, username: newName, color: user.color, status: "online"};

        const index = userList.indexOf(user);
        userList[index] = newUser;

        socket.emit('set up cookies', newUser);
        io.emit("user list changed", "");
    });

    // TODO: add disconnect do display users
    socket.on('disconnect', () => {
        if (userList === []) return false;

        const user = userList.find( ({socketid}) => socketid === socket.id)
        const newUser = { socketid: user.socketid, username: "disconnected", color: "#828282", status: "offline" };

        const index = userList.indexOf(user);
        userList[index] = newUser;

        io.emit("user list changed", "");
    });

});

// Helper functions
function addEmojis(msg) {
    let formattedMsg = msg;
    emojiEncoder.forEach(emoji => {
        formattedMsg = regexReplace(emoji.regex, emoji.utf8, formattedMsg);
    });
    return formattedMsg;
}

function regexReplace(regex, utf8, msg) {
    let regexMatch = msg.match(regex);
    if (!regexMatch) {
        return msg;
    }
    else {
        let tokens = msg.split(regex);
        let formattedMsg = tokens.join(utf8);
        return formattedMsg;
    }
}

function saveMsg(messageObject) {
    messageList.push(messageObject);
    while (messageList.length > 200) {
        messageList.shift();
    }
}

function isHexValid(color) {
    return /^#[0-9A-F]{6}$/i.test(color);
}

function isNameValid(username) {
    let usernameList = userList.map((user) => {
        return user.username;
    });

    return !(usernameList.includes(username));
}

function getValidUsername(username) {
    let usernameList = userList.map((user) => {
        return user.username;
    });

    let num = 1;
    let newUsername = username + num.toString();
    while (usernameList.includes(newUsername)) {
        num++;
        newUsername = username + num.toString();
    }
    return newUsername;
}

server.listen(port, () => {
    console.log(`listening on *:${port}`);
});