Face API JS: https://justadudewhohacks.github.io/face-api.js/docs/index.html

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### `environment setup`
1) install node and npm:

https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
 -- created with node 14.0.0 and npm 6.14.4

2) `npm install`

3) `npm start` to run app in development mode

4) Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### Deploy production build

1) Pushing to master will automatically deploy to: selfie-capture.netlify.app
- Pushing to the 'test' branch will automatically deploy to: selfie-capture-test.netlify.app/

2) Optionally run `npm run build` and manually deploy the output of the `build` directory

### Notes
- Put assets in the /public directory (https://create-react-app.dev/docs/using-the-public-folder/)
- Changes go in SelfieCapture.js and SelfieCapture.css
- VS Code (https://code.visualstudio.com/download) is the recommended IDE for React development although any IDE should work
- To debug javascript right click page and select 'Inspect'. Inside the 'console' tab you'll see error and javascript logs (console.log('test log', objectToLog);)

### Goals
- Fix Mitek failure errors (face angle too large/ face too close to edge)
- Improve UX
- Prevent captures when eyes are closed
- Prevent capturing selfies too soon (before looking at camera)
- Improve hints