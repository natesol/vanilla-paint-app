/* ------------------------------------------------------------------------------------------------ */
/* ------------------------------------------------------------------------------------------------ */

(() => {

/* ------------------------------------------------------------------------------------------------ */
/* --- Globals ------------------------------------------------------------------------------------ */

// Canvas element globals.
const canvas = {
    height: 700, // default
    width: 600, // default
    scale: 2,
    element: null,
    ctx: null,
}

// App state globals.
const state = {
    savedImage: [], // Stores previously drawn image data to restore after new drawings are added.
    text: false,
    shiftDown: false,
    mouseDown: false,
    mouseDownLocation: {x: 0, y: 0},
    tool: 'brush',
    strokeColor: 'black',
    fillColor: 'black',
    lineWidth: +document.getElementById('stroke-width').value * 2,
    polygonSides: +document.getElementById('polygon-sides').value,
    fontSize: +document.getElementById('font-size').value,
    boundingRubberBand: {
        top: 0,
        left: 0,
        width: 0,
        height: 0
    },
}


/* ------------------------------------------------------------------------------------------------ */
/* --- Main --------------------------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // Init canvas & context API.
    canvas.element = document.getElementById('canvas');
    canvas.ctx = canvas.element.getContext('2d');
    
    // Canvas base config.
    const canvasStyles = getComputedStyle(canvas.element);
    canvas.height = parseFloat(canvasStyles.height) * canvas.scale;
    canvas.width = parseFloat(canvasStyles.width) * canvas.scale;
    canvas.element.height = canvas.height;
    canvas.element.width = canvas.width;
    canvas.element.scale = 1 / canvas.scale;
    canvas.ctx.lineCap = 'round';

    // Prepare base canvas state.
    clearCanvas();
    saveCanvasImage();
    
    // Init event listeners.
    initEvents();
});


/* ------------------------------------------------------------------------------------------------ */
/* --- Events ------------------------------------------------------------------------------------- */

// 
const initEvents = () => {
    // canvas events.
    canvas.element.onmousedown = canvasMouseDownHandler;
    canvas.element.onmousemove = canvasMouseMoveHandler;
    canvas.element.onmouseup = canvasMouseUpHandler;
    canvas.element.ontouchstart = canvasMouseDownHandler;
    canvas.element.ontouchmove = canvasMouseMoveHandler;
    canvas.element.ontouchend = canvasMouseUpHandler;

    // header toolbar btns events.
    document.getElementById('stroke-width').onchange = changeStrokeWidth;
    document.getElementById('polygon-sides').onchange = changePolygonSides;
    document.getElementById('color-picker').onchange = changeColor;
    document.getElementById('font-size').onchange = changeFontSize;
    // header toolbar tools events.
    document.querySelectorAll('.draw-tool').forEach(tool => tool.onclick = switchTool);
    document.getElementById('text-input').onblur = drawText;
    
    // footer toolbar btns events.
    document.getElementById('undo').onclick = undo;
    document.getElementById('open').onchange = openImage;
    document.getElementById('clear').onclick = clearCanvas;
    document.getElementById('download').onclick = downloadImage;
}

// Change the canvas stroke width.
const changeStrokeWidth = (e) => {
    state.lineWidth = e.target.value * 2;
}
// Change the polygon tool number of vertices.
const changePolygonSides = (e) => {
    state.polygonSides = e.target.value;
}
// Change the drawing color.
const changeColor = (e) => {
    state.strokeColor = e.target.value;
    state.fillColor = e.target.value;
}
// Change the text tool font size.
const changeFontSize = (e) => {
    state.fontSize = e.target.value;
}
// Switch to the selected tool.
const switchTool = (e) => {
    e.preventDefault();

    // Get the clicked tool element.
    let target = e.target;
    while (!target.classList.contains('tool')) target = target.parentNode;
    
    // Get the toolbar element.
    let toolbar = e.target.parentNode;
    while (!toolbar.classList.contains('toolbar')) toolbar = toolbar.parentNode;

    toolbar.querySelector('.selected').classList.remove('selected');
    target.classList.add('selected');
    state.tool = target.id;
}

// Undo the last drawing (get the canvas image 1 state back).
const undo = () => {
    if (state.savedImage.length > 1) state.savedImage.pop();
    redrawCanvasImage();
}
// Upload an image file to the canvas.
const openImage = () => {
    const file = document.getElementById("upload-img").files[0];
    
    const img = new Image();
    img.src = (window.URL || window.webkitURL).createObjectURL(file);
    
    // Once the image is loaded clear the canvas and draw the new image.
    img.onload = () => {
        saveCanvasImage();
        
        canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.ctx.drawImage(img, 0, 0);
        
        saveCanvasImage();
    }
}
// Clear the canvas.
const clearCanvas = () => {
    canvas.ctx.fillStyle = getComputedStyle(document.querySelector(':root')).getPropertyValue("--canvas-bg-c").trim();
    canvas.ctx.fillRect(0, 0, canvas.width, canvas.height);
}
// Download the current drawing.
const downloadImage = (e) => {
    const format = (num) => num.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false});

    e.preventDefault();

    // Get the download btn element.
    const downloadBtn = document.getElementById('download-init');
    
    // Set the download image name with the current time.
    const now = new Date();
    downloadBtn.setAttribute('download', `Drawing ${now.getFullYear()}-${now.getMonth()}-${now.getDay()} ${format(now.getHours())}${format(now.getMinutes())}${format(now.getSeconds())}.png`);
    // Set the current canvas as the image download target.
    downloadBtn.setAttribute('href', canvas.element.toDataURL());

    downloadBtn.click();
}

// Canvas mouse/touch events.
const canvasMouseDownHandler = (e) => {
    //
    canvas.element.style.cursor = "crosshair";

    // Update mouse state & location.
    state.mouseDown = true;
    const currentMouseLocation = getMousePosition(e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY);
    state.mouseDownLocation = currentMouseLocation;

    if (state.tool === 'brush') {
        drawBrush(currentMouseLocation);
    }
    else if (state.tool === 'text') {
        // ...
    }
    else {
        // Update the shape and redraw it.
        updateBoundingRubberBand(currentMouseLocation);
        drawBoundedShape(currentMouseLocation);
    }
}
const canvasMouseMoveHandler = (e) => {
    if (!state.mouseDown) return;

    //
    canvas.element.style.cursor = "crosshair";
    
    const currentMouseLocation = getMousePosition(e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY);

    if (state.tool === 'brush') {
        drawBrush(currentMouseLocation);
    }
    else if (state.tool === 'text') {
        // ...
    }
    else {
        redrawCanvasImage();
        updateBoundingRubberBand(currentMouseLocation);
        drawBoundedShape(currentMouseLocation);
    }
}
const canvasMouseUpHandler = (e) => {
    // Save the current canvas image data.
    saveCanvasImage();

    // 
    canvas.element.style.cursor = "default";

    if (state.tool !== 'brush' && state.tool !== 'text') {
        const currentMouseLocation = getMousePosition(e.clientX || e.changedTouches[0].clientX, e.clientY || e.changedTouches[0].clientY);
        redrawCanvasImage();
        drawBoundedShape(currentMouseLocation);
    }
    else if (state.tool === 'text') {
        if (state.text) drawText();
        else startInputText(e.clientX || e.changedTouches[0].clientX, e.clientY || e.changedTouches[0].clientY);
    }
    canvas.ctx.beginPath();
    
    state.mouseDown = false;
}


/* ------------------------------------------------------------------------------------------------ */
/* --- Drawing Functionality ---------------------------------------------------------------------- */

const drawBrush = ({x, y}) => {
    canvas.ctx.lineWidth = state.lineWidth;
    canvas.ctx.strokeStyle = state.strokeColor;

    canvas.ctx.lineTo(x, y);
    canvas.ctx.stroke();
    canvas.ctx.beginPath();
    canvas.ctx.moveTo(x, y);
}
const drawLine = ({x, y}) => {
    canvas.ctx.beginPath();
    canvas.ctx.moveTo(state.mouseDownLocation.x, state.mouseDownLocation.y);
    canvas.ctx.lineTo(x, y);
    canvas.ctx.stroke();
}
const drawRectangle = ({x, y}) => {
    canvas.ctx.strokeRect(state.boundingRubberBand.left, state.boundingRubberBand.top, state.boundingRubberBand.width, state.boundingRubberBand.height);
}
const drawCircle = ({x, y}) => {
    const center = {
        x: state.mouseDownLocation.x + ((x - state.mouseDownLocation.x) / 2),
        y: state.mouseDownLocation.y + ((y - state.mouseDownLocation.y) / 2),
    }
    const radius = Math.hypot(state.mouseDownLocation.x - x, state.mouseDownLocation.y - y) / 2;

    canvas.ctx.beginPath();
    canvas.ctx.arc(center.x, center.y, radius, 0, 2*Math.PI);
    canvas.ctx.stroke();
}
const drawEllipse = ({x, y}) => {
    const MAG = 0.71; // - ???

    const center = {
        x: state.mouseDownLocation.x + ((x - state.mouseDownLocation.x) / 2),
        y: state.mouseDownLocation.y + ((y - state.mouseDownLocation.y) / 2),
    }
    const radius = {
        x: state.boundingRubberBand.width * MAG,
        y: state.boundingRubberBand.height * MAG,
    }
    const rotation = degreesToRadians(getAngle(state.mouseDownLocation, {x, y}));

    canvas.ctx.beginPath();
    canvas.ctx.ellipse(center.x, center.y, radius.x, radius.y, rotation, 0, 2*Math.PI);
    canvas.ctx.stroke();
}
const drawPolygon = (currentMouseLocation) => {
    const polygonPoints = getPolygonPoints(currentMouseLocation);
    canvas.ctx.beginPath();
    canvas.ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);

    for (let i = 1; i < state.polygonSides; i++) {
        canvas.ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
    }
    canvas.ctx.lineTo(polygonPoints[0].x, polygonPoints[0].y);
    canvas.ctx.stroke();
    canvas.ctx.closePath();
}
const drawText = () => {
    const input = document.getElementById('text-input');
    const inputStyles = getComputedStyle(input);
    const {x, y} = getMousePosition(parseFloat(inputStyles.left), parseFloat(inputStyles.top));
    
    canvas.ctx.font = `normal ${state.fontSize * canvas.scale}px xyz, 'Poppins', Arial, sans-serif`;
    canvas.ctx.fillStyle = state.fillColor;
    canvas.ctx.strokeStyle = state.strokeColor;
    canvas.ctx.textAlign = 'start';
    canvas.ctx.textBaseline = 'middle';
    canvas.ctx.direction = 'inherit';
    
    canvas.ctx.fillText(input.value, x, y);
    endInputText(input);
    saveCanvasImage();
}

const updateBoundingRubberBand = (currentMouseLocation) => {
    state.boundingRubberBand.width = Math.abs(currentMouseLocation.x - state.mouseDownLocation.x);
    state.boundingRubberBand.height = Math.abs(currentMouseLocation.y - state.mouseDownLocation.y);
    
    state.boundingRubberBand.left = (currentMouseLocation.x > state.mouseDownLocation.x) ? state.mouseDownLocation.x : currentMouseLocation.x;
    state.boundingRubberBand.top = (currentMouseLocation.y > state.mouseDownLocation.y) ? state.mouseDownLocation.y : currentMouseLocation.y;
}
const drawBoundedShape = (currentMouseLocation) => {
    canvas.ctx.lineWidth = state.lineWidth;
    canvas.ctx.strokeStyle = state.strokeColor;
    canvas.ctx.fillStyle = state.fillColor;

    switch (state.tool) {
        case "line": drawLine(currentMouseLocation);
            break;

        case "rectangle": drawRectangle(currentMouseLocation);
            break;

        case "circle": drawCircle(currentMouseLocation);
            break;

        case "ellipse": drawEllipse(currentMouseLocation);
            break;

        case "polygon": drawPolygon(currentMouseLocation);
            break;
        
        default:
            break;
    }
}

const startInputText = (x, y) => {
    const input = document.getElementById('text-input');

    input.style.display = 'block';
    input.style.width = `${canvas.element.getBoundingClientRect().right - x}px`;
    input.style.top = `${y}px`;
    input.style.left = `${x}px`;
    input.focus();
    input.style.font = `normal ${state.fontSize}px xyz, 'Poppins', Arial, sans-serif`;
    input.style.color = state.fillColor;

    state.text = true;
}
const endInputText = (input) => {
    state.text = false;
    input.value = '';
    input.style.display = 'none';
}


/* ------------------------------------------------------------------------------------------------ */
/* --- Utilities ---------------------------------------------------------------------------------- */

// Get the angle (in radians) between 2 points.
const getAngle = (a, b) => {
    const adjacent = a.x - b.x;
    const opposite = a.y - b.y;

    return radiansToDegrees(Math.atan2(opposite, adjacent));
}
// Calculate every vertex point of the bounded polygon.
const getPolygonPoints = (currentMouseLocation) => {
    const MAG = 0.71; // - ???
    // 
    const polygonPoints = [];
    // (x,y) point that represent the radius of the bounding ellipse (equal to the (x,y) of the bounding rubber-band box).
    const radius = {
        x: state.boundingRubberBand.width * MAG,
        y: state.boundingRubberBand.height * MAG,
    }
    // 
    const center = {
        x: state.mouseDownLocation.x + ((currentMouseLocation.x - state.mouseDownLocation.x) / 2),
        y: state.mouseDownLocation.y + ((currentMouseLocation.y - state.mouseDownLocation.y) / 2),
    }
    // Get the current angle (in radians) based on the (x,y) of the mouse.
    // let angle = degreesToRadians(getAngle(state.mouseDownLocation, currentMouseLocation));
    let angle = 0;

    // Each point in the polygon is found by breaking the parts of the polygon into triangles
    for (let i = 0; i < state.polygonSides; i++) {
        polygonPoints.push({
            x: center.x + radius.x * Math.sin(angle),
            y: center.y - radius.y * Math.cos(angle)
        });
        
        angle += (2 * Math.PI) / state.polygonSides;
    }
    return polygonPoints;
}

// Converts radians to degrees.
const radiansToDegrees = (radians) => {
    // Correct bottom error by adding the negative angle to 360, to get the correct result around a whole circle.
    return (radians < 0 ? 360 : 0) + (radians * (180 / Math.PI));
}
// Converts degrees to radians.
const degreesToRadians = (degrees) => {
    return degrees * (Math.PI / 180);
}

// Returns mouse (x,y) position based on canvas position in page.
const getMousePosition = (x, y) => {
    const canvasRect = canvas.element.getBoundingClientRect();
    return {
        x: (x - canvasRect.left) * (canvas.width  / canvasRect.width),
        y: (y - canvasRect.top)  * (canvas.height / canvasRect.height)
    };
}

// Save the current image.
const saveCanvasImage = () => {
    state.savedImage.push(canvas.ctx.getImageData(0, 0, canvas.width, canvas.height));
}
// Restore the last saved image.
const redrawCanvasImage = () => {
    canvas.ctx.putImageData(state.savedImage.at(-1), 0, 0);
}



})()

/* ------------------------------------------------------------------------------------------------ */
/* ------------------------------------------------------------------------------------------------ */