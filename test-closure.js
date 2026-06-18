/* eslint-disable */
const { useState, useEffect } = require("react");

// Fake react hook environment
function render() {
  let state = "project-1";
  const setState = (val) => { state = val; };
  
  const handleCreateTask = async () => {
    const captured = state;
    setState(null);
    await new Promise(r => setTimeout(r, 100));
    console.log("Captured:", captured); // Will it be project-1?
  };
  
  handleCreateTask();
}

render();
