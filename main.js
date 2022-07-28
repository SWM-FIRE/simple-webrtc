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

let init = async () => {
  // initialize socket.io
  socket = io('https://모도코.com/socket/room');
  socket.on('connect', () => {
    console.log('[SOCKET] socket connected');

    // join random room
    socket.emit('joinRoom', { room: 'random', uid: 'user1' });

    // on joinRoom event
    socket.on('joinedRoom', () => {
      console.log('[SOCKET] join room success');
    });

    // on newUser joinedRoom event
    socket.on('newUser', onNewUserJoinedRoom);
  });

  // Get the local stream and set it as the video source
  localStream = await navigator.mediaDevices.getDisplayMedia();
  localVideo.srcObject = localStream;

  await createOffer();
};

let createOffer = async () => {
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
    }
  };

  console.log('[RTC] offer:', offer);
};

onNewUserJoinedRoom = (user) => {
  console.log(`[SOCKET] new user(${user.sid}) joined room`);
};

init();
