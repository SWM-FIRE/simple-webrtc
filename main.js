let localStream;
let remoteStream;

let init = async () => {
  // get dom elements
  const localVideo = document.getElementById('local-video');
  const remoteVideo = document.getElementById('remote-video');

  // Get the local stream and set it as the video source
  localStream = await navigator.mediaDevices.getDisplayMedia();
  localVideo.srcObject = localStream;
};

init();
