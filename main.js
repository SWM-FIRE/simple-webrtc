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

    // listeb to answer-made event
    socket.on('answer-made', onAnswerMade);

    // listen to ice-candidate event
    // which is ice-candidate of other user
    socket.on('ice-candidate', onIceCandidateRecieved);
  });

  // Get the local stream and set it as the video source
  localStream = await navigator.mediaDevices.getDisplayMedia();
  localVideo.srcObject = localStream;
};

// create peer connection
// used both for offer and answer
let createPeerConnection = async (sid) => {
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
};

let createOffer = async (sid) => {
  await createPeerConnection(sid);

  // create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer); // triggers ice gathering

  // send offer to new user
  console.log(`[SOCKET] call user(${sid}) with offer`);
  socket.emit('call-user', { to: sid, offer });
};

// create answer to offer
let createAnswer = async (sid, offer) => {
  await createPeerConnection(sid);

  await peerConnection.setRemoteDescription(offer);

  // create answer
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer); // peer 2 case

  // send answer to other user
  console.log(`[SOCKET] answer to user(${sid})`);
  socket.emit('make-answer', { to: sid, answer });
};

let onNewUserJoinedRoom = async (user) => {
  console.log(`[SOCKET:on"newUser"] new user(${user.sid}) joined room`);
  await createOffer(user.sid);
};

// handle offer from new user
let onCallMade = (data) => {
  console.log(`[SOCKET:on"call-made"] received offer from other user(${data.socket})`);
  // create answer and send it to other user
  createAnswer(data.socket, data.offer);
};

// handle answer made from other user
let onAnswerMade = (data) => {
  console.log(`[SOCKET:on"answer-made"] received answer from other user(${data.socket})`);
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(data.answer);
  }
};

// handle ice-candidate from other user
let onIceCandidateRecieved = (data) => {
  console.log(
    `[SOCKET:on"ice-candidate"] received ice-candidate from other user(${data.sid}), candidate: ${data.candidate}`
  );

  // add ice candidate to peer connection
  if (peerConnection) peerConnection.addIceCandidate(data.candidate);
};

init();
