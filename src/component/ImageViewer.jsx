import { useEffect, useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import detectionResults from "../assets/output.json";
import wsimage from "../assets/wsi.png";
import {
  ChevronDown,
  Fullscreen,
  MoveLeft,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

const bloodAnalysisData = [
  {
    data: [
      ["rbc", "Count", "Percentage"],
      ["Angled Cell", 222, "67%"],
      ["Borderline Ovalacytes", 50, "20%"],
      ["Burr Cell", 87, "34%"],
      ["Fragmented Cell", 2, "0.12%"],
    ],
  },
  {
    data: [
      ["wbc", "Count", "Percentage"],
      ["Basophill", 222, "67%"],
      ["Easiophill", 50, "20%"],
      ["Lymphocyte", 87, "34%"],
      ["Monocyte", 2, "0.12%"],
    ],
  },
  {
    data: [
      ["Platelets", " "],
      ["Percentage", "222"],
      ["count", "222"],
    ],
  },
];

export default function ImageViewer() {
  const [image] = useState(wsimage);
  const [isExpanded, setIsExpanded] = useState(true);
  const canvasRef = useRef(null);
  const hubCanvasRef = useRef(null);
  const zoomAreaRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const hubImageRef = useRef(null);
  const transformRef = useRef(null);
  const zoomStateRef = useRef({
    positionX: 0,
    positionY: 0,
    scale: 1,
  });

  const patientId = detectionResults.patient_id;
  const sampleType = detectionResults.sample_type;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = image;

    img.onload = () => {
      requestAnimationFrame(() => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        drawBoundingBoxes(ctx);
        hubImageRef.current = img;
        drawHubView();
      });
    };
    return () => {
      img.onload = null;
    };
  }, [image]);

  const drawBoundingBoxes = (ctx) => {
    if (!detectionResults || !detectionResults.inference_results) {
      console.warn("No inference results available.");
      return;
    }

    let parsedResults;
    try {
      const formattedJson = detectionResults.inference_results
        .replace(/'/g, '"')
        .replace(/\bNone\b/g, "null");
      parsedResults = JSON.parse(formattedJson);
    } catch (error) {
      console.error("Error parsing inference_results JSON:", error);
      return;
    }

    if (
      !parsedResults.output ||
      !Array.isArray(parsedResults.output.detection_results)
    ) {
      console.warn("No valid detection results found.");
      return;
    }

    parsedResults.output.detection_results.forEach(([x1, y1, x2, y2]) => {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    });
  };

  const drawHubView = () => {
    const hubCanvas = hubCanvasRef.current;
    if (!hubCanvas || !hubImageRef.current) return;
    const hubCtx = hubCanvas.getContext("2d");
    hubCanvas.width = 200;
    hubCanvas.height =
      200 * (hubImageRef.current.height / hubImageRef.current.width);
    hubCtx.clearRect(0, 0, hubCanvas.width, hubCanvas.height);
    hubCtx.drawImage(
      hubImageRef.current,
      0,
      0,
      hubCanvas.width,
      hubCanvas.height
    );
    updateZoomPointer();
  };


  const updateZoomPointer = () => {
    const hubCanvas = hubCanvasRef.current;
    if (!hubCanvas || !hubImageRef.current) return;
  
    const hubCtx = hubCanvas.getContext("2d");
    const { positionX, positionY, scale } = zoomStateRef.current;
  
    hubCtx.clearRect(0, 0, hubCanvas.width, hubCanvas.height);
    hubCtx.drawImage(hubImageRef.current, 0, 0, hubCanvas.width, hubCanvas.height);
  
    const imgWidth = canvasRef.current.width;
    const imgHeight = canvasRef.current.height;
    const hubWidth = hubCanvas.width;
    const hubHeight = hubCanvas.height;
  
    const zoomArea = {
      x: -positionX / scale,
      y: -positionY / scale,
      width: imgWidth / scale,
      height: imgHeight / scale,
    };
  
    hubCtx.strokeStyle = "blue";
    hubCtx.lineWidth = 1;
    hubCtx.strokeRect(
      (zoomArea.x / imgWidth) * hubWidth,
      (zoomArea.y / imgHeight) * hubHeight,
      (zoomArea.width / imgWidth) * hubWidth,
      (zoomArea.height / imgHeight) * hubHeight
    );
  };
  
  const handleZoom = () => {
    if (!transformRef.current) return;
    const state = transformRef.current.instance.transformState;
  
    zoomStateRef.current = {
      positionX: state.positionX,
      positionY: state.positionY,
      scale: state.scale,
    };
  
    requestAnimationFrame(() => {
      updateZoomPointer();
    });
  };
  


  return (
    <div className="flex flex-col items-center relative w-full h-screen overflow-hidden bg-gray-100">
      <div className="w-full bg-white p-5 shadow-lg flex items-center justify-center gap-4 relative">
        <button className="group absolute top-4 left-6 px-4 py-2 bg-gray-800 text-white rounded-lg ">
          <MoveLeft
            size={24}
            className="translate-x-0 group-hover:-translate-x-1 transition-transform duration-300 ease-in-out"
          />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          Whole Slide Image Viewer
        </h2>
      </div>
      <div className="flex items-center justify-center gap-4 relative w-full h-full border-2 overflow-hidden">
        <TransformWrapper
          ref={transformRef}
          onZoomStop={handleZoom}
          onPanningStop={handleZoom}
          onTransformed={handleZoom}
          options={{
            limitToBounds: false,
            minScale: 0.5,
            maxScale: 5,
            smooth: 0.1,
            animationTime: 100,
          }}
          className="w-full h-full border-2 overflow-visible"
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <TransformComponent
                wrapperStyle={{ overflow: "visible" }}
                contentStyle={{ overflow: "visible" }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-auto h-auto border border-gray-300 shadow-lg"
                  style={{ overflow: "visible" }}
                />
              </TransformComponent>
              <div className="border-2 border-gray-300 p-3 flex flex-col items-center absolute top-0 right-0 bg-white shadow-lg z-50 w-56 m-2 rounded-lg">
                {/* <h3 className="text-md font-medium mb-2">Hub View</h3> */}
                <canvas
                  ref={hubCanvasRef}
                  className="border border-gray-400 mb-2 rounded"
                />
                <div>Patient id: {patientId}</div>
                <div>Sample type: {sampleType}</div>
                <div className="flex flex-col gap-5 absolute -bottom-56 right-0  px-2 py-4 rounded-lg">
                  <button
                    className="inline-flex items-center justify-center h-[50px] w-[50px] text-gray-800 bg-white rounded-full border-2 border-gray-300"
                    onClick={() => {
                      zoomIn();
                    }}
                  >
                    <ZoomIn size={24} />
                  </button>
                  <button
                    className="inline-flex items-center justify-center h-[50px] w-[50px] text-gray-800 bg-white rounded-full border-2 border-gray-300"
                    onClick={() => {
                      zoomOut();
                    }}
                  >
                    <ZoomOut size={24} />
                  </button>
                  <button
                    className="inline-flex items-center justify-center h-[50px] w-[50px] text-gray-800 bg-white rounded-full border-2 border-gray-300"
                    onClick={() => {
                      resetTransform();
                      zoomAreaRef.current = {
                        x: 0,
                        y: 0,
                        width: canvasRef.current?.width || 200,
                        height: canvasRef.current?.height || 200,
                      };
                      drawHubView();
                    }}
                  >
                    <Fullscreen size={24} />
                  </button>
                </div>
              </div>
            </>
          )}
        </TransformWrapper>
        <div
          className={`absolute top-0 left-0 mt-4 ml-4 w-96 bg-white  border-2 border-gray-300 mb-2 rounded-lg shadow-lg transition-all duration-300  ${
            isExpanded ? "max-h-[600px]" : "max-h-[61px]"
          }`}
        >
          <h3 className="text-lg font-semibold py-4 text-center ">
            Blood Analysis Data
          </h3>
          <div
            className={`grid grid-cols-1 ${
              isExpanded ? "max-h-[600px]" : "max-h-[0]"
            } overflow-hidden transition-all duration-300 ease-in-out`}
          >
            {bloodAnalysisData.map((table, index) => (
              <div key={index} className=" rounded">
                {/* {console.log(table.data)} */}
                <table className="w-full border">
                  <thead>
                    <tr className="bg-gray-200">
                      {table.data[0].map((col, i) => (
                        <th key={i} className="border p-1">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.data.slice(1).map((row, i) => (
                      <tr key={i} className="text-center ">
                        {row.map((cell, j) => (
                          <td key={j} className="border p-1">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <div className="absolute -bottom-5 left-0 w-full flex justify-center">
            <div className="relative">
              {/* Outer border effect */}
              <div className="absolute z-10 left-[29px] top-[12px] w-[25px] h-[25px] bg-transparent rounded-full shadow-[-13px_-15px_0px_0px_white]"></div>
              <div className="absolute z-10 -left-[23px] top-[12px] w-[25px] h-[25px] bg-transparent rounded-full shadow-[13px_-15px_0px_0px_white]"></div>
              <button
                className="relative w-[30px] h-[30px] rounded-full  bg-white text-gray-800 transition-all duration-300 inline-flex items-center justify-center shadow-lg"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <ChevronDown
                  size={24}
                  className={`transition-transform duration-300 z-20 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <button className="absolute bottom-6 right-6 px-4 py-2 bg-gray-800 text-white rounded-lg transition-all duration-300 ease-in-out animate-shake">
        Report
      </button>
    </div>
  );
}
