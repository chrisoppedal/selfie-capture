import './SelfieCapture.css';
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import Loading from './Loading';
import { Box, Point } from 'face-api.js';

const SelfieCapture = () => {
  // useRef gets reference to items in DOM
  const videoRef = useRef();
  const canvasRef = useRef();

  // useState used for objects that should cause re-render on updates
  const [isAboveThreshold, setIsAboveThreshold] = useState(false);
  const [loaded, setisLoaded] = useState(false);
  const [image, setImage] = useState('');

  const startVideo = () => {
    console.log('startVideo()');
    navigator.mediaDevices?.getUserMedia({ video: true })
      .then((currentStream) => {
        videoRef.current.srcObject = currentStream;
      }).catch((err) => {
        console.error(err);
      });
  };

  async function extractFaceFromBox(imageRef, box) {
    console.log('extractFaceFromBox', box);
    const regionsToExtract = [
      new faceapi.Rect(box.x, box.y, box.width, box.height),
    ];
    const faceImages = await faceapi.extractFaces(imageRef, regionsToExtract);

    if (faceImages.length === 0) {
      console.log('No face found');
    } else {
      console.log('Found faces: ', faceImages.length);
      faceImages.forEach((cnv) => {
        setImage(cnv.toDataURL());
      });
      console.log('image', image);
    }
  }



  // function called on init
  useEffect(() => {
    console.log('useEffect!!!!!!!!!!!!!');
    startVideo();
    // eslint-disable-next-line no-unused-expressions
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri('./models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
      faceapi.nets.faceExpressionNet.loadFromUri('./models'),
      faceapi.nets.ageGenderNet.loadFromUri('./models')
    ]).then(() => {
      // https://www.npmjs.com/package/face-api.js
    // await faceapi.detectSingleFace(input).withFaceLandmarks().withFaceExpressions().withAgeAndGender().withFaceDescriptor()
    // /Users/christopheroppedal/Repos/verify-webapp/ui-bundle/public/mitekSDK/images/ghost_selfie.gif
    setInterval(async () => {
      const detectionWithLandmark = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
      // console.log('detectionWithLandmark', detectionWithLandmark);
      const detection = detectionWithLandmark?.detection;

      canvasRef.current.innerHtml = faceapi.createCanvasFromMedia(videoRef.current);
      // const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      // const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      const vw = document.getElementById('selfie-video').offsetWidth;
      const vh = document.getElementById('selfie-video').offsetHeight;

      faceapi.matchDimensions(canvasRef.current, {
        width: vw,
        height: vh,
      });

      if (detection) {
        // console.log('detectFaces detection score', detection?.score);
        setIsAboveThreshold(detection?.score > 0.80);
        const resizedDetection = faceapi.resizeResults(detection, {
          width: vw,
          height: vh,
        });

        const resizedWithLandmark = faceapi.resizeResults(detectionWithLandmark, {
          width: vw,
          height: vh,
        });

        faceapi.draw.drawDetections(canvasRef.current, resizedDetection); // draw box onto the detected face
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedWithLandmark);

        const errorConsumer = (error) => console.log('error: ' + error);
        verifyDetection(detection, errorConsumer);
        verifyLandmarks(detectionWithLandmark.landmarks, detection.box, errorConsumer);

        // if (detection?.score > 0.9 && image === '') {

        //   const canvas = document.createElement('canvas');
        //   canvas.width = window.innerWidth;
        //   canvas.height = window.innerHeight;
        //   const ctx = canvas.getContext('2d');
        //   ctx.drawImage(document.getElementById('selfie-video'), 0, 0, canvas.width, canvas.height);
        //   const faceImage = document.createElement('img');
        //   faceImage.src = canvas.toDataURL();
        //   extractFaceFromBox(faceImage, resizedDetection?.box);
        // }
      } else {
        setIsAboveThreshold(false);
      }
    }, 500);

      document.getElementById('selfie-video').addEventListener('loadeddata', () => {
        setTimeout(() => {
          setisLoaded(true);
        }, 150);
      });
    });
     // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const totalWidth = detection.imageWidth;
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

function boxContainsBox(largerBox, smallerBox) {
  return largerBox.left <= smallerBox.left && largerBox.right <= smallerBox.right && largerBox.top <= smallerBox.top && largerBox.bottom >= smallerBox.bottom;
}

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