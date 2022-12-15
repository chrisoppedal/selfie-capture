import './SelfieCapture.css';
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { isMobile } from 'react-device-detect';
import useInterval from './useInterval';
import { Button, Box, Text } from '@pingux/astro';
import Loading from './Loading';

const SelfieCapture = () => {
  // useRef gets reference to items in DOM
  const videoRef = useRef();
  const canvasRef = useRef();
  const imageRef = useRef();

  // useState used for objects that should cause re-render on updates
  const [isAboveThreshold, setIsAboveThreshold] = useState(false);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState('');
  const [hint, setHint] = useState('');

  const threshold = 0.9;

  const startVideo = () => {
    navigator.mediaDevices?.getUserMedia({ video: true })
      .then((currentStream) => {
        videoRef.current.srcObject = currentStream;
      }).catch((err) => {
        console.error(err);
      });
  };

  useInterval(() => {
    detectFaces();
  }, 1000);

  const detectFaces = async () => {
      if (!image) {
        // detectSingleFace(input).withFaceLandmarks().withFaceExpressions().withAgeAndGender().withFaceDescriptor()
        // TinyFaceOptions: inputSize - size at which image is processed, the smaller the faster but less precise in detecting smaller faces, for face tracking via webcam I would recommend using smaller sizes
        // scoreThreshold - minimum confidence threshold, default 0.5
        const face = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: threshold }));
        console.log('face 1', face);
        // faceapi.matchDimensions(videoRef.current, {
        //   width: document.getElementById('selfie-video').offsetWidth,
        //   height: document.getElementById('selfie-video').offsetHeight,
        // });
        if (face) {
          setHint(face?._score);
          setIsAboveThreshold(face?._score > threshold);
          const resized = faceapi.resizeResults(face, {
            width: window.innerWidth, height: window.innerHeight
          });
          faceapi.draw.drawDetections(canvasRef.current, resized); // draw box around detected face

          if (face?._score > threshold && image === '') {
            const canvas = faceapi.createCanvasFromMedia(videoRef.current); // size of image to show
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(document.getElementById('selfie-video'), 0, 0, canvas.width, canvas.height);
            const faceImage = document.createElement('img');
            faceImage.src = canvas.toDataURL();
            const regionsToExtract = [
              new faceapi.Rect(resized?.box._x, resized?.box._y, resized?.box._width, resized?.box._height),
            ];
            const faceImages = await faceapi.extractFaces(faceImage, regionsToExtract);
            if (faceImages.length === 0) {
              console.log('No face found');
            } else {
              faceImages.forEach((cnv) => {
                setImage(cnv.toDataURL());
              });
            }
          }
        } else {
          setIsAboveThreshold(false);
        }
      }
  };
  const loadModels = () => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('./models'), // good for mobile devices
      faceapi.nets.faceLandmark68Net.loadFromUri('./models'), // detect eye/nose/etc
      // faceapi.nets.faceRecognitionNet.loadFromUri('./models'), // get recognition score
      // faceapi.nets.faceExpressionNet.loadFromUri('./models'), // detect facial expressions
    ]).then((promise) => {
      document.getElementById('selfie-video').addEventListener('loadeddata', () => {
        setTimeout(() => {
          setLoading(false);
        }, 300);
      });
    });
  };

  // called when app loads
  useEffect(() => {
    startVideo();
    // eslint-disable-next-line no-unused-expressions
    videoRef && loadModels();
  }, []);

  useEffect(() => {
    if (image) {
      var fileInput = document.getElementById('file-input')
      fileInput.addEventListener('change', async () => {
        console.log('file 1', fileInput.files[0]);

        // const canvas = faceapi.createCanvasFromMedia(videoRef.current); // size of image to show
        // canvas.width = window.innerWidth;
        // canvas.height = window.innerHeight;
        // const ctx = canvas.getContext('2d');
        // ctx.drawImage(document.getElementById('selfie-video'), 0, 0, canvas.width, canvas.height);
        // const faceImage = document.createElement('img');
        // faceImage.src = canvas.toDataURL();

        const faceImage = document.createElement('img');
        const [file] = fileInput.files
        if (file) {
          console.log('file 2', file);
          faceImage.src = URL.createObjectURL(file)
        }
        console.log('faceImage', faceImage);

        const face = await faceapi.detectSingleFace(faceImage, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: threshold }));
        console.log('face', face);
      }, false);
    }
  }, [image])

  const retake = () => {
    console.log('retake!!');
    setImage('');
    startVideo();
    setHint('');
  };
  const loadImage = () => {
    document.getElementById('file-input').click();
  };
  const getGradient = (buttonColor, luminosity) => {
    let hex = String(buttonColor).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    // convert to decimal and change luminosity
    let rgb = '#'; let c; let i;
    for (i = 0; i < 3; i += 1) {
      c = parseInt(hex?.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * luminosity)), 255)).toString(16);
      rgb += (`00${c}`).substr(c?.length);
    }
    return rgb;
  };

  return (
    <>
    <style>
      {`
      #selfie-video {
        min-height: ${isMobile ? 'calc(100vh - 56px)' : '100vh'};
        width: ${isMobile ? '100%' : ''};
      }
      .img-container {
        margin: 10% auto 10% auto;
        height: ${isMobile ? '120px' : '140px'}
      }
      img.selfie-oval {
        height: ${isMobile ? '60vh' : '80vh'} !important;
      }
      `}
    </style>
      {loading && (
        <Loading />
      )}
        <div className="selfie-capture-container">
          {!image && <video crossOrigin="anonymous" id="selfie-video" ref={videoRef} playsInline autoPlay muted preload="metadata" /> }
          {!image && !loading && <div id="hint-message" >{hint}</div> }
          {!image && (
          <canvas
            ref={canvasRef}
            className="selfie_canvas"
          />
          )}
          {!image && !loading && isAboveThreshold && <img src="images/ghost_selfie_portrait_green.gif" alt="green-oval" className="selfie-oval" />}
          {!image && !loading && !isAboveThreshold && <img src="images/ghost_selfie_portrait.gif" alt="capture-oval" className="selfie-oval" /> }
          {image && 
          <Box height="100vh">
            <Box mx="auto" className="img-container">
              <svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M133.333 133.333H16.6667V16.6667H133.333V133.333ZM133.333 0H16.6667C12.2464 0 8.00716 1.75595 4.88155 4.88155C1.75595 8.00716 0 12.2464 0 16.6667V133.333C0 137.754 1.75595 141.993 4.88155 145.118C8.00716 148.244 12.2464 150 16.6667 150H133.333C137.754 150 141.993 148.244 145.118 145.118C148.244 141.993 150 137.754 150 133.333V16.6667C150 7.41667 142.5 0 133.333 0ZM112.5 110.417C112.5 97.9167 87.5 91.6667 75 91.6667C62.5 91.6667 37.5 97.9167 37.5 110.417V116.667H112.5V110.417ZM75 77.0833C79.9728 77.0833 84.7419 75.1079 88.2582 71.5916C91.7746 68.0753 93.75 63.3061 93.75 58.3333C93.75 53.3605 91.7746 48.5914 88.2582 45.0751C84.7419 41.5588 79.9728 39.5833 75 39.5833C70.0272 39.5833 65.2581 41.5588 61.7417 45.0751C58.2254 48.5914 56.25 53.3605 56.25 58.3333C56.25 63.3061 58.2254 68.0753 61.7417 71.5916C65.2581 75.1079 70.0272 77.0833 75 77.0833Z" fill="url(#paint0_linear_203_85)" />
                <defs>
                  <linearGradient id="paint0_linear_203_85" x1="75" y1="0" x2="75" y2="150" gradientUnits="userSpaceOnUse">
                    <stop stopColor={getGradient('#4462ED', 0.2)} />
                    <stop offset="1" stopColor={getGradient('#4462ED', -0.2)} />
                  </linearGradient>
                </defs>
              </svg>
            </Box>
            <Text variant="sectionTitle" mb="md" mx="auto">Review Image</Text>
            <img src={image} alt="face" ref={imageRef} crossOrigin="anonymous" className="selfie-img" />
            <Box>
              <Button mt="md" className="themed-button" variant="primary" onClick={retake}>Retake</Button>
              <Button mt="md" className="themed-button" variant="primary">Continue</Button>
              <Button mt="md" className="themed-button" variant="primary" onClick={loadImage}>Load Image</Button>
              <input id="file-input" type='file' hidden/>
            </Box>
          </Box> }
        </div>
    </>
  );
};

export default SelfieCapture;
