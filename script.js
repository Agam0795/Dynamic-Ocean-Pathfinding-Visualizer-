const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");

let gridSize = 20;
let cellSize = 600 / gridSize;
let grid = [];
let sources = [];
let destinations = [];
let obstacles = [];
let lastPath = [];
let mode = "source";
let weatherEffect = "none";

canvas.width = 600;
canvas.height = 600;

function initGrid() {
    gridSize = parseInt(document.getElementById("gridSize").value) || 20;
    cellSize = 600 / gridSize;
    grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
    sources = [];
    destinations = [];
    obstacles = [];
    lastPath = [];
    drawGrid();
}

function setMode(newMode) {
    mode = newMode;
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            ctx.fillStyle = grid[row][col] === 1 ? "black" : grid[row][col] === 2 ? "green" : grid[row][col] === 3 ? "red" : "white";
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
    }
}

canvas.addEventListener("click", (event) => {
    let col = Math.floor(event.offsetX / cellSize);
    let row = Math.floor(event.offsetY / cellSize);

    if (mode === "source" && grid[row][col] === 0) {
        sources.push({ row, col });
        grid[row][col] = 2;
    } else if (mode === "destination" && grid[row][col] === 0) {
        destinations.push({ row, col });
        grid[row][col] = 3;
    } else if (mode === "obstacle" && grid[row][col] === 0) {
        obstacles.push({ row, col });
        grid[row][col] = 1;
    } else if (mode === "remove") {
        grid[row][col] = 0;
    }

    drawGrid();
});

function generateObstacles() {
    let count = Math.floor(gridSize * gridSize * 0.2);
    obstacles = [];

    for (let i = 0; i < count; i++) {
        let row, col;
        do {
            row = Math.floor(Math.random() * gridSize);
            col = Math.floor(Math.random() * gridSize);
        } while (grid[row][col] !== 0);

        grid[row][col] = 1;
        obstacles.push({ row, col });
    }

    drawGrid();
}

function moveObstacles() {
    obstacles.forEach(obstacle => {
        let { row, col } = obstacle;
        grid[row][col] = 0;

        let newRow, newCol;
        do {
            newRow = row + (Math.random() > 0.5 ? 1 : -1);
            newCol = col + (Math.random() > 0.5 ? 1 : -1);
        } while (newRow < 0 || newCol < 0 || newRow >= gridSize || newCol >= gridSize || grid[newRow][newCol] !== 0);

        grid[newRow][newCol] = 1;
        obstacle.row = newRow;
        obstacle.col = newCol;
    });

    drawGrid();
}

// Moves obstacles every 5 seconds
setInterval(moveObstacles, 5000);

function findPath() {
    if (sources.length === 0 || destinations.length === 0) return;

    let start = sources[0];
    let end = destinations[0];

    let queue = [{ row: start.row, col: start.col, path: [] }];
    let visited = new Set();
    let foundPath = null;

    while (queue.length > 0) {
        let { row, col, path } = queue.shift();
        let key = `${row},${col}`;

        if (visited.has(key)) continue;
        visited.add(key);

        if (row === end.row && col === end.col) {
            foundPath = path;
            break;
        }

        let neighbors = [
            { row: row - 1, col }, { row: row + 1, col },
            { row, col: col - 1 }, { row, col: col + 1 }
        ];

        for (let neighbor of neighbors) {
            if (
                neighbor.row >= 0 && neighbor.row < gridSize &&
                neighbor.col >= 0 && neighbor.col < gridSize &&
                grid[neighbor.row][neighbor.col] !== 1
            ) {
                queue.push({ row: neighbor.row, col: neighbor.col, path: [...path, neighbor] });
            }
        }
    }

    if (foundPath) {
        lastPath = foundPath;
        animatePath(foundPath);
    }
}

function animatePath(path) {
    path.forEach(({ row, col }, i) => {
        setTimeout(() => {
            ctx.fillStyle = "blue";
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }, 200 * i);
    });
}

function replayLastPath() {
    if (lastPath.length === 0) return;
    animatePath(lastPath);
}

function clearGrid() {
    initGrid();
}

// Weather system affecting path cost
document.getElementById("weather").addEventListener("change", function () {
    weatherEffect = this.value;
    if (weatherEffect === "rain") {
        console.log("⚠️ Rain detected! Movement slowed.");
    } else if (weatherEffect === "storm") {
        console.log("⚠️ Storm detected! Movement heavily impacted.");
    }
});

// Initialize Grid
initGrid();
