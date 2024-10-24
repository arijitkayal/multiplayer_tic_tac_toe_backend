const express = require("express");
const app = express();
const cors = require("cors");
app.use(cors());

const { createServer } = require("http");
const myServer = createServer(app);
const { Server } = require("socket.io");
const io = new Server(myServer, { cors: { origin: "*" } });


var allUser = {};
var allRooms=[];

io.on("connection", (socket) => {
  console.log("a user connected with socket id: " + socket.id);
  allUser[socket.id] = {
    socket: socket,
    online: true,
    isPlaying:false
  };

  socket.on("request_to_play", (data) => {
    const currentUser=allUser[socket.id];
    currentUser.playerName=data.playerName;
    allUser[socket.id].playerName=data.playerName;
    // Object.keys(allUser).forEach(key=>{     
    //     console.log(key+" : "+allUser[key]);
        
    // });
    for (let key in allUser) {
        if (allUser.hasOwnProperty(key)) {
          console.log(key);
          console.log(allUser[key].online,allUser[key].isPlaying,allUser[key].playerName);
                  
        }
     }

    let opponentPlayer;
    for (const key in allUser) {
        const user=allUser[key];
        if(user.online && !user.isPlaying && socket.id !== key)
        {
            opponentPlayer=user;
            break;
        }
    }

    if(opponentPlayer)
    {
        currentUser.isPlaying=true;
        opponentPlayer.isPlaying=true;
        allUser[currentUser.socket.id].isPlaying=true;
        allUser[opponentPlayer.socket.id].isPlaying=true;

        for (let key in allUser) {
          if (allUser.hasOwnProperty(key)) {
            console.log("In Playing Mode:");
            console.log(allUser[key].online,allUser[key].isPlaying,allUser[key].playerName);
                    
          }
       }

        allRooms.push({
            player1:currentUser,
            player2:opponentPlayer,
        })
        currentUser.socket.emit("opponent_found",{opponentName:opponentPlayer.playerName, playingAs:'cross'})
        console.log("Opponent Found : "+opponentPlayer);

        opponentPlayer.socket.emit("opponent_found",{opponentName:currentUser.playerName , playingAs:'circle'})


        currentUser.socket.on("player_move_from_client",(data)=>{
            console.log("Emitted From Client:"+data);
            console.log(data);
            
            opponentPlayer.socket.emit("player_move_from_server",data)
            
        })

        opponentPlayer.socket.on("player_move_from_client",(data)=>{
          console.log("Emitted From Client:"+data);
          console.log(data);
            currentUser.socket.emit("player_move_from_server",data);

            
        })

        // for Rematch
        currentUser.socket.on('rematch',()=>{
          opponentPlayer.socket.emit('rematch_from_server');
        })

        opponentPlayer.socket.on('rematch',()=>{
          currentUser.socket.emit('rematch_from_server');
        })

        currentUser.socket.on('rematch_confirmed',()=>{
          opponentPlayer.socket.emit('rematch_confirmed_from_server');
        })
        opponentPlayer.socket.on('rematch_confirmed',()=>{
          currentUser.socket.emit('rematch_confirmed_from_server');
        })

        currentUser.socket.on('rematch_rejected',()=>{
          opponentPlayer.socket.emit('rematch_rejected_from_server');
        })

        opponentPlayer.socket.on('rematch_rejected',()=>{
          currentUser.socket.emit('rematch_rejected_from_server');
        })

        // for exit room

        currentUser.socket.on('end',()=>{
          currentUser.socket.disconnect(0);
          
        })

        opponentPlayer.socket.on('end',()=>{
          opponentPlayer.socket.disconnect(0);
        })
        
    }
    else{
        currentUser.socket.emit("opponent_not_found");
        console.log("Opponent Not found !");
        
    }
    
  });



  socket.on("disconnect", () => {
    const currentUser=allUser[socket.id];
    currentUser.online=false;
    currentUser.isPlaying=false;
    for (let index = 0; index < allRooms.length; index++) {
        const {player1,player2} = allRooms[index];
        
        if(player1.socket.id===socket.id){
            player2.socket.emit('opponent_left');
            break;
        }

        if(player2.socket.id===socket.id){
            player1.socket.emit('opponent_left');
            break;
        }

        
    }
  });
});
const PORT=process.env.PORT || 3000;
myServer.listen(PORT, () => {
  console.log("Server is running on port "+PORT);
});
