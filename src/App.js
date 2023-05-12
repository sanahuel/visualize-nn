import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import * as tf from "@tensorflow/tfjs";
import "./App.css";

function App() {
  const array28 = new Array(28 * 28).fill(25 / 250);
  const array14 = new Array(14 * 14).fill(25 / 250);
  const array10 = new Array(10).fill(25 / 250);
  const [hidden, setHidden] = useState([
    [array28],
    [array28],
    [array14],
    [array10],
  ]);
  const [input, setInput] = useState(array28);

  // ---------- THREE js ---------- //

  const CameraControls = () => {
    const { camera } = useThree();
    camera.position.set(-55, 25, 50);

    return null;
  };

  let Box = ({ position, color }) => {
    const clampedColor = Math.round(Math.min(Math.max(color * 255, 25), 255));
    return (
      <mesh position={position}>
        <boxBufferGeometry attach={"geometry"} />
        <meshLambertMaterial
          attach={"material"}
          color={
            "rgb(" +
            clampedColor +
            ", " +
            clampedColor +
            ", " +
            clampedColor +
            ")"
          }
        />
      </mesh>
    );
  };

  let Line = ({ start, end }) => {
    const ref = useRef();
    useLayoutEffect(() => {
      ref.current.geometry.setFromPoints(
        [start, end].map((point) => new THREE.Vector3(...point))
      );
    }, [start, end]);
    return (
      <line ref={ref}>
        <bufferGeometry />
        <lineBasicMaterial color={"#191919"} />
      </line>
    );
  };

  function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

  let LineLayers = () => {
    const lines = [];

    // 1st layer
    for (let i = 0; i < 28; i++) {
      for (let j = 0; j < 28; j++) {
        lines.push(
          Line({
            start: [(i - 14) * 1.5, (j - 14) * 1.5, -5],
            end: [
              (getRandomInt(28) - 14) * 1.5,
              (getRandomInt(28) - 14) * 1.5,
              15,
            ],
          })
        );
      }
    }

    // 2nd layer
    for (let i = 0; i < 28; i++) {
      for (let j = 0; j < 28; j++) {
        lines.push(
          Line({
            start: [(i - 14) * 1.5, (j - 14) * 1.5, 15],
            end: [
              (6 + getRandomInt(14) - 14) * 1.5,
              (6 + getRandomInt(14) - 14) * 1.5,
              35,
            ],
          })
        );
      }
    }

    //3rd layer
    for (let i = 0; i < 14; i++) {
      for (let j = 0; j < 14; j++) {
        lines.push(
          Line({
            start: [(6 + i - 14) * 1.5, (6 + j - 14) * 1.5, 35],
            end: [(8 + getRandomInt(10) - 14) * 1.5, (13 - 14) * 1.5, 50],
          })
        );
      }
    }

    return lines;
  };

  let Layer28 = ({ z }) => {
    const boxes = [];
    let k = 0;
    for (let i = 0; i < 28; i++) {
      for (let j = 0; j < 28; j++) {
        boxes.push(
          Box({
            position: [(i - 14) * 1.5, (j - 14) * 1.5, z],
            color: hidden[1][0][k],
          })
        );
        k++;
      }
    }
    return boxes;
  };

  let Layer14 = ({ z }) => {
    const boxes = [];
    let k = 0;
    for (let i = 0; i < 14; i++) {
      for (let j = 0; j < 14; j++) {
        boxes.push(
          Box({
            position: [(6 + i - 14) * 1.5, (6 + j - 14) * 1.5, z],
            color: hidden[2][0][k],
          })
        );
        k++;
      }
    }
    return boxes;
  };

  let Layer10 = ({ z }) => {
    const boxes = [];
    let k = 0;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 1; j++) {
        boxes.push(
          Box({
            position: [(8 + i - 14) * 1.5, (13 + j - 14) * 1.5, z],
            color: hidden[3][0][k],
          })
        );
        k++;
      }
    }
    return boxes;
  };

  let InputLayer = () => {
    const boxes = [];
    let k = 0;
    for (let i = 28; i > 0; i--) {
      for (let j = 0; j < 28; j++) {
        boxes.push(
          Box({
            position: [(j - 14) * 1.5, (i - 14) * 1.5, -35],
            color: input[k],
          })
        );
        k++;
      }
    }
    return boxes;
  };
  // ---------- TF js ---------- //

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    function handleKeyDown(event) {
      if (event.keyCode === 27) {
        // Clear the canvas to black
        context.fillStyle = "black";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const [modelLoaded, setModelLoaded] = useState(false);
  const [model, setModel] = useState(null);

  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load the model
  useEffect(() => {
    async function loadModel() {
      const model = await tf.loadLayersModel(
        "https://sanahuel.github.io/visualize-nn/tfjs_model/model.json"
      );
      setModel(model);
      setModelLoaded(true);
      console.log("Model Loaded:", model.layers);
    }
    loadModel();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 200;
    canvas.height = 200;

    const context = canvas.getContext("2d");
    context.lineCap = "round";
    context.strokeStyle = "white";
    context.lineWidth = 15;
    contextRef.current = context;
  }, []);

  // Compute the outputs of each layer for the given input tensor
  async function computeLayerOutputs(input, model) {
    const outputs = [];
    let currentOutput = input;
    for (let i = 1; i < model.layers.length; i++) {
      currentOutput = model.layers[i].apply(currentOutput);
      outputs.push(currentOutput.arraySync());
    }
    setHidden(outputs);
    return outputs;
  }

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.imageSmoothingEnabled = true;
    contextRef.current.moveTo(offsetX, offsetY);
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    setIsDrawing(true);
    nativeEvent.preventDefault();
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    nativeEvent.preventDefault();
  };

  const stopDrawing = ({ nativeEvent }) => {
    if (!isDrawing) return;
    contextRef.current.closePath();
    setIsDrawing(false);

    // Get the canvas pixel data
    const imageData = contextRef.current.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    const pixels = imageData.data;

    // Determine the scale factor
    const scaleFactor =
      canvasRef.current.width > 28 ? 28 / canvasRef.current.width : 1;

    // Convert the pixel data into a matrix
    const matrix = [];
    for (let y = 0; y < 28; y++) {
      const row = [];
      for (let x = 0; x < 28; x++) {
        const sx = Math.floor(x / scaleFactor);
        const sy = Math.floor(y / scaleFactor);
        const index = (sy * canvasRef.current.width + sx) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const gray = (r + g + b) / 3;
        const normalized = gray / 255;
        row.push(normalized);
      }
      matrix.push(row);
    }

    // Flatten the matrix into a 1D array
    const flattened = matrix.flat();

    // Convert the flattened array to float32
    const floatArray = new Float32Array(flattened);

    // Reshape the floatArray into a 2D array with shape (1, 784)
    const inp = tf.tensor(Array.from(floatArray), [1, 784]);

    setInput(floatArray);

    if (modelLoaded) {
      // Compute outputs of each layer for the input tensor
      computeLayerOutputs(inp, model);
    } else {
      console.log("Model not loaded yet");
    }
  };

  return (
    <div className="App">
      <Canvas style={{ width: "80vw", height: "100vh" }}>
        <CameraControls />
        <OrbitControls />
        <ambientLight intensity={0.5} />
        <spotLight position={[200, 250, 200]} angle={0.2} intensity={1.5} />
        <InputLayer />
        <Layer28 z={-5} />
        <Layer28 z={15} />
        <Layer14 z={35} />
        <Layer10 z={50} />
        {/* <LineLayers /> */}
      </Canvas>
      <div className="canvas-div">
        <canvas
          className="drawing-canvas"
          width={28}
          height={28}
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          willReadFrequently={true}
        />
        <span>Esc to clear</span>
      </div>
    </div>
  );
}

export default App;
