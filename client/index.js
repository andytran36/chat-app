const socket = io();

var userList = [];

$('document').ready(() => {
    let socketid = getCookie("socketid");
    let username = getCookie("username");
    let color = getCookie("color");
    let user = { socketid: socketid, username: username, color: color };
    if (socketid !== "") {
        socket.emit("connect past user", user);
    } else {
        socket.on('connect', () => { 
            socket.emit('new user connected', '');
        });
    }
});

$(function () {
    $('form').submit(function(e) {
        e.preventDefault();

        const message = $('#m').val();

        // if there is no command, emit message
        if (!handleCommands(message))
            socket.emit('chat message', message);
        $('#m').val('');

        return false;
    });

    socket.on('chat message', function(res){
        const user = userList.find(({socketid}) => socketid === res.socketid);

        if (res.socketid === socket.id) {
            $('#messages').append($('<li>').html(
                res.timestamp + ` <b><span style="color:${user.color};">${user.username}</span>: ` + res.message + '</b>'
            ));
        }
        else {
            $('#messages').append($('<li>').html(
                res.timestamp + ` <span style="color:${user.color};">${user.username}</span>: ` + res.message
            ));
        } 
        $('#messages-container').scrollTop($('#messages-container')[0].scrollHeight);
    });

    socket.on('user list', function(user) {
        userList.push(user);
        if (user.status !== "offline") {
            if (user.socketid === socket.id)
                $('#users').append($('<li>').html(`<span style="color:${user.color}">` + user.username + "</span> (me)"));
            else $('#users').append($('<li>').html(`<span style="color:${user.color}">` + user.username + "</span>"));
        }
    });

    socket.on("user list changed", function() {
        userList = [];
        $("#users").empty();
        $("#messages").empty();
        socket.emit("get user list", "");
        socket.emit("get message list", "");
    });

    socket.on('set up cookies', function(user) {
        setCookie("socketid", user.socketid, 1);
        setCookie("username", user.username, 1);
        setCookie("color", user.color, 1);
    });

    socket.on("connect past user failed", function() {
        socket.emit('new user connected', '');
    })
});

function handleCommands(msg) {
    // dont handle if message doesnt begin with '/'
    if (!msg.match(RegExp('^/'))) return false;

    // if msg begins with '/', handle it then return true
    const tokens = msg.split(' ');
    if (tokens[0] === "/color" && tokens.length == 2) {
        socket.emit('change color', tokens[1]);
    } else if (tokens[0] === "/name" && tokens.length == 2) {
        socket.emit('change name', tokens[1]);
    } else {
        // do nothing
    }

    return true;
}

// cookie helper functions (from https://www.w3schools.com/js/js_cookies.asp)
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}