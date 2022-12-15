import './SelfieCapture.css';
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { isMobile } from 'react-device-detect';
import useInterval from './useInterval';
import { Button, Box, Text } from '@pingux/astro';
import Loading from './Loading';
import { Point } from 'face-api.js';

const SelfieCapture = () => {
  // useRef gets reference to items in DOM
  const videoRef = useRef();
  const canvasRef = useRef();

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
  }, 500);

  function drawFaceWithLandmark(detectionWithLandmark) {
  
    const resizedDetection = resizeDetection(detectionWithLandmark.detection);
    const resizedWithLandmark = resizeDetection(detectionWithLandmark);
  
    faceapi.draw.drawDetections(canvasRef.current, resizedDetection); // draw box onto the detected face
    faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedWithLandmark);
  }
  
  function resizeDetection(detection) {
    const vw = document.getElementById('selfie-video').offsetWidth;
    const vh = document.getElementById('selfie-video').offsetHeight;
    const resized = faceapi.resizeResults(detection, {
      width: vw, height: vh
    });
    return resized;
  }

  const detectFaces = async () => {
      if (!image) {
        // detectSingleFace(input).withFaceLandmarks().withFaceExpressions().withAgeAndGender().withFaceDescriptor()
        // TinyFaceOptions: inputSize - size at which image is processed, the smaller the faster but less precise in detecting smaller faces, for face tracking via webcam I would recommend using smaller sizes
        // scoreThreshold - minimum confidence threshold, default 0.5
        const allFacesWithlandmark = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
        // console.log('allFacesWithlandmark', allFacesWithlandmark);
        // console.log('Number of faces', allFacesWithlandmark.length);

        const errorConsumer = (error) => {
          console.log('error: ' + error);
          setHint(error);
        };
        
        // canvasRef.current.innerHtml = faceapi.createCanvasFromMedia(videoRef.current);
        const vw = document.getElementById('selfie-video').offsetWidth;
        const vh = document.getElementById('selfie-video').offsetHeight;

        faceapi.matchDimensions(canvasRef.current, {
          width: vw,
          height: vh,
        });

        allFacesWithlandmark.forEach(face => drawFaceWithLandmark(face));
        
        if(allFacesWithlandmark.length === 0) {
          errorConsumer('FACE_NOT_FOUND');
          return;
        }
        if(allFacesWithlandmark.length > 1) {
          console.log('Found multiple faces', allFacesWithlandmark.length);
          errorConsumer("MULTIPLE_FACES");
          return;
        }

        const detectionWithLandmark = allFacesWithlandmark[0];
        // const detectionWithLandmark = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
        const face = detectionWithLandmark?.detection;

        if (face) {
          setHint(face?._score);
          setIsAboveThreshold(face?._score > threshold);
          
          const qualityGood = checkDetectionQuality(detectionWithLandmark, errorConsumer);

          if (face?._score > threshold && qualityGood) {
            const canvas = faceapi.createCanvasFromMedia(videoRef.current); // size of image to show
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(document.getElementById('selfie-video'), 0, 0, canvas.width, canvas.height);
            const faceImage = document.createElement('img');
            faceImage.src = canvas.toDataURL();

            const resized = resizeDetection(face);
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
      // faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
      faceapi.nets.tinyFaceDetector.loadFromUri('./models'), // good for mobile devices
      faceapi.nets.faceLandmark68Net.loadFromUri('./models'), // detect eye/nose/etc
      faceapi.nets.faceLandmark68TinyNet.loadFromUri('./models'),
      // faceapi.nets.faceRecognitionNet.loadFromUri('./models'), // get recognition score
      // faceapi.nets.faceExpressionNet.loadFromUri('./models'), // detect facial expressions
      // faceapi.nets.ageGenderNet.loadFromUri('./models')
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
    var fileInput = document.getElementById('file-input')
      fileInput.addEventListener('change', async () => {
        const [file] = fileInput.files
        if (file) {
          setImage(URL.createObjectURL(file));
          const img = await faceapi.fetchImage(URL.createObjectURL(file))
          const detection = await faceapi.detectSingleFace(img);
          console.log('detection result', detection);
        }
      }, false);
  }, []);

  const retake = () => {
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
        <Box className="selfie-capture-container" onClick={ () => { setImage('test')}}>
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
            <Box mx="auto" mt="md" className="img-container">
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
            <Text variant="sectionTitle" mb="lg" mx="auto">Review</Text>
            <img src={image} alt="face" crossOrigin="anonymous" className="selfie-img" />
            <Box mx="auto" sx={{ width: '80%' }}>
              <Button mt="md" className="themed-button" variant="primary" onClick={retake}>Retake</Button>
              <Button mt="md" className="themed-button" variant="primary">Continue</Button>
              <Button mt="md" className="themed-button" variant="primary" onClick={loadImage}>Load Image</Button>
            </Box>
          </Box> }
        </Box>
        <input id="file-input" type='file' hidden/>
    </>
  );
};

export default SelfieCapture;


function checkDetectionQuality(detectionWithLandmark, errorConsumer) {
  var detectionGood = verifyDetection(detectionWithLandmark.detection, errorConsumer);
  var landmarksGood = verifyLandmarks(detectionWithLandmark.landmarks, detectionWithLandmark.detection.box, errorConsumer);

  return detectionGood && landmarksGood;
}

function verifyDetection(detection, errorCodeConsumer) {
  if(!checkDetectionCentered(detection, errorCodeConsumer)) {
    return false;
  }

  if(!checkDetectionLargeEnough(detection, errorCodeConsumer)) {
    return false;
  }

  return true;
}

function checkDetectionLargeEnough(detection, errorCodeConsumer) {
  const totalHeight = detection.imageHeight;

  const detectionHeightPercent = (detection.box.height / totalHeight);
  // console.log("detectionHeightPercent", detectionHeightPercent);

  // Need to adjust this. The detection box does not include most of my forhead so my head is much larger in the image than the detection box
  if(detectionHeightPercent < 0.3) {
    errorCodeConsumer("TOO_SMALL");
    return false;
  }

  return true;
}

function checkDetectionCentered(detection, errorCodeConsumer) {
  const totalWidth = detection.imageWidth;
  const imageHorizontalCenter = totalWidth / 2;

  const detectionHorizontalCenter = detection.box.left + (detection.box.width / 2);
  const horizontalCenterOffset = Math.abs(imageHorizontalCenter - detectionHorizontalCenter);
  const horizontalCenterOffsetPercentage = (horizontalCenterOffset / totalWidth);

  const totalHeight = detection.imageHeight;
  const imageVerticalCenter = totalWidth / 2;

  const detectionVerticalCenter = detection.box.top + (detection.box.height / 2);
  const verticalCenterOffset = Math.abs(imageVerticalCenter - detectionVerticalCenter);
  const verticalCenterOffsetPercentage = (verticalCenterOffset / totalHeight);

  if(horizontalCenterOffsetPercentage > 0.2) {
    errorCodeConsumer("NOT_CENTERED_HORIZONTAL");
    return false;
  }

  if(verticalCenterOffsetPercentage > 0.2) {
    errorCodeConsumer("NOT_CENTERED_VERTICAL");
    return false;
  }

  return true;
}

function verifyLandmarks(landmarks, box, errorCodeConsumer) {

  const containsLeftEye = boxContainsPoints(box, landmarks.getLeftEye());
  const containsRightEye = boxContainsPoints(box, landmarks.getRightEye());
  const containsNose = boxContainsPoints(box, landmarks.getNose());
  const containsMouth = boxContainsPoints(box, landmarks.getMouth());

  const containsAll = containsLeftEye && containsRightEye && containsNose && containsMouth;
  if(!containsAll) {
    errorCodeConsumer('LANDMARK_OUTSIDE_DETECTION');
    return false;
  }

  if(!checkFaceTilt(landmarks, errorCodeConsumer)) {
    return false;
  }

  return true;
}

function checkFaceTilt(landmarks, errorCodeConsumer) {
  
  const leftEyeCenter = calculateCenterPoint(landmarks.getLeftEye());
  const rightEyeCenter = calculateCenterPoint(landmarks.getRightEye());

  // angle in degrees
  var eyeAngleDeg = Math.atan2(rightEyeCenter.y - leftEyeCenter.y, rightEyeCenter.x - leftEyeCenter.x) * 180 / Math.PI;
  // console.log("eyeAngleDeg", eyeAngleDeg);

  const angleDegAbs = Math.abs(eyeAngleDeg);

  if(angleDegAbs > 10) {
    errorCodeConsumer('HEAD_TILTED');
    return false;
  }

  return true;
}

// function boxContainsBox(largerBox, smallerBox) {
//   return largerBox.left <= smallerBox.left && largerBox.right <= smallerBox.right && largerBox.top <= smallerBox.top && largerBox.bottom >= smallerBox.bottom;
// }

function boxContainsPoints(box, points) {
  return points.every((point) => boxContainsPoint(box, point));
}

function calculateCenterPoint(points) {
  var totalX = 0;
  var totalY = 0;

  for(var i = 0; i < points.length; i++) {
    totalX += points[i].x;
    totalY += points[i].y;
  }

  const avgX = totalX / points.length;
  const avgY = totalY / points.length;

  return new Point(avgX, avgY);
}

function boxContainsPoint(box, point) {
  return box.left <= point.x && point.x <= box.right && box.top <= point.y && point.y <= box.bottom;
}