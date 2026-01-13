import React, { useState, useRef, useEffect } from 'react';
import { FaSquare, FaCircle, FaFont, FaArrowsAlt, FaTrash, FaSearchPlus, FaSearchMinus, FaUndo, FaTimes, FaSave, FaDownload, FaArrowRight, FaImage } from 'react-icons/fa';

export default function CanvasModal({ isOpen, onClose, photos, onSave, canvasState, onStateChange }) {
  const [images, setImages] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [tool, setTool] = useState('select');
  const [drawing, setDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [loadedImageObjects, setLoadedImageObjects] = useState({});

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Preload images when modal opens
  useEffect(() => {
    if (isOpen && photos && photos.length > 0) {
      const imagePromises = [];
      const imageObjs = {};

      photos.forEach((photo, index) => {
        const imageSrc = photo.annotatedImageUrl || photo.mainPhoto;
        const promise = new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            imageObjs[imageSrc] = img;
            resolve();
          };
          img.onerror = reject;
          img.src = imageSrc;
        });
        imagePromises.push(promise);
      });

      Promise.all(imagePromises).then(() => {
        setLoadedImageObjects(imageObjs);

        // Always create images with fresh sources from photos prop
        const freshImages = photos.map((photo, index) => {
          return {
            id: Date.now() + index,
            src: photo.annotatedImageUrl || photo.mainPhoto,
            x: 100 + (index * 80),
            y: 100 + (index * 80),
            width: 300,
            height: 300,
            photoId: photo.id,
            photoNumbering: photo.photoNumbering || (index + 1),
            caption: photo.caption || ""
          };
        });

        // If canvasState exists, restore positions and sizes (but keep fresh sources)
        if (canvasState && canvasState.images && canvasState.images.length > 0) {
          const mergedImages = freshImages.map((freshImg, index) => {
            const savedImg = canvasState.images[index];
            if (savedImg && savedImg.photoId === freshImg.photoId) {
              // Restore position and size, but keep fresh src
              return {
                ...freshImg,
                x: savedImg.x,
                y: savedImg.y,
                width: savedImg.width,
                height: savedImg.height
              };
            }
            return freshImg;
          });
          setImages(mergedImages);
          setShapes(canvasState.shapes || []);
          setLabels(canvasState.labels || []);
        } else {
          setImages(freshImages);
          setShapes([]);
          setLabels([]);
        }
      }).catch(err => {
        console.error("Failed to preload images:", err);
      });
    }
  }, [isOpen, photos, canvasState]);

  useEffect(() => {
    if (onStateChange && images.length > 0) {
      onStateChange({ images, shapes, labels });
    }
  }, [images, shapes, labels]);

  const saveToHistory = () => {
    setHistory(prev => [...prev, {
      images: [...images],
      shapes: [...shapes],
      labels: [...labels]
    }]);
  };

  const undo = () => {
    if (history.length > 0) {
      const last = history[history.length - 1];
      setImages(last.images);
      setShapes(last.shapes);
      setLabels(last.labels);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const handleFileUpload = e => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = event => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const newImg = {
            id: Date.now() + Math.random(),
            src: event.target.result,
            x: 100 + Math.random() * 100,
            y: 100 + Math.random() * 100,
            width: Math.min(img.width / 2, 300),
            height: Math.min(img.height / 2, 300)
          };
          setImages(prev => [...prev, newImg]);
          setLoadedImageObjects(prev => ({
            ...prev,
            [event.target.result]: img
          }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const getCursorStyle = () => {
    if (tool === 'select') return isDragging || isResizing ? 'grabbing' : 'default';
    if (tool === 'rectangle' || tool === 'circle' || tool === 'arrow') return 'crosshair';
    if (tool === 'text') return 'text';
    return 'default';
  };

  const getMousePos = e => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  };

  const handleMouseDown = e => {
    const pos = getMousePos(e);
    setMouseDownPos(pos);

    if (tool === 'select') {
      const resizeHandleSize = 8 / zoom;
      let foundItem = null;
      let foundType = null;

      for (let i = images.length - 1; i >= 0; i--) {
        const img = images[i];
        const handleX = img.x + img.width - resizeHandleSize / 2;
        const handleY = img.y + img.height - resizeHandleSize / 2;
        if (pos.x >= handleX && pos.x <= handleX + resizeHandleSize &&
          pos.y >= handleY && pos.y <= handleY + resizeHandleSize) {
          setIsResizing(true);
          setSelectedItem({ type: 'image', item: img });
          setResizeHandle({ x: img.x, y: img.y });
          return;
        }
        if (pos.x >= img.x && pos.x <= img.x + img.width &&
          pos.y >= img.y && pos.y <= img.y + img.height) {
          foundItem = img;
          foundType = 'image';
          break;
        }
      }

      for (let i = shapes.length - 1; i >= 0; i--) {
        const shape = shapes[i];
        const minX = Math.min(shape.startX, shape.endX);
        const maxX = Math.max(shape.startX, shape.endX);
        const minY = Math.min(shape.startY, shape.endY);
        const maxY = Math.max(shape.startY, shape.endY);
        if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
          foundItem = shape;
          foundType = 'shape';
          break;
        }
      }

      for (let i = labels.length - 1; i >= 0; i--) {
        const label = labels[i];
        const textWidth = label.text.length * 8;
        if (pos.x >= label.x && pos.x <= label.x + textWidth &&
          pos.y >= label.y - 20 && pos.y <= label.y) {
          foundItem = label;
          foundType = 'label';
          break;
        }
      }

      if (foundItem) {
        setSelectedItem({ type: foundType, item: foundItem });
        setIsDragging(true);
        setDragOffset({
          x: pos.x - (foundType === 'image' ? foundItem.x : foundType === 'label' ? foundItem.x : Math.min(foundItem.startX, foundItem.endX)),
          y: pos.y - (foundType === 'image' ? foundItem.y : foundType === 'label' ? foundItem.y : Math.min(foundItem.startY, foundItem.endY))
        });
      } else {
        setSelectedItem(null);
      }
    } else if (tool === 'rectangle' || tool === 'circle' || tool === 'arrow') {
      setDrawing(true);
      setCurrentShape({ type: tool, startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
    } else if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const newLabel = { id: Date.now(), x: pos.x, y: pos.y, text, fontSize: 20 };
        setLabels(prev => [...prev, newLabel]);
        saveToHistory();
      }
    }
  };

  const handleMouseMove = e => {
    const pos = getMousePos(e);

    if (isResizing && selectedItem && selectedItem.type === 'image') {
      const img = selectedItem.item;
      const newWidth = Math.max(50, pos.x - img.x);
      const newHeight = Math.max(50, pos.y - img.y);
      setImages(prev => prev.map(i =>
        i.id === img.id ? { ...i, width: newWidth, height: newHeight } : i
      ));
    } else if (isDragging && selectedItem) {
      if (selectedItem.type === 'image') {
        const newX = pos.x - dragOffset.x;
        const newY = pos.y - dragOffset.y;
        setImages(prev => prev.map(img =>
          img.id === selectedItem.item.id ? { ...img, x: newX, y: newY } : img
        ));
      } else if (selectedItem.type === 'shape') {
        const dx = pos.x - dragOffset.x - Math.min(selectedItem.item.startX, selectedItem.item.endX);
        const dy = pos.y - dragOffset.y - Math.min(selectedItem.item.startY, selectedItem.item.endY);
        setShapes(prev => prev.map(shape =>
          shape.id === selectedItem.item.id
            ? { ...shape, startX: shape.startX + dx, startY: shape.startY + dy, endX: shape.endX + dx, endY: shape.endY + dy }
            : shape
        ));
      } else if (selectedItem.type === 'label') {
        const newX = pos.x - dragOffset.x;
        const newY = pos.y - dragOffset.y;
        setLabels(prev => prev.map(label =>
          label.id === selectedItem.item.id ? { ...label, x: newX, y: newY } : label
        ));
      }
    } else if (drawing && currentShape) {
      setCurrentShape(prev => ({ ...prev, endX: pos.x, endY: pos.y }));
    }
  };

  const handleMouseUp = () => {
    if (drawing && currentShape) {
      const finalShape = { ...currentShape, id: Date.now() };
      setShapes(prev => [...prev, finalShape]);
      setCurrentShape(null);
      setDrawing(false);
      saveToHistory();
    }
    if (isDragging || isResizing) {
      saveToHistory();
    }
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  const deleteSelected = () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'image') {
      setImages(prev => prev.filter(img => img.id !== selectedItem.item.id));
    } else if (selectedItem.type === 'shape') {
      setShapes(prev => prev.filter(shape => shape.id !== selectedItem.item.id));
    } else if (selectedItem.type === 'label') {
      setLabels(prev => prev.filter(label => label.id !== selectedItem.item.id));
    }
    setSelectedItem(null);
    saveToHistory();
  };

  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  useEffect(() => {
    draw();
  }, [images, shapes, labels, currentShape, selectedItem, zoom, loadedImageObjects]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // ✅ Fill with WHITE background instead of transparent
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(zoom, zoom);

    images.forEach(img => {
      const imageObj = loadedImageObjects[img.src];
      if (imageObj && imageObj.complete) {
        ctx.drawImage(imageObj, img.x, img.y, img.width, img.height);

        if (img.photoNumbering) {
          ctx.save();
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(img.x, img.y, 60, 25);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(`#${img.photoNumbering.toFixed(1)}`, img.x + 5, img.y + 18);
          ctx.restore();
        }

        if (selectedItem?.type === 'image' && selectedItem.item.id === img.id) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2 / zoom;
          ctx.strokeRect(img.x, img.y, img.width, img.height);

          const handleSize = 8 / zoom;
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(
            img.x + img.width - handleSize / 2,
            img.y + img.height - handleSize / 2,
            handleSize,
            handleSize
          );
        }
      }
    });

    [...shapes, currentShape].filter(Boolean).forEach(shape => {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3 / zoom;

      if (shape.type === 'rectangle') {
        ctx.strokeRect(
          Math.min(shape.startX, shape.endX),
          Math.min(shape.startY, shape.endY),
          Math.abs(shape.endX - shape.startX),
          Math.abs(shape.endY - shape.startY)
        );
      } else if (shape.type === 'circle') {
        const centerX = (shape.startX + shape.endX) / 2;
        const centerY = (shape.startY + shape.endY) / 2;
        const radius = Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2)) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (shape.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(shape.startX, shape.startY);
        ctx.lineTo(shape.endX, shape.endY);
        ctx.stroke();

        const angle = Math.atan2(shape.endY - shape.startY, shape.endX - shape.startX);
        const headLen = 20 / zoom;
        ctx.beginPath();
        ctx.moveTo(shape.endX, shape.endY);
        ctx.lineTo(shape.endX - headLen * Math.cos(angle - Math.PI / 6), shape.endY - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(shape.endX, shape.endY);
        ctx.lineTo(shape.endX - headLen * Math.cos(angle + Math.PI / 6), shape.endY - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }

      if (selectedItem?.type === 'shape' && selectedItem.item.id === shape.id) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(
          Math.min(shape.startX, shape.endX) - 5 / zoom,
          Math.min(shape.startY, shape.endY) - 5 / zoom,
          Math.abs(shape.endX - shape.startX) + 10 / zoom,
          Math.abs(shape.endY - shape.startY) + 10 / zoom
        );
      }
    });

    labels.forEach(label => {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${label.fontSize || 20}px Arial`;
      ctx.fillText(label.text, label.x, label.y);

      if (selectedItem?.type === 'label' && selectedItem.item.id === label.id) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1 / zoom;
        const textWidth = ctx.measureText(label.text).width;
        ctx.strokeRect(label.x - 2 / zoom, label.y - label.fontSize - 2 / zoom, textWidth + 4 / zoom, label.fontSize + 4 / zoom);
      }
    });

    ctx.restore();
  };

  // Auto-crop canvas to remove whitespace
  const cropCanvasWhitespace = (sourceCanvas) => {
    const ctx = sourceCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const pixels = imageData.data;

    let minX = sourceCanvas.width;
    let minY = sourceCanvas.height;
    let maxX = 0;
    let maxY = 0;

    // Find the bounds of non-white pixels
    for (let y = 0; y < sourceCanvas.height; y++) {
      for (let x = 0; x < sourceCanvas.width; x++) {
        const i = (y * sourceCanvas.width + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Check if pixel is not pure white
        if (!(r === 255 && g === 255 && b === 255)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Add some padding (20px on each side)
    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(sourceCanvas.width, maxX + padding);
    maxY = Math.min(sourceCanvas.height, maxY + padding);

    const width = maxX - minX;
    const height = maxY - minY;

    // Create new canvas with cropped dimensions
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    const croppedCtx = croppedCanvas.getContext('2d');

    // Fill white background
    croppedCtx.fillStyle = '#ffffff';
    croppedCtx.fillRect(0, 0, width, height);

    // Copy the cropped region
    croppedCtx.drawImage(
      sourceCanvas,
      minX, minY, width, height,
      0, 0, width, height
    );

    return croppedCanvas;
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // ✅ Create new canvas with white background
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const exportCtx = exportCanvas.getContext('2d');

      // Fill white background
      exportCtx.fillStyle = '#ffffff';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Draw original canvas on top
      exportCtx.drawImage(canvas, 0, 0);

      // ✅ Auto-crop to remove whitespace
      const croppedCanvas = cropCanvasWhitespace(exportCanvas);

      // Export cropped canvas
      const dataUrl = croppedCanvas.toDataURL('image/png');
      await onSave({ canvas: dataUrl, images, shapes, labels });
      onClose();
    } catch (error) {
      console.error('Failed to save canvas:', error);
      alert('Failed to save canvas: ' + error.message);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ✅ Create export canvas with white background
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');

    // Fill white background
    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw original canvas
    exportCtx.drawImage(canvas, 0, 0);

    const url = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'canvas_layout.png';
    link.href = url;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col border border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-blue-100">Canvas Layout Editor</h2>
          <div className="flex items-center gap-3">
            <button onClick={handleDownload} className="px-4 py-2 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/50 rounded-lg transition-all text-sm font-semibold flex items-center gap-2">
              <FaDownload />
              Download
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-600/20 text-green-300 hover:bg-green-600 hover:text-white border border-green-500/50 rounded-lg transition-all text-sm font-semibold flex items-center gap-2">
              <FaSave />
              Save Canvas
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white">
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-700 bg-gray-800/50 overflow-x-auto">
          <button
            onClick={() => setTool('select')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${tool === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            <FaArrowsAlt />
            Select/Move
          </button>
          <button
            onClick={() => setTool('rectangle')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${tool === 'rectangle' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            <FaSquare />
            Rectangle
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${tool === 'circle' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            <FaCircle />
            Circle
          </button>
          <button
            onClick={() => setTool('arrow')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${tool === 'arrow' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            <FaArrowRight />
            Arrow
          </button>
          <button
            onClick={() => setTool('text')}
            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${tool === 'text' ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            <FaFont />
            Text
          </button>
          <div className="w-px h-8 bg-gray-700 mx-2"></div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
          >
            <FaImage />
            Upload Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="w-px h-8 bg-gray-700 mx-2"></div>
          <button onClick={deleteSelected} disabled={!selectedItem} className="px-3 py-2 bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white border border-red-500/50 rounded-lg transition-all text-sm font-semibold flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
            <FaTrash />
            Delete
          </button>
          <button onClick={undo} disabled={history.length === 0} className="px-3 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-all text-sm font-semibold flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
            <FaUndo />
            Undo
          </button>
          <div className="w-px h-8 bg-gray-700 mx-2"></div>
          <button onClick={() => setZoom(prev => Math.min(prev + 0.1, 3))} className="px-3 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-all text-sm font-semibold">
            <FaSearchPlus />
          </button>
          <button onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))} className="px-3 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-all text-sm font-semibold">
            <FaSearchMinus />
          </button>
          <span className="text-sm text-gray-400 px-2">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="flex-1 overflow-auto bg-gray-950 p-6">
          <div className="flex items-center justify-center min-h-full">
            <canvas
              ref={canvasRef}
              width={1200}
              height={800}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="border-2 border-gray-700 rounded-lg shadow-2xl bg-white"
              style={{ cursor: getCursorStyle() }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
