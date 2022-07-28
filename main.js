let localStream;
let remoteStream;
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

let peerConnection;

const servers = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
};

let socket;
const room = 'random';
const uid = 'user1';

let init = async () => {
  // initialize socket.io
  socket = io('https://모도코.com/socket/room');
  socket.on('connect', () => {
    console.log('[SOCKET] socket connected');

    // join random room
    socket.emit('joinRoom', { room, uid });

    // on joinRoom event
    socket.on('joinedRoom', (room) => {
      console.log('[SOCKET] join room', room, 'success');
    });

    // on newUser joinedRoom event
    socket.on('newUser', onNewUserJoinedRoom);

    // listen to call-user event's offer
    // which is call-made event
    socket.on('call-made', onCallMade); // end of call-made event listener

    // listen to ice-candidate event
    // which is ice-candidate of other user
    socket.on('ice-candidate', onIceCandidateRecieved);
  });

  // Get the local stream and set it as the video source
  localStream = await navigator.mediaDevices.getDisplayMedia();
  localVideo.srcObject = localStream;
};

let createOffer = async (sid) => {
  peerConnection = new RTCPeerConnection(servers);

  // setup remote video
  remoteStream = new MediaStream();
  remoteVideo.srcObject = remoteStream;

  // setup local track to send
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // on remote track added to peer connection
  // = anytime a remote track is added to the peer connection
  //   add it to the remote video track
  peerConnection.ontrack = (event) => {
    console.log(event.streams);
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  // create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer); // triggers ice gathering

  // trickle ice candidates
  // onicecandidate event is fired whenever a candidate is found
  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      console.log('[RTC] New ice candiate created :', event.candidate);

      console.log('[SOCKET] Trickle ice (send ice candidate)');
      // send ice candidate to other user
      socket.emit('ice-candidate', {
        to: room,
        candidate: event.candidate,
      });
    }
  };

  // send offer to new user
  console.log(`[SOCKET] call user(${sid}) with offer`);
  socket.emit('call-user', { to: sid, offer });
};

onNewUserJoinedRoom = async (user) => {
  console.log(`[SOCKET:on"newUser"] new user(${user.sid}) joined room`);
  await createOffer(user.sid);
};

// handle offer from new user
onCallMade = (data) => {
  console.log(`[SOCKET:on"call-made"] received offer from other user(${data.socket})`);
};

// handle ice-candidate from other user
onIceCandidateRecieved = (data) => {
  console.log(
    `[SOCKET:on"ice-candidate"] received ice-candidate from other user(${data.sid}), candidate: ${data.candidate}`
  );
};

init();
