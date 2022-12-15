import React from 'react';
import ReactDOM from 'react-dom/client';
import { AstroWrapper } from "@pingux/astro";
import './index.css';
import SelfieCapture from './SelfieCapture';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <AstroWrapper>
      <SelfieCapture />
    </AstroWrapper>
);
