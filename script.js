// Constants
const CELL_TYPES = {
    EMPTY: 0,
    ISLAND: 1,
    SHIP: 2,
    PORT: 3,
    REEF: 4,
    ROCK: 5
};

const WEATHER_CONFIG = {
    none: { impact: 0, name: "Calm Seas" },
    rain: { impact: 2, name: "Rainy" },
    storm: { impact: 5, name: "Stormy" }
};

const OBSTACLE_MAP = {
    [CELL_TYPES.ISLAND]: { type: "island", cost: 10 },
    [CELL_TYPES.REEF]: { type: "reef", cost: 3 },
    [CELL_TYPES.ROCK]: { type: "rock", cost: 6 }
};

// Priority Queue Implementation
class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    enqueue(element, priority) {
        this.elements.push({ element, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }

    dequeue() {
        return this.elements.shift().element;
    }

    isEmpty() {
        return this.elements.length === 0;
    }

    contains(element, comparator) {
        return this.elements.some(item => comparator(item.element, element));
    }
}

// Main App Class
class PathfindingApp {
    constructor() {
        this.canvas = document.getElementById("gridCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.initProperties();
        this.setupEventListeners();
        this.initGrid();
        this.drawGrid(); // Draw grid immediately after initialization
    }

    initProperties() {
        this.gridSize = Math.min(200, Math.max(40, parseInt(document.getElementById("gridSize").value) || 40));
        this.cellSize = 600 / this.gridSize;
        this.grid = [];
        this.sources = [];
        this.destinations = [];
        this.obstacles = [];
        this.paths = [];
        this.isDarkMode = false;
        this.mode = "source";
        this.weatherEffect = "none";
        this.showReturnPath = false;
        this.returnPath = null;
        this.isReturnPathVisible = false;
        this.returnPathCost = 0;
        this.totalPathCost = 0;
        this.totalCostWithReturn = 0;
        this.allowDiagonal = true;
        this.selectedObstacleType = CELL_TYPES.ISLAND; // Default to island

        this.canvas.width = 600;
        this.canvas.height = 600;
    }

    setupEventListeners() {
        document.getElementById("allowDiagonal").addEventListener("change", (e) => {
            this.allowDiagonal = e.target.checked;
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            const dropdown = document.getElementById("obstacleDropdown");
            const dropdownToggle = document.querySelector(".obstacle-dropdown button");

            if (!event.target.matches('.obstacle-dropdown button') &&
                !event.target.closest('.dropdown-menu') &&
                dropdown && dropdown.classList.contains("show-dropdown")) {
                this.closeObstacleDropdown();
            }
        });
    }

    initGrid() {
        this.grid = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(CELL_TYPES.EMPTY));
        this.sources = [];
        this.destinations = [];
        this.obstacles = [];
        this.paths = [];
        this.returnPath = null;
        this.returnPathCost = 0;
        this.isReturnPathVisible = false;
        this.totalPathCost = 0;
        this.totalCostWithReturn = 0;

        document.getElementById("toggleReturnPath").disabled = true;
        document.getElementById("toggleReturnPath").classList.remove("active");
        this.updateUI();
    }

    setMode(newMode) {
        this.mode = newMode;
        document.querySelectorAll("button").forEach(button => button.classList.remove("active"));
        const button = document.querySelector(`button[onclick*="setMode('${newMode}')"]`);
        if (button) button.classList.add("active");
    }

    setObstacleType(type) {
        switch (type) {
            case 'island':
                this.selectedObstacleType = CELL_TYPES.ISLAND;
                break;
            case 'reef':
                this.selectedObstacleType = CELL_TYPES.REEF;
                break;
            case 'rock':
                this.selectedObstacleType = CELL_TYPES.ROCK;
                break;
            default:
                this.selectedObstacleType = CELL_TYPES.ISLAND;
        }
        this.setMode('obstacle');
        this.closeObstacleDropdown();
    }

    toggleObstacleDropdown() {
        const dropdown = document.getElementById("obstacleDropdown");
        if (dropdown) {
            dropdown.classList.toggle("show-dropdown");
        }
    }

    closeObstacleDropdown() {
        const dropdown = document.getElementById("obstacleDropdown");
        if (dropdown) {
            dropdown.classList.remove("show-dropdown");
        }
    }

    toggleReturnPath() {
        if (this.destinations.length < 2) {
            alert("Need at least 2 destinations to show return path");
            return;
        }

        this.isReturnPathVisible = !this.isReturnPathVisible;
        document.getElementById("toggleReturnPath").classList.toggle("active");

        if (this.isReturnPathVisible && !this.returnPath) {
            const lastPoint = this.destinations[this.destinations.length - 1];
            const firstSource = this.sources[0];
            this.returnPath = this.aStar(lastPoint, firstSource);
            if (this.returnPath) {
                this.returnPathCost = this.calculatePathCost(this.returnPath);
                this.totalCostWithReturn = this.totalPathCost + this.returnPathCost;
            }
        }

        this.drawGrid();
        this.paths.forEach(({ path, index }) => this.animatePath(path, index));

        if (this.isReturnPathVisible && this.returnPath) {
            this.animatePath(this.returnPath, "R");
        }

        this.updateUI();
    }

    drawGrid() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid cells
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const x = col * this.cellSize;
                const y = row * this.cellSize;

                // Draw cell background
                this.ctx.fillStyle = "#e6f7ff"; // Light blue for water
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

                // Draw obstacles
                if (this.grid[row][col] === CELL_TYPES.ISLAND) {
                    this.ctx.fillStyle = "#8B4513"; // Brown for islands
                    this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
                } else if (this.grid[row][col] === CELL_TYPES.REEF) {
                    this.ctx.fillStyle = "#20B2AA"; // Light sea green for reefs
                    this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
                } else if (this.grid[row][col] === CELL_TYPES.ROCK) {
                    this.ctx.fillStyle = "#696969"; // Dim gray for rocks
                    this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
                }
                // Draw sources (ships)
                else if (this.grid[row][col] === CELL_TYPES.SHIP) {
                    this.ctx.fillStyle = "#FF0000"; // Red for ships
                    this.ctx.beginPath();
                    this.ctx.arc(
                        x + this.cellSize / 2,
                        y + this.cellSize / 2,
                        this.cellSize / 3,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                }
                // Draw destinations (ports)
                else if (this.grid[row][col] === CELL_TYPES.PORT) {
                    this.ctx.fillStyle = "#008000"; // Green for ports
                    this.ctx.beginPath();
                    this.ctx.arc(
                        x + this.cellSize / 2,
                        y + this.cellSize / 2,
                        this.cellSize / 3,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                }

                // Draw grid lines
                this.ctx.strokeStyle = "#333";
                this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
            }
        }
    }

    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);

        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) return;

        if (this.mode === "source" && this.grid[row][col] === CELL_TYPES.EMPTY) {
            this.sources.push({ row, col });
            this.grid[row][col] = CELL_TYPES.SHIP;
        }
        else if (this.mode === "destination" && this.grid[row][col] === CELL_TYPES.EMPTY) {
            this.destinations.push({ row, col });
            this.grid[row][col] = CELL_TYPES.PORT;
        }
        else if (this.mode === "obstacle" && this.grid[row][col] === CELL_TYPES.EMPTY) {
            this.grid[row][col] = this.selectedObstacleType;
            this.obstacles.push({ row, col, type: this.selectedObstacleType });
        }
        else if (this.mode === "remove") {
            this.grid[row][col] = CELL_TYPES.EMPTY;
            this.sources = this.sources.filter(s => s.row !== row || s.col !== col);
            this.destinations = this.destinations.filter(d => d.row !== row || d.col !== col);
            this.obstacles = this.obstacles.filter(o => o.row !== row || o.col !== col);
        }

        this.updateUI();
        this.drawGrid();
    }

    findPath() {
        if (this.sources.length === 0 || this.destinations.length === 0) {
            alert("Please set at least one source and one destination.");
            return;
        }

        this.paths = [];
        this.returnPath = null;
        this.returnPathCost = 0;
        this.totalPathCost = 0;
        this.totalCostWithReturn = 0;
        this.isReturnPathVisible = false;
        document.getElementById("toggleReturnPath").classList.remove("active");

        let currentSources = [...this.sources];
        let remainingDestinations = [...this.destinations];
        let pathIndex = 1;

        while (currentSources.length > 0 && remainingDestinations.length > 0) {
            let newSources = [];

            for (const source of currentSources) {
                if (remainingDestinations.length === 0) break;

                const closestDestination = this.findClosestDestination(source, remainingDestinations);
                const path = this.aStar(source, closestDestination);

                if (path) {
                    const pathCost = this.calculatePathCost(path);
                    this.paths.push({
                        path,
                        cost: pathCost,
                        index: pathIndex++
                    });
                    this.totalPathCost += pathCost;
                    newSources.push(closestDestination);
                    remainingDestinations = remainingDestinations.filter(d =>
                        d.row !== closestDestination.row || d.col !== closestDestination.col
                    );
                }
            }

            currentSources = newSources;
        }

        document.getElementById("toggleReturnPath").disabled = this.destinations.length <= 1;
        this.updateUI();
        this.paths.forEach(({ path, index }) => this.animatePath(path, index));
    }

    findClosestDestination(source, destinationsList) {
        return destinationsList.reduce((closest, dest) =>
            !closest || this.heuristic(source, dest) < this.heuristic(source, closest) ? dest : closest, null);
    }

    aStar(start, end) {
        if (!end) return null;

        const openSet = new PriorityQueue();
        openSet.enqueue(start, 0);

        const cameFrom = {};
        const gScore = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(Infinity));
        const fScore = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(Infinity));

        gScore[start.row][start.col] = 0;
        fScore[start.row][start.col] = this.heuristic(start, end);

        while (!openSet.isEmpty()) {
            const current = openSet.dequeue();

            if (current.row === end.row && current.col === end.col) {
                return this.reconstructPath(cameFrom, current);
            }

            // Define possible movements (4 or 8 directions)
            const directions = [
                [1, 0], [-1, 0], [0, 1], [0, -1] // Cardinal directions
            ];

            // Add diagonal directions if allowed
            if (this.allowDiagonal) {
                directions.push(
                    [-1, -1], [-1, 1], [1, 1], [1, -1] // Diagonal directions
                );
            }

            for (const [dx, dy] of directions) {
                const neighbor = {
                    row: current.row + dy,
                    col: current.col + dx
                };

                if (neighbor.row < 0 || neighbor.row >= this.gridSize ||
                    neighbor.col < 0 || neighbor.col >= this.gridSize ||
                    (this.grid[neighbor.row][neighbor.col] !== CELL_TYPES.EMPTY &&
                        this.grid[neighbor.row][neighbor.col] !== CELL_TYPES.PORT &&
                        this.grid[neighbor.row][neighbor.col] !== CELL_TYPES.SHIP)) {
                    continue;
                }

                // Diagonal movement cost is sqrt(2) ≈ 1.4
                const movementCost = (dx !== 0 && dy !== 0) ? 1.4 : 1;
                const tempG = gScore[current.row][current.col] +
                    this.getMovementCost(neighbor) * movementCost;

                if (tempG < gScore[neighbor.row][neighbor.col]) {
                    cameFrom[`${neighbor.row},${neighbor.col}`] = current;
                    gScore[neighbor.row][neighbor.col] = tempG;
                    fScore[neighbor.row][neighbor.col] = tempG + this.heuristic(neighbor, end);

                    if (!openSet.contains(neighbor, (a, b) => a.row === b.row && a.col === b.col)) {
                        openSet.enqueue(neighbor, fScore[neighbor.row][neighbor.col]);
                    }
                }
            }
        }
        return null;
    }

    getMovementCost(cell) {
        if (this.grid[cell.row][cell.col] === CELL_TYPES.EMPTY ||
            this.grid[cell.row][cell.col] === CELL_TYPES.SHIP ||
            this.grid[cell.row][cell.col] === CELL_TYPES.PORT) {
            return 1;
        }

        const baseCost = OBSTACLE_MAP[this.grid[cell.row][cell.col]]?.cost || 1;
        const weatherImpact = WEATHER_CONFIG[this.weatherEffect].impact;
        return baseCost + weatherImpact;
    }

    reconstructPath(cameFrom, current) {
        const path = [];
        while (cameFrom[`${current.row},${current.col}`]) {
            path.push(current);
            current = cameFrom[`${current.row},${current.col}`];
        }
        return path.reverse();
    }

    calculatePathCost(path) {
        return path.reduce((sum, cell) => sum + this.getMovementCost(cell), 0);
    }

    animatePath(path, pathIndex) {
        path.forEach(({ row, col }, index) => {
            setTimeout(() => {
                if (this.grid[row][col] !== CELL_TYPES.SHIP && this.grid[row][col] !== CELL_TYPES.PORT) {
                    this.ctx.fillStyle = pathIndex === "R" ? "purple" : "blue";
                    this.ctx.fillRect(col * this.cellSize, row * this.cellSize, this.cellSize, this.cellSize);
                    this.ctx.strokeStyle = "#333";
                    this.ctx.strokeRect(col * this.cellSize, row * this.cellSize, this.cellSize, this.cellSize);

                    if (this.paths.length > 1 || pathIndex === "R") {
                        this.ctx.fillStyle = "white";
                        this.ctx.font = `${Math.max(10, this.cellSize / 2)}px Arial`;
                        this.ctx.textAlign = "center";
                        this.ctx.textBaseline = "middle";
                        this.ctx.fillText(
                            pathIndex,
                            col * this.cellSize + this.cellSize / 2,
                            row * this.cellSize + this.cellSize / 2
                        );
                    }
                }
            }, 50 * index);
        });
    }

    heuristic(a, b) {
        // Euclidean distance
        return Math.sqrt(Math.pow(a.row - b.row, 2) + Math.pow(a.col - b.col, 2));
    }

    clearGrid() {
        this.initGrid();
        this.drawGrid();
    }

    updateUI() {
        document.getElementById("sourceCount").textContent = this.sources.length;
        document.getElementById("destinationCount").textContent = this.destinations.length;
        document.getElementById("obstacleCount").textContent = this.obstacles.length;
        document.getElementById("pathCount").textContent = this.paths.length;

        let pathCostHTML = this.paths.map(({ cost, index }) =>
            `Path ${index}: Cost = ${cost.toFixed(2)}`).join("<br>");

        pathCostHTML += (pathCostHTML ? "<br><br>" : "") +
            `<strong>Total Path Cost: ${this.totalPathCost.toFixed(2)}</strong>`;

        if (this.isReturnPathVisible && this.returnPath) {
            pathCostHTML += `<br><span style="color: purple; font-weight: bold;">
                            Return Path Cost: ${this.returnPathCost.toFixed(2)}</span>
                            <br><strong>Total Cost (with return): ${this.totalCostWithReturn.toFixed(2)}</strong>`;
        }

        document.getElementById("pathCost").innerHTML = pathCostHTML || "No paths found.";
    }

    generateObstacles() {
        const obstacleCount = Math.floor(this.gridSize * this.gridSize * 0.2);
        this.obstacles = [];

        for (let i = 0; i < obstacleCount; i++) {
            let row, col;
            do {
                row = Math.floor(Math.random() * this.gridSize);
                col = Math.floor(Math.random() * this.gridSize);
            } while (this.grid[row][col] !== CELL_TYPES.EMPTY);

            // Randomly select obstacle type
            const obstacleTypes = [CELL_TYPES.ISLAND, CELL_TYPES.REEF, CELL_TYPES.ROCK];
            const randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
            this.grid[row][col] = randomType;
            this.obstacles.push({ row, col, type: randomType });
        }

        this.updateUI();
        this.drawGrid();
    }

    replayPaths() {
        this.drawGrid();
        this.paths.forEach(({ path, index }) => this.animatePath(path, index));
        if (this.isReturnPathVisible && this.returnPath) {
            this.animatePath(this.returnPath, "R");
        }
    }

    saveGrid() {
        const data = {
            gridSize: this.gridSize,
            grid: this.grid,
            sources: this.sources,
            destinations: this.destinations,
            obstacles: this.obstacles,
            weatherEffect: this.weatherEffect
        };

        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "gridState.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    loadGrid() {
        document.getElementById("loadInput").click();
    }

    handleLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.gridSize = data.gridSize;
                this.cellSize = 600 / this.gridSize;
                this.grid = data.grid;
                this.sources = data.sources;
                this.destinations = data.destinations;
                this.obstacles = data.obstacles;
                this.weatherEffect = data.weatherEffect || "none";

                document.getElementById("gridSize").value = this.gridSize;
                document.getElementById("weather").value = this.weatherEffect;

                this.updateUI();
                this.drawGrid();
            } catch (error) {
                console.error("Error loading grid:", error);
                alert("Failed to load grid file. Please check the console for details.");
            }
        };
        reader.readAsText(file);
    }

    updateWeather() {
        this.weatherEffect = document.getElementById("weather").value;
        this.updateUI();

        // Recalculate paths if they exist
        if (this.paths.length > 0) {
            this.findPath();
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    const app = new PathfindingApp();

    // Expose functions to global scope for HTML buttons
    window.initGrid = () => {
        const newSize = parseInt(document.getElementById("gridSize").value);
        if (newSize >= 40 && newSize <= 200) {
            app.gridSize = newSize;
            app.cellSize = 600 / app.gridSize;
            app.initGrid();
            app.drawGrid();
        } else {
            alert("Grid size must be between 40 and 200");
        }
    };

    window.setMode = (mode) => app.setMode(mode);
    window.toggleReturnPath = () => app.toggleReturnPath();
    window.findPath = () => app.findPath();
    window.clearGrid = () => app.clearGrid();
    window.generateObstacles = () => app.generateObstacles();
    window.replayPaths = () => app.replayPaths();
    window.saveGrid = () => app.saveGrid();
    window.loadGrid = () => app.loadGrid();
    window.handleLoad = (e) => app.handleLoad(e);
    window.updateWeather = () => app.updateWeather();

    // Obstacle dropdown functions
    window.setObstacleType = (type) => app.setObstacleType(type);
    window.toggleObstacleDropdown = () => app.toggleObstacleDropdown();

    // Handle canvas clicks
    document.getElementById("gridCanvas").addEventListener("click", (e) => app.handleCanvasClick(e));
});
