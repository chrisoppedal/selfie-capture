import './SelfieCapture.css';
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import Loading from './Loading';

const SelfieCapture = () => {
  // useRef gets reference to items in DOM
  const videoRef = useRef();
  const canvasRef = useRef();

  // useState used for objects that should cause re-render on updates
  const [isAboveThreshold, setIsAboveThreshold] = useState(false);
  const [loaded, setisLoaded] = useState(false);
  const [image, setImage] = useState('');

  const startVideo = () => {
    navigator.mediaDevices?.getUserMedia({ video: true })
      .then((currentStream) => {
        videoRef.current.srcObject = currentStream;
      }).catch((err) => {
        console.error(err);
      });
  };

  async function extractFaceFromBox(imageRef, box) {
    const regionsToExtract = [
      new faceapi.Rect(box.x, box.y, box.width, box.height),
    ];
    console.log('regionsToExtract', regionsToExtract);
    const faceImages = await faceapi.extractFaces(imageRef, regionsToExtract);
    console.log('faceImages', faceImages);

    if (faceImages.length === 0) {
      console.log('No face found');
    } else {
      faceImages.forEach((cnv) => {
        setImage(cnv.toDataURL());
        console.log('image', cnv.toDataURL());
      });
    }
  }

  const detectFaces = async () => {
    // https://www.npmjs.com/package/face-api.js
    // await faceapi.detectSingleFace(input).withFaceLandmarks().withFaceExpressions().withAgeAndGender().withFaceDescriptor()
    // /Users/christopheroppedal/Repos/verify-webapp/ui-bundle/public/mitekSDK/images/ghost_selfie.gif
    setInterval(async () => {
      const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions());
      canvasRef.current.innerHtml = faceapi.createCanvasFromMedia(videoRef.current);
      // const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      // const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      const vw = document.getElementById('selfie-video').offsetWidth;
      const vh = document.getElementById('selfie-video').offsetHeight;

      faceapi.matchDimensions(canvasRef.current, {
        width: vw,
        height: vh,
      });
      if (detections) {
        console.log('detectFaces detection score', detections?._score);
        setIsAboveThreshold(detections?._score > 0.80);
        const resized = faceapi.resizeResults(detections, {
          width: vw,
          height: vh,
        });
        faceapi.draw.drawDetections(canvasRef.current, resized); // draw box onto the detected face

        if (detections?._score > 0.9 && image === '') {
          const canvas = document.createElement('canvas');
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(document.getElementById('selfie-video'), 0, 0, canvas.width, canvas.height);
          const faceImage = document.createElement('img');
          faceImage.src = canvas.toDataURL();
          extractFaceFromBox(faceImage, detections?.box);
        }
      } else {
        setIsAboveThreshold(false);
      }
    }, 500);
  };
  const loadModels = () => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
      // faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
      // faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
      // faceapi.nets.faceExpressionNet.loadFromUri('./models'),
    ]).then((promise) => {
      detectFaces();
      document.getElementById('selfie-video').addEventListener('loadeddata', () => {
        setTimeout(() => {
          setisLoaded(true);
        }, 150);
      });
    });
  };

  // function called on init
  useEffect(() => {
    startVideo();
    // eslint-disable-next-line no-unused-expressions
    videoRef && loadModels();
  }, []);

  return (
    <>
      {!loaded && (
        <Loading />
      )}

      <div className="selfie-capture">
        <div className="selfie-capture-container">
          {!image && <video crossOrigin="anonymous" id="selfie-video" ref={videoRef} playsInline autoPlay muted preload="metadata" /> }
          {image && <img src={image} alt="face" crossOrigin="anonymous" /> }
          {!image && (
          <canvas
            ref={canvasRef}
            className="selfie_canvas"
          />
          )}
          {!image && loaded && isAboveThreshold && <img src="images/ghost_selfie_portrait_green.gif" alt="green-oval" className="selfie-oval" />}
          {!image && loaded && !isAboveThreshold && <img src="images/ghost_selfie_portrait.gif" alt="capture-oval" className="selfie-oval" /> }
        </div>
      </div>
    </>
  );
};

export default SelfieCapture;